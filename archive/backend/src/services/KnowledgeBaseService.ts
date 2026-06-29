/**
 * ScrollUniversity Knowledge Base Service
 * "Search the Scriptures" - John 5:39
 * 
 * Manages knowledge base ingestion and retrieval for support chatbot
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/productionLogger';
import { vectorStoreService, VectorDocument } from './VectorStoreService';
import { aiGatewayService } from './AIGatewayService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface KnowledgeBaseDocument {
    id?: string;
    title: string;
    content: string;
    documentType: 'policy' | 'faq' | 'course_material' | 'procedure' | 'guide';
    category: string;
    tags: string[];
    sourceUrl?: string;
    author?: string;
    lastUpdated?: Date;
    version?: string;
}

export interface IngestionResult {
    documentId: string;
    vectorId: string;
    success: boolean;
    error?: string;
}

export interface SearchResult {
    documentId: string;
    title: string;
    content: string;
    relevanceScore: number;
    category: string;
    documentType: string;
}

export class KnowledgeBaseService {
    /**
     * Ingest a single document into knowledge base
     */
    async ingestDocument(document: KnowledgeBaseDocument): Promise<IngestionResult> {
        const docId = document.id || uuidv4();

        try {
            // Create vector document
            const vectorDoc: VectorDocument = {
                id: `kb:${docId}`,
                content: `${document.title}\n\n${document.content}`,
                metadata: {
                    type: 'faq',
                    title: document.title,
                    tags: document.tags
                }
            };

            // Ingest into vector store
            const vectorId = await vectorStoreService.ingestDocument(vectorDoc);

            // Store in database
            await prisma.$executeRawUnsafe(`
                INSERT INTO knowledge_base_documents (
                    id, title, content, document_type, category, tags,
                    source_url, author, last_updated, version,
                    vector_id, embedding_generated, is_active, is_published
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, true
                )
                ON CONFLICT (id) DO UPDATE SET
                    title = $2, content = $3, document_type = $4, category = $5,
                    tags = $6, source_url = $7, author = $8, last_updated = $9,
                    version = $10, vector_id = $11, updated_at = CURRENT_TIMESTAMP
            `, docId, document.title, document.content, document.documentType,
                document.category, document.tags, document.sourceUrl || null,
                document.author || null, document.lastUpdated || new Date(),
                document.version || '1.0', vectorId);

            logger.info('Knowledge base document ingested', {
                documentId: docId,
                vectorId,
                type: document.documentType,
                category: document.category
            });

            return {
                documentId: docId,
                vectorId,
                success: true
            };

        } catch (error: any) {
            logger.error('Failed to ingest knowledge base document', {
                error: error.message,
                documentId: docId
            });

            return {
                documentId: docId,
                vectorId: '',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Ingest multiple documents in batch
     */
    async ingestDocuments(documents: KnowledgeBaseDocument[]): Promise<IngestionResult[]> {
        logger.info('Starting batch knowledge base ingestion', {
            count: documents.length
        });

        const results: IngestionResult[] = [];

        for (const document of documents) {
            const result = await this.ingestDocument(document);
            results.push(result);
        }

        const successCount = results.filter(r => r.success).length;
        logger.info('Batch ingestion completed', {
            total: documents.length,
            successful: successCount,
            failed: documents.length - successCount
        });

        return results;
    }

    /**
     * Extract content from existing documentation
     */
    async extractFromDocumentation(sourceType: string): Promise<KnowledgeBaseDocument[]> {
        const documents: KnowledgeBaseDocument[] = [];

        try {
            // Extract from different sources based on type
            switch (sourceType) {
                case 'policies':
                    documents.push(...await this.extractPolicies());
                    break;
                case 'faqs':
                    documents.push(...await this.extractFAQs());
                    break;
                case 'courses':
                    documents.push(...await this.extractCourseContent());
                    break;
                default:
                    logger.warn('Unknown source type for extraction', { sourceType });
            }

            logger.info('Documentation extracted', {
                sourceType,
                count: documents.length
            });

            return documents;

        } catch (error: any) {
            logger.error('Failed to extract documentation', {
                error: error.message,
                sourceType
            });
            return [];
        }
    }

    /**
     * Extract policies from database
     */
    private async extractPolicies(): Promise<KnowledgeBaseDocument[]> {
        const documents: KnowledgeBaseDocument[] = [];

        // Common university policies
        const policies = [
            {
                title: 'Academic Integrity Policy',
                content: `ScrollUniversity maintains the highest standards of academic integrity. 
                Students are expected to submit original work and properly cite all sources. 
                Plagiarism, cheating, and unauthorized collaboration are strictly prohibited.
                Violations may result in failing grades, suspension, or expulsion.`,
                category: 'Academic Policies',
                tags: ['academic integrity', 'plagiarism', 'cheating', 'policy']
            },
            {
                title: 'Enrollment and Registration',
                content: `Students must register for courses during designated registration periods.
                Prerequisites must be completed before enrolling in advanced courses.
                Full-time status requires enrollment in at least 12 credit hours per semester.
                Add/drop period is the first two weeks of each semester.`,
                category: 'Enrollment',
                tags: ['enrollment', 'registration', 'courses', 'prerequisites']
            },
            {
                title: 'Grading Policy',
                content: `ScrollUniversity uses a standard letter grading system (A-F).
                A: 90-100%, B: 80-89%, C: 70-79%, D: 60-69%, F: Below 60%.
                GPA is calculated on a 4.0 scale. Minimum GPA for good standing is 2.0.
                Incomplete grades must be resolved within one semester.`,
                category: 'Academic Policies',
                tags: ['grading', 'gpa', 'grades', 'academic standing']
            },
            {
                title: 'Financial Aid and Scholarships',
                content: `ScrollUniversity offers various financial aid options including scholarships,
                work-trade programs, and ScrollCoin payment. Students must maintain satisfactory
                academic progress to remain eligible for aid. FAFSA required for federal aid.`,
                category: 'Financial',
                tags: ['financial aid', 'scholarships', 'payment', 'scrollcoin']
            },
            {
                title: 'Technical Requirements',
                content: `Students need reliable internet connection, modern web browser (Chrome, Firefox, Safari),
                and device capable of running video conferencing. Mobile app available for iOS and Android.
                Minimum 5 Mbps internet speed recommended for video lectures.`,
                category: 'Technical',
                tags: ['technical requirements', 'internet', 'devices', 'system requirements']
            }
        ];

        for (const policy of policies) {
            documents.push({
                title: policy.title,
                content: policy.content,
                documentType: 'policy',
                category: policy.category,
                tags: policy.tags,
                author: 'ScrollUniversity Administration',
                lastUpdated: new Date(),
                version: '1.0'
            });
        }

        return documents;
    }

    /**
     * Extract FAQs
     */
    private async extractFAQs(): Promise<KnowledgeBaseDocument[]> {
        const documents: KnowledgeBaseDocument[] = [];

        const faqs = [
            {
                title: 'How do I reset my password?',
                content: `To reset your password: 1) Click "Forgot Password" on login page,
                2) Enter your email address, 3) Check email for reset link, 4) Click link and create new password.
                Password must be at least 8 characters with uppercase, lowercase, and numbers.`,
                category: 'Account Management',
                tags: ['password', 'reset', 'login', 'account']
            },
            {
                title: 'How do I enroll in a course?',
                content: `To enroll in a course: 1) Browse course catalog, 2) Check prerequisites,
                3) Click "Enroll" button, 4) Complete payment or use ScrollCoin, 5) Access course materials immediately.
                You can enroll anytime as courses are self-paced.`,
                category: 'Courses',
                tags: ['enrollment', 'courses', 'registration']
            },
            {
                title: 'What is ScrollCoin?',
                content: `ScrollCoin is our blockchain-based reward currency. Earn ScrollCoin by:
                completing courses, participating in discussions, helping peers, contributing content.
                Use ScrollCoin to: pay tuition, purchase resources, unlock premium features.
                1 ScrollCoin = $1 USD equivalent.`,
                category: 'ScrollCoin',
                tags: ['scrollcoin', 'cryptocurrency', 'rewards', 'payment']
            },
            {
                title: 'How do I contact support?',
                content: `Contact support through: 1) AI Chatbot (24/7 instant help), 2) Email: support@scrolluniversity.org,
                3) Phone: Available during business hours, 4) Submit ticket through student portal.
                Response time: Chatbot instant, Email within 24 hours, Urgent issues within 2 hours.`,
                category: 'Support',
                tags: ['support', 'help', 'contact', 'assistance']
            },
            {
                title: 'Can I access courses offline?',
                content: `Yes! Download course materials through mobile app for offline access.
                Videos, readings, and assignments available offline. Sync progress when reconnected.
                Perfect for areas with limited internet connectivity.`,
                category: 'Technical',
                tags: ['offline', 'mobile', 'download', 'access']
            },
            {
                title: 'How long do I have to complete a course?',
                content: `Most courses are self-paced with flexible deadlines. Standard completion time: 4-8 weeks.
                Maximum time allowed: 6 months from enrollment. Extensions available upon request.
                Some cohort-based courses have fixed schedules.`,
                category: 'Courses',
                tags: ['deadlines', 'completion', 'timeline', 'pacing']
            }
        ];

        for (const faq of faqs) {
            documents.push({
                title: faq.title,
                content: faq.content,
                documentType: 'faq',
                category: faq.category,
                tags: faq.tags,
                author: 'ScrollUniversity Support Team',
                lastUpdated: new Date(),
                version: '1.0'
            });
        }

        return documents;
    }

    /**
     * Extract course content for knowledge base
     */
    private async extractCourseContent(): Promise<KnowledgeBaseDocument[]> {
        const documents: KnowledgeBaseDocument[] = [];

        try {
            // Query courses from database
            const courses = await prisma.$queryRawUnsafe<any[]>(`
                SELECT id, title, description, syllabus, difficulty
                FROM courses
                WHERE is_active = true
                LIMIT 50
            `);

            for (const course of courses) {
                if (course.description) {
                    documents.push({
                        title: `Course: ${course.title}`,
                        content: `${course.description}\n\nDifficulty: ${course.difficulty}\n\n${course.syllabus || ''}`,
                        documentType: 'course_material',
                        category: 'Courses',
                        tags: ['course', course.difficulty.toLowerCase(), 'curriculum'],
                        sourceUrl: `/courses/${course.id}`,
                        lastUpdated: new Date(),
                        version: '1.0'
                    });
                }
            }

            logger.info('Course content extracted', { count: documents.length });

        } catch (error: any) {
            logger.error('Failed to extract course content', {
                error: error.message
            });
        }

        return documents;
    }

    /**
     * Search knowledge base
     */
    async search(query: string, options: {
        topK?: number;
        category?: string;
        documentType?: string;
    } = {}): Promise<SearchResult[]> {
        try {
            const { topK = 5, category, documentType } = options;

            // Build filter
            const filter: any = {};
            if (category) filter.category = category;
            if (documentType) filter.type = documentType;

            // Search vector store
            const vectorResults = await vectorStoreService.search(query, {
                topK,
                filter,
                minScore: 0.7
            });

            // Format results
            const results: SearchResult[] = vectorResults.map(result => ({
                documentId: result.id.replace('kb:', ''),
                title: result.metadata.title || 'Untitled',
                content: result.content,
                relevanceScore: result.score,
                category: result.metadata.courseId || 'General',
                documentType: result.metadata.type || 'faq'
            }));

            logger.info('Knowledge base search completed', {
                query: query.substring(0, 50),
                resultsCount: results.length
            });

            return results;

        } catch (error: any) {
            logger.error('Knowledge base search failed', {
                error: error.message,
                query: query.substring(0, 50)
            });
            return [];
        }
    }

    /**
     * Update document
     */
    async updateDocument(documentId: string, updates: Partial<KnowledgeBaseDocument>): Promise<boolean> {
        try {
            // Get existing document
            const existing = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM knowledge_base_documents WHERE id = $1
            `, documentId);

            if (existing.length === 0) {
                throw new Error('Document not found');
            }

            const doc = existing[0];

            // If content changed, regenerate embedding
            if (updates.content && updates.content !== doc.content) {
                const vectorDoc: VectorDocument = {
                    id: `kb:${documentId}`,
                    content: `${updates.title || doc.title}\n\n${updates.content}`,
                    metadata: {
                        type: 'faq',
                        title: updates.title || doc.title,
                        tags: updates.tags || doc.tags
                    }
                };

                await vectorStoreService.ingestDocument(vectorDoc);
            }

            // Update database
            const updateFields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (updates.title) {
                updateFields.push(`title = $${paramIndex++}`);
                values.push(updates.title);
            }
            if (updates.content) {
                updateFields.push(`content = $${paramIndex++}`);
                values.push(updates.content);
            }
            if (updates.category) {
                updateFields.push(`category = $${paramIndex++}`);
                values.push(updates.category);
            }
            if (updates.tags) {
                updateFields.push(`tags = $${paramIndex++}`);
                values.push(updates.tags);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(documentId);

            await prisma.$executeRawUnsafe(`
                UPDATE knowledge_base_documents
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
            `, ...values);

            logger.info('Knowledge base document updated', { documentId });
            return true;

        } catch (error: any) {
            logger.error('Failed to update knowledge base document', {
                error: error.message,
                documentId
            });
            return false;
        }
    }

    /**
     * Delete document
     */
    async deleteDocument(documentId: string): Promise<boolean> {
        try {
            // Delete from vector store
            await vectorStoreService.deleteDocument(`kb:${documentId}`);

            // Delete from database
            await prisma.$executeRawUnsafe(`
                DELETE FROM knowledge_base_documents WHERE id = $1
            `, documentId);

            logger.info('Knowledge base document deleted', { documentId });
            return true;

        } catch (error: any) {
            logger.error('Failed to delete knowledge base document', {
                error: error.message,
                documentId
            });
            return false;
        }
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId: string): Promise<KnowledgeBaseDocument | null> {
        try {
            const results = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM knowledge_base_documents WHERE id = $1
            `, documentId);

            if (results.length === 0) {
                return null;
            }

            const doc = results[0];
            return {
                id: doc.id,
                title: doc.title,
                content: doc.content,
                documentType: doc.document_type,
                category: doc.category,
                tags: doc.tags,
                sourceUrl: doc.source_url,
                author: doc.author,
                lastUpdated: doc.last_updated,
                version: doc.version
            };

        } catch (error: any) {
            logger.error('Failed to get knowledge base document', {
                error: error.message,
                documentId
            });
            return null;
        }
    }

    /**
     * Get statistics
     */
    async getStatistics(): Promise<any> {
        try {
            const stats = await prisma.$queryRawUnsafe<any[]>(`
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN embedding_generated THEN 1 END) as embedded_documents,
                    COUNT(CASE WHEN is_published THEN 1 END) as published_documents,
                    COUNT(DISTINCT document_type) as document_types,
                    COUNT(DISTINCT category) as categories
                FROM knowledge_base_documents
                WHERE is_active = true
            `);

            return stats[0] || {};

        } catch (error: any) {
            logger.error('Failed to get knowledge base statistics', {
                error: error.message
            });
            return {};
        }
    }
}

// Singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();
