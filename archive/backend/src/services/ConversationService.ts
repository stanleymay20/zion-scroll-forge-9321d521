/**
 * ScrollUniversity Conversation Service
 * "Let your conversation be always full of grace" - Colossians 4:6
 * 
 * Manages chatbot conversation history and context
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/productionLogger';
import { PrismaClient } from '@prisma/client';
import { AIMessage } from '../types/ai.types';

const prisma = new PrismaClient();

export interface Conversation {
    id: string;
    userId: string;
    sessionId: string;
    startedAt: Date;
    endedAt?: Date;
    status: 'active' | 'resolved' | 'escalated' | 'abandoned';
    initialQuery?: string;
    conversationTopic?: string;
    escalated: boolean;
    escalationReason?: string;
    ticketId?: string;
    satisfactionRating?: number;
    feedback?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    confidenceScore?: number;
    sourcesUsed?: any[];
    modelUsed?: string;
    tokensUsed?: number;
    cost?: number;
    contextWindow?: AIMessage[];
    retrievedDocuments?: any[];
    createdAt: Date;
}

export interface ConversationContext {
    conversationId: string;
    messages: Message[];
    summary?: string;
    topic?: string;
    userIntent?: string;
}

export class ConversationService {
    private readonly MAX_CONTEXT_MESSAGES = 10;
    private readonly CONTEXT_WINDOW_TOKENS = 4000;

    /**
     * Create new conversation
     */
    async createConversation(userId: string, initialQuery?: string): Promise<Conversation> {
        const conversationId = uuidv4();
        const sessionId = uuidv4();

        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO chatbot_conversations (
                    id, user_id, session_id, initial_query, status, escalated
                ) VALUES ($1, $2, $3, $4, 'active', false)
            `, conversationId, userId, sessionId, initialQuery || null);

            logger.info('Conversation created', {
                conversationId,
                userId,
                initialQuery: initialQuery?.substring(0, 50)
            });

            return {
                id: conversationId,
                userId,
                sessionId,
                startedAt: new Date(),
                status: 'active',
                initialQuery,
                escalated: false
            };

        } catch (error: any) {
            logger.error('Failed to create conversation', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Add message to conversation
     */
    async addMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: {
            confidenceScore?: number;
            sourcesUsed?: any[];
            modelUsed?: string;
            tokensUsed?: number;
            cost?: number;
            contextWindow?: AIMessage[];
            retrievedDocuments?: any[];
        }
    ): Promise<Message> {
        const messageId = uuidv4();

        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO chatbot_messages (
                    id, conversation_id, role, content,
                    confidence_score, sources_used, model_used,
                    tokens_used, cost, context_window, retrieved_documents
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, messageId, conversationId, role, content,
                metadata?.confidenceScore || null,
                JSON.stringify(metadata?.sourcesUsed || []),
                metadata?.modelUsed || null,
                metadata?.tokensUsed || null,
                metadata?.cost || null,
                JSON.stringify(metadata?.contextWindow || []),
                JSON.stringify(metadata?.retrievedDocuments || []));

            logger.debug('Message added to conversation', {
                conversationId,
                messageId,
                role,
                contentLength: content.length
            });

            return {
                id: messageId,
                conversationId,
                role,
                content,
                ...metadata,
                createdAt: new Date()
            };

        } catch (error: any) {
            logger.error('Failed to add message', {
                error: error.message,
                conversationId
            });
            throw error;
        }
    }

    /**
     * Get conversation history
     */
    async getConversationHistory(conversationId: string, limit?: number): Promise<Message[]> {
        try {
            const messages = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM chatbot_messages
                WHERE conversation_id = $1
                ORDER BY created_at ASC
                ${limit ? `LIMIT ${limit}` : ''}
            `, conversationId);

            return messages.map((msg: any) => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                role: msg.role,
                content: msg.content,
                confidenceScore: msg.confidence_score,
                sourcesUsed: msg.sources_used,
                modelUsed: msg.model_used,
                tokensUsed: msg.tokens_used,
                cost: msg.cost,
                contextWindow: msg.context_window,
                retrievedDocuments: msg.retrieved_documents,
                createdAt: msg.created_at
            }));

        } catch (error: any) {
            logger.error('Failed to get conversation history', {
                error: error.message,
                conversationId
            });
            return [];
        }
    }

    /**
     * Get conversation context for AI
     */
    async getConversationContext(conversationId: string): Promise<ConversationContext> {
        try {
            // Get recent messages
            const messages = await this.getConversationHistory(
                conversationId,
                this.MAX_CONTEXT_MESSAGES
            );

            // Get conversation metadata
            const conversations = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM chatbot_conversations WHERE id = $1
            `, conversationId);

            const conversation = conversations[0];

            // Generate summary if conversation is long
            let summary: string | undefined;
            if (messages.length > 5) {
                summary = await this.generateConversationSummary(messages);
            }

            return {
                conversationId,
                messages,
                summary,
                topic: conversation?.conversation_topic,
                userIntent: conversation?.initial_query
            };

        } catch (error: any) {
            logger.error('Failed to get conversation context', {
                error: error.message,
                conversationId
            });
            throw error;
        }
    }

    /**
     * Generate conversation summary for long threads
     */
    private async generateConversationSummary(messages: Message[]): Promise<string> {
        try {
            // Build conversation text
            const conversationText = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            // Use AI to summarize (simplified - would use aiGatewayService in production)
            const summary = `Conversation about ${messages[0]?.content.substring(0, 50)}... 
                with ${messages.length} messages exchanged.`;

            return summary;

        } catch (error: any) {
            logger.error('Failed to generate conversation summary', {
                error: error.message
            });
            return 'Unable to generate summary';
        }
    }

    /**
     * Manage context window to stay within token limits
     */
    async getContextWindow(conversationId: string): Promise<AIMessage[]> {
        try {
            const messages = await this.getConversationHistory(conversationId);

            // Convert to AI message format
            const aiMessages: AIMessage[] = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content
            }));

            // Keep only recent messages that fit in context window
            // Simplified - would calculate actual tokens in production
            const recentMessages = aiMessages.slice(-this.MAX_CONTEXT_MESSAGES);

            return recentMessages;

        } catch (error: any) {
            logger.error('Failed to get context window', {
                error: error.message,
                conversationId
            });
            return [];
        }
    }

    /**
     * Update conversation status
     */
    async updateConversationStatus(
        conversationId: string,
        status: 'active' | 'resolved' | 'escalated' | 'abandoned',
        metadata?: {
            topic?: string;
            escalationReason?: string;
            ticketId?: string;
        }
    ): Promise<boolean> {
        try {
            const updates: string[] = [`status = '${status}'`];
            const values: any[] = [];
            let paramIndex = 1;

            if (status === 'resolved' || status === 'abandoned') {
                updates.push(`ended_at = CURRENT_TIMESTAMP`);
            }

            if (status === 'escalated') {
                updates.push(`escalated = true`);
                if (metadata?.escalationReason) {
                    updates.push(`escalation_reason = $${paramIndex++}`);
                    values.push(metadata.escalationReason);
                }
                if (metadata?.ticketId) {
                    updates.push(`ticket_id = $${paramIndex++}`);
                    values.push(metadata.ticketId);
                }
                updates.push(`escalated_at = CURRENT_TIMESTAMP`);
            }

            if (metadata?.topic) {
                updates.push(`conversation_topic = $${paramIndex++}`);
                values.push(metadata.topic);
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(conversationId);

            await prisma.$executeRawUnsafe(`
                UPDATE chatbot_conversations
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
            `, ...values);

            logger.info('Conversation status updated', {
                conversationId,
                status
            });

            return true;

        } catch (error: any) {
            logger.error('Failed to update conversation status', {
                error: error.message,
                conversationId
            });
            return false;
        }
    }

    /**
     * Record satisfaction rating
     */
    async recordSatisfaction(
        conversationId: string,
        rating: number,
        feedback?: string
    ): Promise<boolean> {
        try {
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }

            await prisma.$executeRawUnsafe(`
                UPDATE chatbot_conversations
                SET satisfaction_rating = $1,
                    feedback = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, rating, feedback || null, conversationId);

            logger.info('Satisfaction recorded', {
                conversationId,
                rating
            });

            return true;

        } catch (error: any) {
            logger.error('Failed to record satisfaction', {
                error: error.message,
                conversationId
            });
            return false;
        }
    }

    /**
     * Get user's conversation history
     */
    async getUserConversations(userId: string, limit: number = 10): Promise<Conversation[]> {
        try {
            const conversations = await prisma.$queryRawUnsafe<any[]>(`
                SELECT * FROM chatbot_conversations
                WHERE user_id = $1
                ORDER BY started_at DESC
                LIMIT $2
            `, userId, limit);

            return conversations.map((conv: any) => ({
                id: conv.id,
                userId: conv.user_id,
                sessionId: conv.session_id,
                startedAt: conv.started_at,
                endedAt: conv.ended_at,
                status: conv.status,
                initialQuery: conv.initial_query,
                conversationTopic: conv.conversation_topic,
                escalated: conv.escalated,
                escalationReason: conv.escalation_reason,
                ticketId: conv.ticket_id,
                satisfactionRating: conv.satisfaction_rating,
                feedback: conv.feedback
            }));

        } catch (error: any) {
            logger.error('Failed to get user conversations', {
                error: error.message,
                userId
            });
            return [];
        }
    }

    /**
     * Get conversation statistics
     */
    async getStatistics(userId?: string): Promise<any> {
        try {
            const whereClause = userId ? `WHERE user_id = $1` : '';
            const params = userId ? [userId] : [];

            const stats = await prisma.$queryRawUnsafe<any[]>(`
                SELECT 
                    COUNT(*) as total_conversations,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                    COUNT(CASE WHEN escalated THEN 1 END) as escalated,
                    AVG(satisfaction_rating) as avg_satisfaction,
                    COUNT(CASE WHEN satisfaction_rating IS NOT NULL THEN 1 END) as rated_conversations
                FROM chatbot_conversations
                ${whereClause}
            `, ...params);

            return stats[0] || {};

        } catch (error: any) {
            logger.error('Failed to get conversation statistics', {
                error: error.message
            });
            return {};
        }
    }

    /**
     * Clean up old conversations
     */
    async cleanupOldConversations(daysOld: number = 90): Promise<number> {
        try {
            const result = await prisma.$executeRawUnsafe(`
                DELETE FROM chatbot_conversations
                WHERE started_at < NOW() - INTERVAL '${daysOld} days'
                AND status IN ('resolved', 'abandoned')
            `);

            logger.info('Old conversations cleaned up', {
                daysOld,
                deleted: result
            });

            return result as number;

        } catch (error: any) {
            logger.error('Failed to cleanup old conversations', {
                error: error.message
            });
            return 0;
        }
    }
}

// Singleton instance
export const conversationService = new ConversationService();
