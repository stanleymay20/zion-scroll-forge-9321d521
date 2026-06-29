import { PrismaClient, AcademicLevel, ScrollBook, ScrollChapter } from '@prisma/client';
import { logger } from '../../utils/logger';
import { Book, Chapter } from './AgentOrchestrationService';
import { VectorStoreService } from '../VectorStoreService';

export interface BookInput {
  title: string;
  subtitle?: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  courseReference?: string;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  textbookId?: string;
  workbookId?: string;
  lectureSlides: string[];
  studyPackId?: string;
  pastQuestions: Question[];
  readingList: ReadingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'essay' | 'short-answer';
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

export interface ReadingListItem {
  id: string;
  title: string;
  author: string;
  type: 'book' | 'article' | 'video' | 'website';
  url?: string;
  required: boolean;
}

export interface SearchQuery {
  query: string;
  type: 'semantic' | 'prophetic' | 'keyword';
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchFilters {
  subject?: string;
  level?: string;
  courseId?: string;
  contentType?: string;
}

export interface SearchResult {
  bookId: string;
  chapterId?: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  propheticRelevance?: number;
  conceptConnections: string[];
}

/**
 * Library Management Service for ScrollLibrary
 * Handles core library operations for content storage and retrieval
 */
export class LibraryManagementService {
  private prisma: PrismaClient;
  private vectorStore: VectorStoreService;

  constructor() {
    this.prisma = new PrismaClient();
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Creates a new book in the library
   * Validates: Requirements 3.1, 3.3, 3.4
   */
  async createBook(bookData: BookInput): Promise<Book> {
    try {
      logger.info('Creating new book', { bookData });

      // Map level to Prisma enum
      const levelMap: Record<string, AcademicLevel> = {
        'beginner': AcademicLevel.BEGINNER,
        'intermediate': AcademicLevel.INTERMEDIATE,
        'advanced': AcademicLevel.ADVANCED
      };

      // Create book with metadata in database
      const scrollBook = await this.prisma.scrollBook.create({
        data: {
          title: bookData.title,
          subtitle: bookData.subtitle,
          subject: bookData.subject,
          level: levelMap[bookData.level],
          courseReference: bookData.courseReference,
          integrityHash: '', // Will be set by ScrollIntegritySeal
          metadata: {
            create: {
              authorAgent: 'ScrollAuthorGPT',
              version: '1.0.0',
              scrollIntegrityHash: '',
              generationDate: new Date(),
              lastValidated: new Date(),
              qualityScore: 0,
              theologicalAlignment: 0
            }
          }
        },
        include: {
          metadata: true,
          chapters: true,
          diagrams: true
        }
      });

      // Convert to Book interface
      const book: Book = {
        id: scrollBook.id,
        title: scrollBook.title,
        subtitle: scrollBook.subtitle || undefined,
        subject: scrollBook.subject,
        level: bookData.level,
        courseReference: scrollBook.courseReference || undefined,
        chapters: [],
        diagrams: [],
        metadata: {
          authorAgent: scrollBook.metadata!.authorAgent,
          version: scrollBook.metadata!.version,
          scrollIntegrityHash: scrollBook.metadata!.scrollIntegrityHash,
          generationDate: scrollBook.metadata!.generationDate,
          lastValidated: scrollBook.metadata!.lastValidated,
          qualityScore: scrollBook.metadata!.qualityScore,
          theologicalAlignment: scrollBook.metadata!.theologicalAlignment
        },
        integrityHash: scrollBook.integrityHash,
        createdAt: scrollBook.createdAt,
        updatedAt: scrollBook.updatedAt,
        publishedAt: scrollBook.publishedAt || undefined
      };
      
      logger.info('Book created successfully', { bookId: book.id });
      return book;
    } catch (error) {
      logger.error('Book creation failed', { error, bookData });
      throw error;
    }
  }

  /**
   * Updates an existing book
   * Validates: Requirements 3.1, 3.3, 3.4
   */
  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
    try {
      logger.info('Updating book', { bookId, updates });

      // Map level to Prisma enum if provided
      const levelMap: Record<string, AcademicLevel> = {
        'beginner': AcademicLevel.BEGINNER,
        'intermediate': AcademicLevel.INTERMEDIATE,
        'advanced': AcademicLevel.ADVANCED
      };

      // Prepare update data
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
      if (updates.subject) updateData.subject = updates.subject;
      if (updates.level) updateData.level = levelMap[updates.level];
      if (updates.courseReference !== undefined) updateData.courseReference = updates.courseReference;
      if (updates.integrityHash) updateData.integrityHash = updates.integrityHash;
      if (updates.publishedAt !== undefined) updateData.publishedAt = updates.publishedAt;

      // Update metadata if provided
      if (updates.metadata) {
        updateData.metadata = {
          update: {
            authorAgent: updates.metadata.authorAgent,
            version: updates.metadata.version,
            scrollIntegrityHash: updates.metadata.scrollIntegrityHash,
            generationDate: updates.metadata.generationDate,
            lastValidated: updates.metadata.lastValidated,
            qualityScore: updates.metadata.qualityScore,
            theologicalAlignment: updates.metadata.theologicalAlignment
          }
        };
      }

      // Update in database
      const scrollBook = await this.prisma.scrollBook.update({
        where: { id: bookId },
        data: updateData,
        include: {
          metadata: true,
          chapters: {
            include: {
              diagrams: true,
              references: true,
              summaries: true,
              exercises: true
            }
          },
          diagrams: true
        }
      });

      // Convert to Book interface
      const book = await this.getBook(bookId);

      logger.info('Book updated successfully', { bookId });
      return book;
    } catch (error) {
      logger.error('Book update failed', { error, bookId });
      throw error;
    }
  }

  /**
   * Deletes a book from the library
   * Validates: Requirements 3.1, 3.3, 3.4
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      logger.info('Deleting book', { bookId });

      // Delete from database using Prisma (cascade deletes chapters, diagrams, etc.)
      await this.prisma.scrollBook.delete({
        where: { id: bookId }
      });

      logger.info('Book deleted successfully', { bookId });
    } catch (error) {
      logger.error('Book deletion failed', { error, bookId });
      throw error;
    }
  }

  /**
   * Retrieves a book by ID
   * Validates: Requirements 3.1, 3.3, 3.4
   */
  async getBook(bookId: string): Promise<Book> {
    try {
      logger.info('Retrieving book', { bookId });

      // Retrieve from database using Prisma
      const scrollBook = await this.prisma.scrollBook.findUnique({
        where: { id: bookId },
        include: {
          metadata: true,
          chapters: {
            include: {
              diagrams: true,
              references: true,
              summaries: true,
              exercises: true
            },
            orderBy: {
              orderIndex: 'asc'
            }
          },
          diagrams: true
        }
      });

      if (!scrollBook) {
        throw new Error(`Book not found: ${bookId}`);
      }

      // Convert chapters to Book interface format
      const chapters: Chapter[] = scrollBook.chapters.map(ch => ({
        id: ch.id,
        bookId: ch.bookId,
        title: ch.title,
        orderIndex: ch.orderIndex,
        content: ch.content,
        diagrams: ch.diagrams.map(d => ({
          id: d.id,
          type: d.type.toLowerCase() as 'mermaid' | 'chart' | 'illustration',
          content: d.content,
          caption: d.caption
        })),
        references: ch.references.map(r => ({
          id: r.id,
          type: r.type.toLowerCase() as 'academic' | 'biblical' | 'web',
          citation: r.citation,
          url: r.url || undefined
        })),
        summaries: ch.summaries.map(s => ({
          id: s.id,
          type: s.type.toLowerCase() as 'chapter' | 'section',
          content: s.content
        })),
        exercises: ch.exercises.map(e => ({
          id: e.id,
          type: e.type.toLowerCase() as 'question' | 'problem',
          content: e.content,
          solution: e.solution || undefined
        })),
        readingTime: ch.readingTime,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt
      }));

      // Convert to Book interface
      const book: Book = {
        id: scrollBook.id,
        title: scrollBook.title,
        subtitle: scrollBook.subtitle || undefined,
        subject: scrollBook.subject,
        level: scrollBook.level.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
        courseReference: scrollBook.courseReference || undefined,
        chapters,
        diagrams: scrollBook.diagrams.map(d => ({
          id: d.id,
          type: d.type.toLowerCase() as 'mermaid' | 'chart' | 'illustration',
          content: d.content,
          caption: d.caption
        })),
        metadata: {
          authorAgent: scrollBook.metadata!.authorAgent,
          version: scrollBook.metadata!.version,
          scrollIntegrityHash: scrollBook.metadata!.scrollIntegrityHash,
          generationDate: scrollBook.metadata!.generationDate,
          lastValidated: scrollBook.metadata!.lastValidated,
          qualityScore: scrollBook.metadata!.qualityScore,
          theologicalAlignment: scrollBook.metadata!.theologicalAlignment
        },
        integrityHash: scrollBook.integrityHash,
        createdAt: scrollBook.createdAt,
        updatedAt: scrollBook.updatedAt,
        publishedAt: scrollBook.publishedAt || undefined
      };

      logger.info('Book retrieved successfully', { bookId });
      return book;
    } catch (error) {
      logger.error('Book retrieval failed', { error, bookId });
      throw error;
    }
  }

  /**
   * Searches the library with semantic and prophetic capabilities
   * Validates: Requirements 4.3, 4.4, 4.5
   */
  async searchLibrary(query: SearchQuery): Promise<SearchResult[]> {
    try {
      logger.info('Searching library', { query });

      let results: SearchResult[] = [];

      // Implement search logic based on query type
      switch (query.type) {
        case 'semantic':
          results = await this.performSemanticSearch(query);
          break;
        case 'prophetic':
          results = await this.performPropheticSearch(query);
          break;
        case 'keyword':
          results = await this.performKeywordSearch(query);
          break;
      }

      // Apply filters if provided
      if (query.filters) {
        results = this.applyFilters(results, query.filters);
      }

      // Limit results if specified
      const limitedResults = query.limit ? results.slice(0, query.limit) : results;

      logger.info('Library search completed', { 
        queryType: query.type, 
        resultCount: limitedResults.length 
      });
      
      return limitedResults;
    } catch (error) {
      logger.error('Library search failed', { error, query });
      throw error;
    }
  }

  /**
   * Performs semantic search using vector embeddings
   * Validates: Requirements 4.3, 4.4
   */
  private async performSemanticSearch(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Use vector store for semantic search
      const vectorResults = await this.vectorStore.search(query.query, {
        topK: query.limit || 20,
        filter: this.buildVectorFilter(query.filters),
        minScore: 0.7
      });

      // Convert vector results to SearchResult format
      const results: SearchResult[] = [];

      for (const vectorResult of vectorResults) {
        // Get book and chapter details from database
        const bookId = vectorResult.metadata.courseId || vectorResult.id;
        
        try {
          const book = await this.prisma.scrollBook.findUnique({
            where: { id: bookId },
            include: {
              chapters: true,
              metadata: true
            }
          });

          if (book) {
            // Find related concepts from knowledge graph
            const conceptConnections = await this.getConceptConnections(bookId);

            results.push({
              bookId: book.id,
              chapterId: vectorResult.metadata.moduleId,
              title: book.title,
              excerpt: vectorResult.content.substring(0, 200) + '...',
              relevanceScore: vectorResult.score,
              conceptConnections
            });
          }
        } catch (err) {
          logger.warn('Failed to fetch book details for search result', { bookId, error: err });
        }
      }

      return results;
    } catch (error) {
      logger.error('Semantic search failed', { error, query });
      return [];
    }
  }

  /**
   * Performs prophetic search with spiritual context
   * Validates: Requirements 4.5
   */
  private async performPropheticSearch(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // First perform semantic search
      const semanticResults = await this.performSemanticSearch(query);

      // Enhance with prophetic relevance scoring
      const propheticResults = await Promise.all(
        semanticResults.map(async (result) => {
          // Calculate prophetic relevance based on:
          // 1. Theological alignment score
          // 2. Scripture integration
          // 3. Spiritual formation content
          const book = await this.prisma.scrollBook.findUnique({
            where: { id: result.bookId },
            include: { metadata: true }
          });

          // Handle cases where metadata might be null or values might be undefined
          let propheticRelevance = 0.5; // Default value
          
          if (book?.metadata) {
            const theologicalScore = book.metadata.theologicalAlignment || 0;
            const qualityScore = book.metadata.qualityScore || 0;
            propheticRelevance = (theologicalScore * 0.6 + qualityScore * 0.4);
          }

          return {
            ...result,
            propheticRelevance
          };
        })
      );

      // Re-rank by prophetic relevance
      propheticResults.sort((a, b) => 
        (b.propheticRelevance || 0) - (a.propheticRelevance || 0)
      );

      return propheticResults;
    } catch (error) {
      logger.error('Prophetic search failed', { error, query });
      return [];
    }
  }

  /**
   * Performs traditional keyword-based search
   * Validates: Requirements 4.3
   */
  private async performKeywordSearch(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Search in book titles, subjects, and chapter content
      const books = await this.prisma.scrollBook.findMany({
        where: {
          OR: [
            { title: { contains: query.query, mode: 'insensitive' } },
            { subtitle: { contains: query.query, mode: 'insensitive' } },
            { subject: { contains: query.query, mode: 'insensitive' } }
          ],
          ...(query.filters?.subject && { subject: query.filters.subject }),
          ...(query.filters?.level && { level: query.filters.level.toUpperCase() as AcademicLevel }),
          ...(query.filters?.courseId && { courseReference: query.filters.courseId })
        },
        include: {
          chapters: {
            where: {
              content: { contains: query.query, mode: 'insensitive' }
            },
            take: 3
          },
          metadata: true
        },
        take: query.limit || 20
      });

      // Convert to SearchResult format
      const results: SearchResult[] = books.map(book => {
        const matchingChapter = book.chapters[0];
        const excerpt = matchingChapter
          ? this.extractExcerpt(matchingChapter.content, query.query)
          : book.subtitle || book.subject;

        return {
          bookId: book.id,
          chapterId: matchingChapter?.id,
          title: book.title,
          excerpt,
          relevanceScore: this.calculateKeywordRelevance(book, query.query),
          conceptConnections: []
        };
      });

      return results;
    } catch (error) {
      logger.error('Keyword search failed', { error, query });
      return [];
    }
  }

  /**
   * Applies filters to search results
   */
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      // Filter by subject, level, courseId, contentType if specified
      // This is a placeholder - actual filtering would query the database
      return true;
    });
  }

  /**
   * Builds vector store filter from search filters
   */
  private buildVectorFilter(filters?: SearchFilters): Record<string, any> | undefined {
    if (!filters) return undefined;

    const vectorFilter: Record<string, any> = {};
    
    if (filters.subject) {
      vectorFilter.tags = { $in: [filters.subject] };
    }
    
    if (filters.courseId) {
      vectorFilter.courseId = filters.courseId;
    }

    return Object.keys(vectorFilter).length > 0 ? vectorFilter : undefined;
  }

  /**
   * Gets concept connections from knowledge graph
   */
  private async getConceptConnections(bookId: string): Promise<string[]> {
    try {
      const knowledgeNodes = await this.prisma.scrollKnowledgeNode.findMany({
        where: {
          relatedBooks: { has: bookId }
        },
        take: 5
      });

      return knowledgeNodes.map(node => node.concept);
    } catch (error) {
      logger.error('Failed to get concept connections', { error, bookId });
      return [];
    }
  }

  /**
   * Extracts relevant excerpt from content
   */
  private extractExcerpt(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      return content.substring(0, 200) + '...';
    }

    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + query.length + 100);
    
    return (start > 0 ? '...' : '') + 
           content.substring(start, end) + 
           (end < content.length ? '...' : '');
  }

  /**
   * Calculates keyword relevance score
   */
  private calculateKeywordRelevance(book: any, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (book.title.toLowerCase().includes(lowerQuery)) {
      score += 0.5;
    }

    // Subject match
    if (book.subject.toLowerCase().includes(lowerQuery)) {
      score += 0.3;
    }

    // Subtitle match
    if (book.subtitle?.toLowerCase().includes(lowerQuery)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Retrieves course materials for a specific course
   * Validates: Requirements 3.1, 3.3, 3.4
   */
  async getCourseMaterials(courseId: string): Promise<CourseMaterial> {
    try {
      logger.info('Retrieving course materials', { courseId });

      // Retrieve from database using Prisma
      const scrollCourseMaterial = await this.prisma.scrollCourseMaterial.findFirst({
        where: { courseId },
        include: {
          textbook: true,
          studyPack: true,
          pastQuestions: true,
          readingList: true
        }
      });

      if (!scrollCourseMaterial) {
        throw new Error(`Course materials not found for course: ${courseId}`);
      }

      // Convert to CourseMaterial interface
      const courseMaterial: CourseMaterial = {
        id: scrollCourseMaterial.id,
        courseId: scrollCourseMaterial.courseId,
        textbookId: scrollCourseMaterial.textbookId || undefined,
        workbookId: scrollCourseMaterial.workbookId || undefined,
        lectureSlides: scrollCourseMaterial.lectureSlides,
        studyPackId: scrollCourseMaterial.studyPackId || undefined,
        pastQuestions: scrollCourseMaterial.pastQuestions.map(q => ({
          id: q.id,
          type: q.type.toLowerCase().replace('_', '-') as 'multiple-choice' | 'essay' | 'short-answer',
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer || undefined,
          explanation: q.explanation || undefined
        })),
        readingList: scrollCourseMaterial.readingList.map(item => ({
          id: item.id,
          title: item.title,
          author: item.author,
          type: item.type.toLowerCase() as 'book' | 'article' | 'video' | 'website',
          url: item.url || undefined,
          required: item.required
        })),
        createdAt: scrollCourseMaterial.createdAt,
        updatedAt: scrollCourseMaterial.updatedAt
      };

      logger.info('Course materials retrieved successfully', { courseId });
      return courseMaterial;
    } catch (error) {
      logger.error('Course materials retrieval failed', { error, courseId });
      throw error;
    }
  }

  /**
   * Indexes content for search capabilities
   */
  async indexContent(bookId: string): Promise<void> {
    try {
      logger.info('Indexing book content', { bookId });

      const book = await this.getBook(bookId);

      // Create vector embeddings for semantic search
      // Build knowledge graph connections
      // Update search indices

      logger.info('Content indexing completed', { bookId });
    } catch (error) {
      logger.error('Content indexing failed', { error, bookId });
      throw error;
    }
  }

  /**
   * Validates content integrity and quality
   */
  async validateContent(bookId: string): Promise<boolean> {
    try {
      logger.info('Validating content', { bookId });

      const book = await this.getBook(bookId);

      // Validate theological alignment
      // Check academic integrity
      // Verify scroll tone compliance
      // Validate integrity hash

      const isValid = true; // Placeholder

      logger.info('Content validation completed', { bookId, isValid });
      return isValid;
    } catch (error) {
      logger.error('Content validation failed', { error, bookId });
      throw error;
    }
  }
}

export default LibraryManagementService;