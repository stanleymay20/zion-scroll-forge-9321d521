/**
 * ScrollUniversity Vector Store Service
 * "Search the Scriptures" - John 5:39
 * 
 * Manages vector embeddings for semantic search and RAG
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/productionLogger';
import { aiGatewayService } from './AIGatewayService';
import { cacheService } from './CacheService';

export interface VectorDocument {
    id: string;
    content: string;
    embedding?: number[];
    metadata: {
        type: 'course' | 'policy' | 'paper' | 'resource' | 'faq' | 'scripture';
        courseId?: string;
        moduleId?: string;
        author?: string;
        title?: string;
        date?: Date;
        tags: string[];
        url?: string;
    };
}

export interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata: VectorDocument['metadata'];
}

export interface SearchOptions {
    topK?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
    minScore?: number;
}

export class VectorStoreService {
    private pinecone: Pinecone | null = null;
    private indexName: string;
    private dimension: number = 1536; // OpenAI ada-002 embedding dimension

    constructor() {
        const apiKey = process.env.PINECONE_API_KEY || '';
        const environment = process.env.PINECONE_ENVIRONMENT || 'gcp-starter';
        this.indexName = process.env.PINECONE_INDEX_NAME || 'scrolluniversity';

        if (!apiKey) {
            logger.warn('Pinecone API key not configured, vector store disabled');
            return;
        }

        this.pinecone = new Pinecone({
            apiKey
        });

        logger.info('Vector Store Service initialized', {
            indexName: this.indexName,
            dimension: this.dimension
        });
    }

    /**
     * Initialize index if it doesn't exist
     */
    async initializeIndex(): Promise<void> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const indexes = await this.pinecone.listIndexes();
            const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

            if (!indexExists) {
                logger.info('Creating Pinecone index', { indexName: this.indexName });
                
                await this.pinecone.createIndex({
                    name: this.indexName,
                    dimension: this.dimension,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });

                logger.info('Pinecone index created successfully', { indexName: this.indexName });
            } else {
                logger.info('Pinecone index already exists', { indexName: this.indexName });
            }
        } catch (error: any) {
            logger.error('Failed to initialize Pinecone index', {
                error: error.message,
                indexName: this.indexName
            });
            throw error;
        }
    }

    /**
     * Ingest document into vector store
     */
    async ingestDocument(document: VectorDocument): Promise<string> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const docId = document.id || uuidv4();

            // Generate embedding if not provided
            let embedding = document.embedding;
            if (!embedding) {
                const embeddingResponse = await aiGatewayService.generateEmbeddings({
                    input: document.content
                });
                embedding = embeddingResponse.embeddings[0];
            }

            // Get index
            const index = this.pinecone.index(this.indexName);

            // Upsert vector
            await index.upsert([{
                id: docId,
                values: embedding,
                metadata: {
                    content: document.content,
                    type: document.metadata.type,
                    courseId: document.metadata.courseId || '',
                    moduleId: document.metadata.moduleId || '',
                    author: document.metadata.author || '',
                    title: document.metadata.title || '',
                    date: document.metadata.date?.toISOString() || '',
                    tags: document.metadata.tags.join(','),
                    url: document.metadata.url || ''
                }
            }]);

            logger.info('Document ingested into vector store', {
                docId,
                type: document.metadata.type,
                contentLength: document.content.length
            });

            return docId;

        } catch (error: any) {
            logger.error('Failed to ingest document', {
                error: error.message,
                documentId: document.id
            });
            throw error;
        }
    }

    /**
     * Ingest multiple documents in batch
     */
    async ingestDocuments(documents: VectorDocument[]): Promise<string[]> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const batchSize = 100;
            const docIds: string[] = [];

            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                
                // Generate embeddings for batch
                const contents = batch.map(doc => doc.content);
                const embeddingResponse = await aiGatewayService.generateEmbeddings({
                    input: contents
                });

                // Prepare vectors
                const vectors = batch.map((doc, idx) => {
                    const docId = doc.id || uuidv4();
                    docIds.push(docId);

                    return {
                        id: docId,
                        values: doc.embedding || embeddingResponse.embeddings[idx],
                        metadata: {
                            content: doc.content,
                            type: doc.metadata.type,
                            courseId: doc.metadata.courseId || '',
                            moduleId: doc.metadata.moduleId || '',
                            author: doc.metadata.author || '',
                            title: doc.metadata.title || '',
                            date: doc.metadata.date?.toISOString() || '',
                            tags: doc.metadata.tags.join(','),
                            url: doc.metadata.url || ''
                        }
                    };
                });

                // Upsert batch
                const index = this.pinecone.index(this.indexName);
                await index.upsert(vectors);

                logger.info('Document batch ingested', {
                    batchNumber: Math.floor(i / batchSize) + 1,
                    count: batch.length
                });
            }

            logger.info('All documents ingested successfully', {
                totalCount: documents.length
            });

            return docIds;

        } catch (error: any) {
            logger.error('Failed to ingest documents batch', {
                error: error.message,
                count: documents.length
            });
            throw error;
        }
    }

    /**
     * Search for similar documents
     */
    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const {
                topK = 10,
                filter,
                includeMetadata = true,
                minScore = 0.7
            } = options;

            // Check cache first
            const cacheKey = `vector:search:${this.hashQuery(query, options)}`;
            const cached = await cacheService.get<SearchResult[]>(cacheKey);
            if (cached) {
                logger.debug('Vector search cache hit', { query: query.substring(0, 50) });
                return cached;
            }

            // Generate query embedding
            const embeddingResponse = await aiGatewayService.generateEmbeddings({
                input: query
            });
            const queryEmbedding = embeddingResponse.embeddings[0];

            // Search index
            const index = this.pinecone.index(this.indexName);
            const searchResponse = await index.query({
                vector: queryEmbedding,
                topK,
                filter,
                includeMetadata
            });

            // Format results
            const results: SearchResult[] = searchResponse.matches
                ?.filter(match => match.score && match.score >= minScore)
                .map(match => ({
                    id: match.id,
                    content: match.metadata?.content as string || '',
                    score: match.score || 0,
                    metadata: {
                        type: match.metadata?.type as any,
                        courseId: match.metadata?.courseId as string,
                        moduleId: match.metadata?.moduleId as string,
                        author: match.metadata?.author as string,
                        title: match.metadata?.title as string,
                        date: match.metadata?.date ? new Date(match.metadata.date as string) : undefined,
                        tags: (match.metadata?.tags as string || '').split(',').filter(Boolean),
                        url: match.metadata?.url as string
                    }
                })) || [];

            // Cache results
            await cacheService.set(cacheKey, results, {
                ttl: 3600,
                tags: ['vector-search']
            });

            logger.info('Vector search completed', {
                query: query.substring(0, 50),
                resultsCount: results.length,
                topScore: results[0]?.score
            });

            return results;

        } catch (error: any) {
            logger.error('Vector search failed', {
                error: error.message,
                query: query.substring(0, 50)
            });
            throw error;
        }
    }

    /**
     * Search by document ID
     */
    async getDocument(id: string): Promise<VectorDocument | null> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const index = this.pinecone.index(this.indexName);
            const response = await index.fetch([id]);

            const record = response.records?.[id];
            if (!record) {
                return null;
            }

            return {
                id: record.id,
                content: record.metadata?.content as string || '',
                embedding: record.values,
                metadata: {
                    type: record.metadata?.type as any,
                    courseId: record.metadata?.courseId as string,
                    moduleId: record.metadata?.moduleId as string,
                    author: record.metadata?.author as string,
                    title: record.metadata?.title as string,
                    date: record.metadata?.date ? new Date(record.metadata.date as string) : undefined,
                    tags: (record.metadata?.tags as string || '').split(',').filter(Boolean),
                    url: record.metadata?.url as string
                }
            };

        } catch (error: any) {
            logger.error('Failed to get document', {
                error: error.message,
                documentId: id
            });
            return null;
        }
    }

    /**
     * Delete document from vector store
     */
    async deleteDocument(id: string): Promise<boolean> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const index = this.pinecone.index(this.indexName);
            await index.deleteOne(id);

            logger.info('Document deleted from vector store', { documentId: id });
            return true;

        } catch (error: any) {
            logger.error('Failed to delete document', {
                error: error.message,
                documentId: id
            });
            return false;
        }
    }

    /**
     * Delete documents by filter
     */
    async deleteDocuments(filter: Record<string, any>): Promise<boolean> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const index = this.pinecone.index(this.indexName);
            await index.deleteMany(filter);

            logger.info('Documents deleted from vector store', { filter });
            return true;

        } catch (error: any) {
            logger.error('Failed to delete documents', {
                error: error.message,
                filter
            });
            return false;
        }
    }

    /**
     * Update document metadata
     */
    async updateDocument(id: string, updates: Partial<VectorDocument>): Promise<boolean> {
        try {
            // Get existing document
            const existing = await this.getDocument(id);
            if (!existing) {
                throw new Error('Document not found');
            }

            // Merge updates
            const updated: VectorDocument = {
                ...existing,
                ...updates,
                metadata: {
                    ...existing.metadata,
                    ...updates.metadata
                }
            };

            // Re-ingest with same ID
            await this.ingestDocument(updated);

            logger.info('Document updated in vector store', { documentId: id });
            return true;

        } catch (error: any) {
            logger.error('Failed to update document', {
                error: error.message,
                documentId: id
            });
            return false;
        }
    }

    /**
     * Get index statistics
     */
    async getStats(): Promise<any> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const index = this.pinecone.index(this.indexName);
            const stats = await index.describeIndexStats();

            return {
                totalVectors: stats.totalRecordCount,
                dimension: stats.dimension,
                indexFullness: stats.indexFullness,
                namespaces: stats.namespaces
            };

        } catch (error: any) {
            logger.error('Failed to get vector store stats', {
                error: error.message
            });
            return null;
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        if (!this.pinecone) {
            return false;
        }

        try {
            await this.pinecone.listIndexes();
            return true;
        } catch (error: any) {
            logger.error('Vector store health check failed', {
                error: error.message
            });
            return false;
        }
    }

    /**
     * Hash query for caching
     */
    private hashQuery(query: string, options: SearchOptions): string {
        const content = JSON.stringify({ query, options });
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString();
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const embeddingResponse = await aiGatewayService.generateEmbeddings({
                input: text
            });
            return embeddingResponse.embeddings[0];
        } catch (error: any) {
            logger.error('Failed to generate embedding', {
                error: error.message,
                textLength: text.length
            });
            throw error;
        }
    }

    /**
     * Search for similar vectors using an embedding
     */
    async searchSimilar(
        embedding: number[],
        options: {
            namespace?: string;
            topK?: number;
            filter?: Record<string, any>;
        } = {}
    ): Promise<Array<{ id: string; score: number; metadata: any }>> {
        if (!this.pinecone) {
            throw new Error('Pinecone not initialized');
        }

        try {
            const { topK = 10, filter } = options;

            const index = this.pinecone.index(this.indexName);
            const searchResponse = await index.query({
                vector: embedding,
                topK,
                filter,
                includeMetadata: true
            });

            return searchResponse.matches?.map(match => ({
                id: match.id,
                score: match.score || 0,
                metadata: match.metadata || {}
            })) || [];

        } catch (error: any) {
            logger.error('Failed to search similar vectors', {
                error: error.message
            });
            throw error;
        }
    }
}

// Singleton instance
export const vectorStoreService = new VectorStoreService();
