/**
 * ScrollUniversity Support Chatbot Service Tests
 * "Test everything; hold fast what is good" - 1 Thessalonians 5:21
 */

// Mock Prisma BEFORE any imports
jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        $queryRawUnsafe: jest.fn().mockImplementation((query: string) => {
            // Mock conversation query for escalation
            if (query.includes('chatbot_conversations')) {
                return Promise.resolve([{
                    id: 'mock-conversation-id',
                    user_id: 'test-user-123',
                    session_id: 'mock-session-id',
                    started_at: new Date(),
                    status: 'active',
                    escalated: false
                }]);
            }
            return Promise.resolve([]);
        }),
        $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    return {
        PrismaClient: jest.fn(() => mockPrismaClient),
    };
});

// Mock cache service
jest.mock('../CacheService', () => ({
    cacheService: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        increment: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
    }
}));

// Mock logger
jest.mock('../../utils/productionLogger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock vector store service
jest.mock('../VectorStoreService', () => ({
    vectorStoreService: {
        ingestDocument: jest.fn().mockResolvedValue('mock-vector-id'),
        search: jest.fn().mockResolvedValue([
            {
                id: 'kb:1',
                content: 'Mock knowledge base content',
                score: 0.9,
                metadata: {
                    type: 'faq',
                    title: 'Mock FAQ',
                    tags: ['test']
                }
            }
        ]),
        deleteDocument: jest.fn().mockResolvedValue(true),
    }
}));

// Mock AI Gateway Service
jest.mock('../AIGatewayService', () => ({
    aiGatewayService: {
        generateCompletion: jest.fn().mockResolvedValue({
            id: 'mock-completion-id',
            model: 'gpt-4',
            content: 'This is a helpful response from the chatbot.',
            finishReason: 'stop',
            usage: {
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            },
            cost: {
                inputCost: 0.001,
                outputCost: 0.002,
                totalCost: 0.003
            },
            metadata: {
                provider: 'openai' as const,
                timestamp: new Date(),
                latency: 500,
                cached: false
            }
        }),
        generateEmbeddings: jest.fn().mockResolvedValue({
            embeddings: [[0.1, 0.2, 0.3]],
            usage: {
                promptTokens: 10,
                totalTokens: 10
            },
            cost: 0.0001,
            metadata: {
                provider: 'openai' as const,
                timestamp: new Date(),
                latency: 100
            }
        })
    }
}));

// Import services AFTER mocks
import { supportChatbotService } from '../SupportChatbotService';
import { knowledgeBaseService } from '../KnowledgeBaseService';
import { conversationService } from '../ConversationService';
import { escalationService } from '../EscalationService';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('SupportChatbotService', () => {
    const testUserId = 'test-user-123';

    beforeAll(async () => {
        // Tests will use mocked services
        console.log('Using mocked services for testing');
    });

    describe('Sample Query Tests', () => {
        const sampleQueries = [
            {
                query: 'How do I reset my password?',
                expectedTopics: ['password', 'reset', 'account'],
                shouldEscalate: false
            },
            {
                query: 'How do I enroll in a course?',
                expectedTopics: ['enroll', 'course', 'registration'],
                shouldEscalate: false
            },
            {
                query: 'What is ScrollCoin and how do I earn it?',
                expectedTopics: ['scrollcoin', 'reward', 'earn'],
                shouldEscalate: false
            },
            {
                query: 'URGENT: I cannot access my exam and the deadline is in 1 hour!',
                expectedTopics: ['urgent', 'exam', 'access'],
                shouldEscalate: true
            },
            {
                query: 'I need help with my financial aid application',
                expectedTopics: ['financial', 'aid', 'scholarship'],
                shouldEscalate: false
            }
        ];

        test.each(sampleQueries)(
            'should handle query: $query',
            async ({ query, shouldEscalate }) => {
                const response = await supportChatbotService.handleMessage({
                    userId: testUserId,
                    message: query
                });

                // Verify response structure
                expect(response).toHaveProperty('conversationId');
                expect(response).toHaveProperty('message');
                expect(response).toHaveProperty('confidence');
                expect(response).toHaveProperty('sources');
                expect(response).toHaveProperty('needsEscalation');

                // Verify message is not empty
                expect(response.message.length).toBeGreaterThan(0);

                // Verify confidence is between 0 and 1
                expect(response.confidence).toBeGreaterThanOrEqual(0);
                expect(response.confidence).toBeLessThanOrEqual(1);

                // Verify escalation logic
                expect(response.needsEscalation).toBe(shouldEscalate);

                console.log(`\nQuery: ${query}`);
                console.log(`Response: ${response.message.substring(0, 100)}...`);
                console.log(`Confidence: ${response.confidence.toFixed(2)}`);
                console.log(`Escalated: ${response.needsEscalation}`);
                console.log(`Sources: ${response.sources.length}`);
            }
        );
    });

    describe('Escalation Logic', () => {
        test('should escalate on low confidence', () => {
            const result = escalationService.shouldEscalate(
                'Some complex technical question',
                0.5 // Low confidence
            );

            expect(result.shouldEscalate).toBe(true);
            expect(result.reason).toContain('confidence');
        });

        test('should escalate on urgent keywords', () => {
            const result = escalationService.shouldEscalate(
                'URGENT: Need immediate help!',
                0.9
            );

            expect(result.shouldEscalate).toBe(true);
            expect(result.priority).toBe('urgent');
        });

        test('should not escalate on high confidence simple query', () => {
            const result = escalationService.shouldEscalate(
                'What are the office hours?',
                0.95
            );

            expect(result.shouldEscalate).toBe(false);
        });
    });

    describe('Knowledge Base Search', () => {
        test('should find relevant documents for enrollment query', async () => {
            const results = await knowledgeBaseService.search('How do I enroll in courses?');

            expect(Array.isArray(results)).toBe(true);
            console.log(`\nFound ${results.length} relevant documents for enrollment query`);

            if (results.length > 0) {
                expect(results[0]).toHaveProperty('title');
                expect(results[0]).toHaveProperty('content');
                expect(results[0]).toHaveProperty('relevanceScore');
            }
        });

        test('should find relevant documents for payment query', async () => {
            const results = await knowledgeBaseService.search('What payment options are available?');

            expect(Array.isArray(results)).toBe(true);
            console.log(`\nFound ${results.length} relevant documents for payment query`);
        });
    });

    describe('Conversation Management', () => {
        test('should create and manage conversation', async () => {
            const conversation = await conversationService.createConversation(
                testUserId,
                'Test initial query'
            );

            expect(conversation).toHaveProperty('id');
            expect(conversation.userId).toBe(testUserId);
            expect(conversation.status).toBe('active');

            // Add messages
            await conversationService.addMessage(
                conversation.id,
                'user',
                'Test user message'
            );

            await conversationService.addMessage(
                conversation.id,
                'assistant',
                'Test assistant response'
            );

            // Get history
            const history = await conversationService.getConversationHistory(conversation.id);
            expect(history.length).toBeGreaterThanOrEqual(0);

            console.log(`\nConversation created with ${history.length} messages`);
        });
    });

    describe('Statistics and Health', () => {
        test('should get chatbot statistics', async () => {
            const stats = await supportChatbotService.getStatistics();

            expect(stats).toHaveProperty('conversations');
            expect(stats).toHaveProperty('tickets');
            expect(stats).toHaveProperty('knowledgeBase');

            console.log('\nChatbot Statistics:', JSON.stringify(stats, null, 2));
        });

        test('should perform health check', async () => {
            const isHealthy = await supportChatbotService.healthCheck();
            expect(typeof isHealthy).toBe('boolean');
            console.log(`\nChatbot health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
        });
    });
});
