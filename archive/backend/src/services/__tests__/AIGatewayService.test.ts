/**
 * AIGatewayService Tests
 */

import { aiGatewayService } from '../AIGatewayService';
import { AIRequestOptions } from '../../types/ai.types';

describe('AIGatewayService', () => {
    describe('Token Counting', () => {
        it('should count tokens in text', () => {
            const text = 'Hello, world! This is a test.';
            const tokenCount = aiGatewayService.countTokens(text);
            
            expect(tokenCount).toBeGreaterThan(0);
            expect(typeof tokenCount).toBe('number');
        });

        it('should handle empty text', () => {
            const tokenCount = aiGatewayService.countTokens('');
            expect(tokenCount).toBe(0);
        });
    });

    describe('Health Check', () => {
        it('should check service health', async () => {
            const health = await aiGatewayService.checkHealth();
            
            expect(Array.isArray(health)).toBe(true);
            expect(health.length).toBeGreaterThan(0);
            
            health.forEach(service => {
                expect(service).toHaveProperty('provider');
                expect(service).toHaveProperty('status');
                expect(service).toHaveProperty('latency');
                expect(service).toHaveProperty('lastCheck');
            });
        });
    });

    describe('Budget Management', () => {
        it('should get budget usage', async () => {
            const usage = await aiGatewayService.getBudgetUsage('daily');
            
            expect(usage).toHaveProperty('period');
            expect(usage).toHaveProperty('totalCost');
            expect(usage).toHaveProperty('limit');
            expect(usage).toHaveProperty('percentUsed');
            expect(usage.period).toBe('daily');
        });
    });

    describe('Rate Limiting', () => {
        it('should get rate limit status', async () => {
            const status = await aiGatewayService.getRateLimitStatus();
            
            expect(status).toHaveProperty('requestsPerMinute');
            expect(status).toHaveProperty('tokensPerMinute');
            expect(status).toHaveProperty('requestsPerDay');
            
            expect(status.requestsPerMinute).toHaveProperty('current');
            expect(status.requestsPerMinute).toHaveProperty('limit');
            expect(status.requestsPerMinute).toHaveProperty('remaining');
        });
    });
});
