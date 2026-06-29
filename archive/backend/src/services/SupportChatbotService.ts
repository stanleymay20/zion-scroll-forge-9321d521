/**
 * ScrollUniversity Support Chatbot Service
 * "Ask and it will be given to you" - Matthew 7:7
 * 
 * Main chatbot service integrating knowledge base, conversation management, and escalation
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/productionLogger';
import { aiGatewayService } from './AIGatewayService';
import { knowledgeBaseService } from './KnowledgeBaseService';
import { conversationService } from './ConversationService';
import { escalationService } from './EscalationService';
import { AIMessage } from '../types/ai.types';

export interface ChatRequest {
    userId: string;
    message: string;
    conversationId?: string;
}

export interface ChatResponse {
    conversationId: string;
    message: string;
    confidence: number;
    sources: any[];
    needsEscalation: boolean;
    escalationReason?: string;
    suggestedActions?: string[];
}

export class SupportChatbotService {
    private readonly SYSTEM_PROMPT = `You are ScrollMentorGPT, a helpful and compassionate AI assistant for ScrollUniversity students.
Your role is to provide accurate, helpful information about courses, policies, enrollment, and general support.

Guidelines:
- Be warm, friendly, and encouraging
- Provide clear, concise answers
- Reference specific policies and procedures when relevant
- If you're unsure, acknowledge it and offer to escalate to human support
- Maintain a Christ-centered, supportive tone
- Use Scripture references when appropriate for encouragement

When answering:
1. Search the knowledge base for relevant information
2. Provide accurate, helpful responses
3. Include sources when citing policies or procedures
4. Offer next steps or additional help

If the question is urgent, complex, or you're not confident, recommend escalation to human support.`;

    /**
     * Handle chat message
     */
    async handleMessage(request: ChatRequest): Promise<ChatResponse> {
        try {
            // Get or create conversation
            let conversationId = request.conversationId;
            if (!conversationId) {
                const conversation = await conversationService.createConversation(
                    request.userId,
                    request.message
                );
                conversationId = conversation.id;
            }

            // Add user message to conversation
            await conversationService.addMessage(
                conversationId,
                'user',
                request.message
            );

            // Search knowledge base for relevant information
            const knowledgeResults = await knowledgeBaseService.search(request.message, {
                topK: 3
            });

            // Build context from knowledge base
            const context = knowledgeResults.length > 0
                ? `Relevant information from knowledge base:\n\n${knowledgeResults.map((r, i) =>
                    `[${i + 1}] ${r.title}\n${r.content}`
                ).join('\n\n')}`
                : 'No specific information found in knowledge base.';

            // Get conversation history
            const conversationContext = await conversationService.getContextWindow(conversationId);

            // Build messages for AI
            const messages: AIMessage[] = [
                { role: 'system', content: this.SYSTEM_PROMPT },
                { role: 'system', content: context },
                ...conversationContext
            ];

            // Generate AI response
            const aiResponse = await aiGatewayService.generateCompletion({
                model: 'gpt-4',
                messages,
                temperature: 0.7,
                maxTokens: 500
            }, request.userId);

            // Calculate confidence (simplified)
            const confidence = this.calculateConfidence(aiResponse, knowledgeResults);

            // Check if escalation needed
            const escalationCheck = escalationService.shouldEscalate(
                request.message,
                confidence,
                conversationContext
            );

            // Add assistant message to conversation
            await conversationService.addMessage(
                conversationId,
                'assistant',
                aiResponse.content,
                {
                    confidenceScore: confidence,
                    sourcesUsed: knowledgeResults,
                    modelUsed: aiResponse.model,
                    tokensUsed: aiResponse.usage.totalTokens,
                    cost: aiResponse.cost.totalCost,
                    contextWindow: conversationContext,
                    retrievedDocuments: knowledgeResults
                }
            );

            // Handle escalation if needed
            if (escalationCheck.shouldEscalate) {
                await escalationService.escalateConversation(
                    conversationId,
                    escalationCheck.reason,
                    escalationCheck.priority
                );
            }

            logger.info('Chat message handled', {
                conversationId,
                userId: request.userId,
                confidence,
                escalated: escalationCheck.shouldEscalate,
                tokensUsed: aiResponse.usage.totalTokens,
                cost: aiResponse.cost.totalCost
            });

            return {
                conversationId,
                message: aiResponse.content,
                confidence,
                sources: knowledgeResults.map(r => ({
                    title: r.title,
                    category: r.category,
                    relevance: r.relevanceScore
                })),
                needsEscalation: escalationCheck.shouldEscalate,
                escalationReason: escalationCheck.reason,
                suggestedActions: this.getSuggestedActions(request.message, knowledgeResults)
            };

        } catch (error: any) {
            logger.error('Failed to handle chat message', {
                error: error.message,
                userId: request.userId
            });
            throw error;
        }
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidence(aiResponse: any, knowledgeResults: any[]): number {
        let confidence = 0.5; // Base confidence

        // Increase confidence if knowledge base results found
        if (knowledgeResults.length > 0) {
            const avgRelevance = knowledgeResults.reduce((sum, r) => sum + r.relevanceScore, 0) / knowledgeResults.length;
            confidence += avgRelevance * 0.3;
        }

        // Increase confidence if response is detailed
        if (aiResponse.content.length > 200) {
            confidence += 0.1;
        }

        // Decrease confidence if response contains uncertainty phrases
        const uncertaintyPhrases = ['not sure', 'might', 'possibly', 'perhaps', 'i think'];
        const hasUncertainty = uncertaintyPhrases.some(phrase =>
            aiResponse.content.toLowerCase().includes(phrase)
        );
        if (hasUncertainty) {
            confidence -= 0.2;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Get suggested actions based on query
     */
    private getSuggestedActions(message: string, knowledgeResults: any[]): string[] {
        const actions: string[] = [];
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('enroll') || lowerMessage.includes('register')) {
            actions.push('Browse Course Catalog');
            actions.push('Check Prerequisites');
        }

        if (lowerMessage.includes('payment') || lowerMessage.includes('tuition')) {
            actions.push('View Payment Options');
            actions.push('Check ScrollCoin Balance');
        }

        if (lowerMessage.includes('grade') || lowerMessage.includes('assignment')) {
            actions.push('View Grades');
            actions.push('Check Assignment Status');
        }

        if (lowerMessage.includes('password') || lowerMessage.includes('login')) {
            actions.push('Reset Password');
            actions.push('Update Account Settings');
        }

        // Add knowledge base related actions
        if (knowledgeResults.length > 0) {
            knowledgeResults.slice(0, 2).forEach(result => {
                if (result.documentType === 'policy') {
                    actions.push(`Read ${result.title}`);
                }
            });
        }

        return actions.slice(0, 3); // Limit to 3 actions
    }

    /**
     * Initialize knowledge base with default content
     */
    async initializeKnowledgeBase(): Promise<void> {
        try {
            logger.info('Initializing knowledge base...');

            // Extract and ingest policies
            const policies = await knowledgeBaseService.extractFromDocumentation('policies');
            await knowledgeBaseService.ingestDocuments(policies);

            // Extract and ingest FAQs
            const faqs = await knowledgeBaseService.extractFromDocumentation('faqs');
            await knowledgeBaseService.ingestDocuments(faqs);

            // Extract and ingest course content
            const courses = await knowledgeBaseService.extractFromDocumentation('courses');
            await knowledgeBaseService.ingestDocuments(courses);

            const stats = await knowledgeBaseService.getStatistics();
            logger.info('Knowledge base initialized', stats);

        } catch (error: any) {
            logger.error('Failed to initialize knowledge base', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get chatbot statistics
     */
    async getStatistics(): Promise<any> {
        try {
            const conversationStats = await conversationService.getStatistics();
            const ticketStats = await escalationService.getStatistics();
            const kbStats = await knowledgeBaseService.getStatistics();

            return {
                conversations: conversationStats,
                tickets: ticketStats,
                knowledgeBase: kbStats,
                timestamp: new Date()
            };

        } catch (error: any) {
            logger.error('Failed to get chatbot statistics', {
                error: error.message
            });
            return {};
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Check if services are accessible
            await knowledgeBaseService.getStatistics();
            await conversationService.getStatistics();
            await escalationService.getStatistics();

            return true;
        } catch (error: any) {
            logger.error('Chatbot health check failed', {
                error: error.message
            });
            return false;
        }
    }
}

// Singleton instance
export const supportChatbotService = new SupportChatbotService();
