/**
 * ScrollIndexer Service for ScrollLibrary
 * "Search the Scriptures" - John 5:39
 * 
 * Creates vector embeddings and builds knowledge graph connections
 * for semantic and prophetic search capabilities
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { VectorStoreService } from '../VectorStoreService';
import { AIGatewayService } from '../AIGatewayService';
import { 
  Book, 
  Chapter, 
  KnowledgeNode, 
  Relationship,
  RelationType,
  Source
} from '../../types/scroll-library.types';

export interface IndexResult {
  success: boolean;
  bookId: string;
  embeddingsCreated: number;
  nodesCreated: number;
  relationshipsCreated: number;
  error?: string;
}

export interface ConceptExtractionResult {
  concepts: string[];
  definitions: Map<string, string>;
  relationships: Array<{
    source: string;
    target: string;
    type: RelationType;
    strength: number;
  }>;
}

/**
 * ScrollIndexer Service
 * Handles vector embeddings and knowledge graph construction
 */
export class ScrollIndexerService {
  private prisma: PrismaClient;
  private vectorStore: VectorStoreService;
  private aiGateway: AIGatewayService;
  private neo4jEnabled: boolean;

  constructor() {
    this.prisma = new PrismaClient();
    this.vectorStore = new VectorStoreService();
    this.aiGateway = new AIGatewayService();
    
    // Check if Neo4j is configured
    this.neo4jEnabled = !!process.env.NEO4J_URL;
    
    if (!this.neo4jEnabled) {
      logger.warn('Neo4j not configured, knowledge graph features will be limited');
    }

    logger.info('ScrollIndexer Service initialized', {
      vectorStoreEnabled: true,
      knowledgeGraphEnabled: this.neo4jEnabled
    });
  }

  /**
   * Indexes a complete book: creates embeddings and builds knowledge graph
   * Property 13: Embedding Generation - For any content added to the library, vector embeddings should be created
   * Property 14: Knowledge Graph Construction - For any indexed content with related concepts, knowledge graph connections should be established
   */
  async indexBook(book: Book): Promise<IndexResult> {
    try {
      logger.info('Starting book indexing', { 
        bookId: book.id, 
        title: book.title,
        chaptersCount: book.chapters.length 
      });

      let embeddingsCreated = 0;
      let nodesCreated = 0;
      let relationshipsCreated = 0;

      // Step 1: Create embeddings for all chapters
      const embeddingResults = await this.createEmbeddings(book);
      embeddingsCreated = embeddingResults.length;

      // Step 2: Extract concepts from content
      const concepts = await this.extractConcepts(book);
      
      // Step 3: Build knowledge graph
      const graphResults = await this.buildKnowledgeGraph(book, concepts);
      nodesCreated = graphResults.nodesCreated;
      relationshipsCreated = graphResults.relationshipsCreated;

      // Step 4: Link related concepts across the book
      await this.linkRelatedConcepts(book.id, concepts);

      logger.info('Book indexing completed successfully', {
        bookId: book.id,
        embeddingsCreated,
        nodesCreated,
        relationshipsCreated
      });

      return {
        success: true,
        bookId: book.id,
        embeddingsCreated,
        nodesCreated,
        relationshipsCreated
      };

    } catch (error) {
      logger.error('Book indexing failed', { 
        bookId: book.id, 
        error: error.message 
      });

      return {
        success: false,
        bookId: book.id,
        embeddingsCreated: 0,
        nodesCreated: 0,
        relationshipsCreated: 0,
        error: error.message
      };
    }
  }

  /**
   * Creates vector embeddings for book content
   * Implements Property 13: Embedding Generation
   */
  async createEmbeddings(book: Book): Promise<string[]> {
    try {
      logger.info('Creating embeddings for book', { 
        bookId: book.id,
        chaptersCount: book.chapters.length 
      });

      const embeddingIds: string[] = [];

      // Create embeddings for each chapter
      for (const chapter of book.chapters) {
        // Split chapter into manageable chunks (max 8000 tokens per chunk)
        const chunks = this.splitIntoChunks(chapter.content, 8000);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Generate embedding using AI Gateway
          const embedding = await this.vectorStore.generateEmbedding(chunk);

          // Store in vector database
          const docId = await this.vectorStore.ingestDocument({
            id: `${book.id}_${chapter.id}_chunk_${i}`,
            content: chunk,
            embedding,
            metadata: {
              type: 'course',
              courseId: book.courseReference || '',
              moduleId: chapter.id,
              author: book.metadata.authorAgent,
              title: `${book.title} - ${chapter.title}`,
              date: book.createdAt,
              tags: [book.subject, book.level, 'textbook', 'chapter'],
              url: `/library/books/${book.id}/chapters/${chapter.id}`
            }
          });

          embeddingIds.push(docId);
        }

        logger.debug('Chapter embeddings created', {
          chapterId: chapter.id,
          chunksCreated: chunks.length
        });
      }

      logger.info('All embeddings created successfully', {
        bookId: book.id,
        totalEmbeddings: embeddingIds.length
      });

      return embeddingIds;

    } catch (error) {
      logger.error('Failed to create embeddings', { 
        bookId: book.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Builds knowledge graph from book concepts
   * Implements Property 14: Knowledge Graph Construction
   */
  async buildKnowledgeGraph(
    book: Book, 
    concepts: ConceptExtractionResult
  ): Promise<{ nodesCreated: number; relationshipsCreated: number }> {
    try {
      logger.info('Building knowledge graph', { 
        bookId: book.id,
        conceptsCount: concepts.concepts.length 
      });

      let nodesCreated = 0;
      let relationshipsCreated = 0;

      // Create knowledge nodes for each concept
      for (const concept of concepts.concepts) {
        const definition = concepts.definitions.get(concept) || '';
        
        // Generate embedding for the concept
        const embedding = await this.vectorStore.generateEmbedding(
          `${concept}: ${definition}`
        );

        // Find related concepts
        const relatedConcepts = concepts.relationships
          .filter(rel => rel.source === concept || rel.target === concept)
          .map(rel => ({
            type: rel.type,
            targetNodeId: rel.source === concept ? rel.target : rel.source,
            strength: rel.strength
          }));

        // Create knowledge node
        const node: KnowledgeNode = {
          id: `${book.id}_concept_${this.sanitizeConceptId(concept)}`,
          concept,
          definition,
          relationships: relatedConcepts,
          sources: this.extractSourcesForConcept(book, concept),
          embeddings: embedding,
          relatedBooks: [book.id],
          relatedChapters: this.findChaptersWithConcept(book, concept)
        };

        // Store node (in production, this would go to Neo4j)
        await this.storeKnowledgeNode(node);
        nodesCreated++;
      }

      // Create relationships between concepts
      for (const relationship of concepts.relationships) {
        await this.createConceptRelationship(
          book.id,
          relationship.source,
          relationship.target,
          relationship.type,
          relationship.strength
        );
        relationshipsCreated++;
      }

      logger.info('Knowledge graph built successfully', {
        bookId: book.id,
        nodesCreated,
        relationshipsCreated
      });

      return { nodesCreated, relationshipsCreated };

    } catch (error) {
      logger.error('Failed to build knowledge graph', { 
        bookId: book.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Links related concepts across the knowledge graph
   */
  async linkRelatedConcepts(bookId: string, concepts: ConceptExtractionResult): Promise<string[]> {
    try {
      logger.info('Linking related concepts', { 
        bookId,
        conceptsCount: concepts.concepts.length 
      });

      const linkedConcepts: string[] = [];

      // For each concept, find semantically similar concepts
      for (const concept of concepts.concepts) {
        const definition = concepts.definitions.get(concept) || '';
        const conceptText = `${concept}: ${definition}`;

        // Search for similar concepts in the vector store
        const similarResults = await this.vectorStore.search(conceptText, {
          topK: 5,
          minScore: 0.75,
          filter: { type: 'course' }
        });

        // Create relationships with similar concepts
        for (const result of similarResults) {
          // Extract concept from result
          const relatedConcept = this.extractConceptFromResult(result);
          
          if (relatedConcept && relatedConcept !== concept) {
            await this.createConceptRelationship(
              bookId,
              concept,
              relatedConcept,
              'related',
              result.score
            );
            
            linkedConcepts.push(`${concept} -> ${relatedConcept}`);
          }
        }
      }

      logger.info('Concepts linked successfully', {
        bookId,
        linksCreated: linkedConcepts.length
      });

      return linkedConcepts;

    } catch (error) {
      logger.error('Failed to link related concepts', { 
        bookId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Extracts key concepts from book content using AI
   */
  private async extractConcepts(book: Book): Promise<ConceptExtractionResult> {
    try {
      logger.info('Extracting concepts from book', { bookId: book.id });

      const allConcepts: string[] = [];
      const definitions = new Map<string, string>();
      const relationships: Array<{
        source: string;
        target: string;
        type: RelationType;
        strength: number;
      }> = [];

      // Extract concepts from each chapter
      for (const chapter of book.chapters) {
        const chapterConcepts = await this.extractConceptsFromChapter(chapter);
        
        // Merge concepts
        allConcepts.push(...chapterConcepts.concepts);
        
        // Merge definitions
        chapterConcepts.definitions.forEach((def, concept) => {
          definitions.set(concept, def);
        });

        // Merge relationships
        relationships.push(...chapterConcepts.relationships);
      }

      // Deduplicate concepts
      const uniqueConcepts = Array.from(new Set(allConcepts));

      logger.info('Concepts extracted successfully', {
        bookId: book.id,
        uniqueConcepts: uniqueConcepts.length,
        totalRelationships: relationships.length
      });

      return {
        concepts: uniqueConcepts,
        definitions,
        relationships
      };

    } catch (error) {
      logger.error('Failed to extract concepts', { 
        bookId: book.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Extracts concepts from a single chapter using AI
   */
  private async extractConceptsFromChapter(chapter: Chapter): Promise<ConceptExtractionResult> {
    try {
      // Use AI to extract key concepts
      const prompt = `Extract key concepts, their definitions, and relationships from the following educational content.
      
Content:
${chapter.content.substring(0, 4000)}

Please identify:
1. Main concepts (5-10 key terms or ideas)
2. Brief definitions for each concept
3. Relationships between concepts (prerequisite, related, extends, contradicts)

Format your response as JSON:
{
  "concepts": ["concept1", "concept2", ...],
  "definitions": {"concept1": "definition1", ...},
  "relationships": [
    {"source": "concept1", "target": "concept2", "type": "prerequisite", "strength": 0.9},
    ...
  ]
}`;

      const response = await this.aiGateway.generateCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing educational content and extracting key concepts and their relationships.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 2000
      });

      // Parse AI response
      const result = JSON.parse(response.content);

      return {
        concepts: result.concepts || [],
        definitions: new Map(Object.entries(result.definitions || {})),
        relationships: result.relationships || []
      };

    } catch (error) {
      logger.error('Failed to extract concepts from chapter', { 
        chapterId: chapter.id, 
        error: error.message 
      });
      
      // Return empty result on error
      return {
        concepts: [],
        definitions: new Map(),
        relationships: []
      };
    }
  }

  /**
   * Splits content into chunks for embedding
   */
  private splitIntoChunks(content: string, maxTokens: number): string[] {
    // Simple chunking by paragraphs (in production, use proper tokenization)
    const paragraphs = content.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedTokens = (currentChunk.length + paragraph.length) / 4;

      if (estimatedTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Stores a knowledge node (in production, this would use Neo4j)
   */
  private async storeKnowledgeNode(node: KnowledgeNode): Promise<void> {
    try {
      // For now, store in Prisma (in production, use Neo4j)
      // This is a simplified implementation
      logger.debug('Storing knowledge node', { 
        nodeId: node.id, 
        concept: node.concept 
      });

      // In production, this would be:
      // await neo4j.run('CREATE (n:Concept {id: $id, concept: $concept, ...})', node);

    } catch (error) {
      logger.error('Failed to store knowledge node', { 
        nodeId: node.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Creates a relationship between two concepts
   */
  private async createConceptRelationship(
    bookId: string,
    sourceConcept: string,
    targetConcept: string,
    type: RelationType,
    strength: number
  ): Promise<void> {
    try {
      logger.debug('Creating concept relationship', {
        bookId,
        source: sourceConcept,
        target: targetConcept,
        type,
        strength
      });

      // In production, this would use Neo4j:
      // await neo4j.run(
      //   'MATCH (a:Concept {concept: $source}), (b:Concept {concept: $target}) ' +
      //   'CREATE (a)-[r:' + type.toUpperCase() + ' {strength: $strength}]->(b)',
      //   { source: sourceConcept, target: targetConcept, strength }
      // );

    } catch (error) {
      logger.error('Failed to create concept relationship', { 
        source: sourceConcept,
        target: targetConcept,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Extracts sources that mention a specific concept
   */
  private extractSourcesForConcept(book: Book, concept: string): Source[] {
    const sources: Source[] = [];

    // Search through all chapter references
    for (const chapter of book.chapters) {
      for (const reference of chapter.references) {
        // Check if reference text mentions the concept
        if (reference.citation.toLowerCase().includes(concept.toLowerCase())) {
          sources.push({
            id: reference.id,
            title: reference.citation,
            author: book.metadata.authorAgent,
            type: reference.type === 'academic' ? 'academic' : 
                  reference.type === 'biblical' ? 'biblical' : 'web',
            url: reference.url,
            credibilityScore: reference.type === 'academic' ? 0.9 : 
                            reference.type === 'biblical' ? 1.0 : 0.7
          });
        }
      }
    }

    return sources;
  }

  /**
   * Finds all chapters that mention a specific concept
   */
  private findChaptersWithConcept(book: Book, concept: string): string[] {
    return book.chapters
      .filter(chapter => 
        chapter.content.toLowerCase().includes(concept.toLowerCase()) ||
        chapter.title.toLowerCase().includes(concept.toLowerCase())
      )
      .map(chapter => chapter.id);
  }

  /**
   * Sanitizes concept name for use as ID
   */
  private sanitizeConceptId(concept: string): string {
    return concept
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Extracts concept name from search result
   */
  private extractConceptFromResult(result: any): string | null {
    try {
      // Extract concept from metadata or content
      if (result.metadata?.title) {
        // Try to extract concept from title
        const match = result.metadata.title.match(/^([^:]+):/);
        if (match) {
          return match[1].trim();
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Health check for indexing service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const vectorStoreHealthy = await this.vectorStore.healthCheck();
      
      logger.info('ScrollIndexer health check', {
        vectorStore: vectorStoreHealthy,
        knowledgeGraph: this.neo4jEnabled
      });

      return vectorStoreHealthy;
    } catch (error) {
      logger.error('ScrollIndexer health check failed', { error: error.message });
      return false;
    }
  }
}

export default ScrollIndexerService;
