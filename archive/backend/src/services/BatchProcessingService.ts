/**
 * Batch Processing Service
 * Batches similar AI requests together to optimize throughput and reduce costs
 */

import {
  BatchRequest,
  BatchResult
} from '../types/cost-optimization.types';
import logger from '../utils/logger';
import { AIGatewayService } from './AIGatewayService';

interface QueuedRequest {
  id: string;
  service: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export default class BatchProcessingService {
  private queue: QueuedRequest[] = [];
  private processing: boolean = false;
  private aiGateway: AIGatewayService;
  private batchSize: number = 10;
  private batchTimeout: number = 5000; // 5 seconds
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.startProcessingInterval();
  }

  /**
   * Add request to batch queue
   */
  async addToBatch(
    service: string,
    data: any,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateId(),
        service,
        data,
        priority,
        timestamp: new Date(),
        resolve,
        reject
      };

      this.queue.push(request);
      logger.debug(`Added request to batch queue: ${request.id}`);

      // Process immediately if high priority or queue is full
      if (priority === 'high' || this.queue.length >= this.batchSize) {
        this.processBatches();
      }
    });
  }

  /**
   * Process batched requests
   */
  private async processBatches(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      // Group requests by service
      const batches = this.groupByService();

      // Process each batch
      for (const [service, requests] of batches.entries()) {
        await this.processBatch(service, requests);
      }
    } catch (error) {
      logger.error('Error processing batches:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Group requests by service
   */
  private groupByService(): Map<string, QueuedRequest[]> {
    const batches = new Map<string, QueuedRequest[]>();

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const request of this.queue) {
      const batch = batches.get(request.service) || [];
      batch.push(request);
      batches.set(request.service, batch);
    }

    return batches;
  }

  /**
   * Process a single batch
   */
  private async processBatch(
    service: string,
    requests: QueuedRequest[]
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const batchId = this.generateId();

      logger.info(`Processing batch ${batchId} for ${service} with ${requests.length} requests`);

      // Process based on service type
      let results: any[];
      switch (service) {
        case 'grading':
          results = await this.batchGrading(requests);
          break;
        case 'content-creation':
          results = await this.batchContentCreation(requests);
          break;
        case 'translation':
          results = await this.batchTranslation(requests);
          break;
        default:
          results = await this.batchGeneric(requests);
      }

      // Resolve individual requests
      for (let i = 0; i < requests.length; i++) {
        requests[i].resolve(results[i]);
      }

      // Remove processed requests from queue
      this.queue = this.queue.filter(
        (r) => !requests.find((req) => req.id === r.id)
      );

      const processingTime = Date.now() - startTime;
      logger.info(`Batch ${batchId} completed in ${processingTime}ms`);
    } catch (error) {
      logger.error(`Error processing batch for ${service}:`, error);

      // Reject all requests in batch
      for (const request of requests) {
        request.reject(error);
      }
    }
  }

  /**
   * Batch grading requests
   */
  private async batchGrading(requests: QueuedRequest[]): Promise<any[]> {
    try {
      // Combine all submissions into single prompt
      const submissions = requests.map((r) => r.data);
      const batchPrompt = this.createBatchGradingPrompt(submissions);

      const response = await this.aiGateway.generateCompletion({
        prompt: batchPrompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 4000
      });

      // Parse batch response
      return this.parseBatchGradingResponse(response.content, requests.length);
    } catch (error) {
      logger.error('Error in batch grading:', error);
      throw error;
    }
  }

  /**
   * Create batch grading prompt
   */
  private createBatchGradingPrompt(submissions: any[]): string {
    let prompt = 'Grade the following submissions. Return results as JSON array.\n\n';

    submissions.forEach((sub, index) => {
      prompt += `Submission ${index + 1}:\n`;
      prompt += `Type: ${sub.type}\n`;
      prompt += `Content: ${sub.content}\n`;
      prompt += `Rubric: ${JSON.stringify(sub.rubric)}\n\n`;
    });

    prompt += 'Return format: [{"score": number, "feedback": string}, ...]';
    return prompt;
  }

  /**
   * Parse batch grading response
   */
  private parseBatchGradingResponse(response: string, count: number): any[] {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length === count) {
        return parsed;
      }
      throw new Error('Invalid batch response format');
    } catch (error) {
      logger.error('Error parsing batch response:', error);
      // Return default responses
      return Array(count).fill({ score: 0, feedback: 'Error processing' });
    }
  }

  /**
   * Batch content creation requests
   */
  private async batchContentCreation(requests: QueuedRequest[]): Promise<any[]> {
    try {
      const topics = requests.map((r) => r.data.topic);
      const batchPrompt = this.createBatchContentPrompt(topics);

      const response = await this.aiGateway.generateCompletion({
        prompt: batchPrompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 8000
      });

      return this.parseBatchContentResponse(response.content, requests.length);
    } catch (error) {
      logger.error('Error in batch content creation:', error);
      throw error;
    }
  }

  /**
   * Create batch content prompt
   */
  private createBatchContentPrompt(topics: string[]): string {
    let prompt = 'Create brief content for the following topics. Return as JSON array.\n\n';

    topics.forEach((topic, index) => {
      prompt += `${index + 1}. ${topic}\n`;
    });

    prompt += '\nReturn format: [{"title": string, "content": string}, ...]';
    return prompt;
  }

  /**
   * Parse batch content response
   */
  private parseBatchContentResponse(response: string, count: number): any[] {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length === count) {
        return parsed;
      }
      throw new Error('Invalid batch response format');
    } catch (error) {
      logger.error('Error parsing batch response:', error);
      return Array(count).fill({ title: '', content: 'Error processing' });
    }
  }

  /**
   * Batch translation requests
   */
  private async batchTranslation(requests: QueuedRequest[]): Promise<any[]> {
    try {
      const texts = requests.map((r) => r.data.text);
      const targetLang = requests[0].data.targetLanguage;

      const batchPrompt = this.createBatchTranslationPrompt(texts, targetLang);

      const response = await this.aiGateway.generateCompletion({
        prompt: batchPrompt,
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 6000
      });

      return this.parseBatchTranslationResponse(response.content, requests.length);
    } catch (error) {
      logger.error('Error in batch translation:', error);
      throw error;
    }
  }

  /**
   * Create batch translation prompt
   */
  private createBatchTranslationPrompt(texts: string[], targetLang: string): string {
    let prompt = `Translate the following texts to ${targetLang}. Return as JSON array.\n\n`;

    texts.forEach((text, index) => {
      prompt += `${index + 1}. ${text}\n`;
    });

    prompt += '\nReturn format: ["translation1", "translation2", ...]';
    return prompt;
  }

  /**
   * Parse batch translation response
   */
  private parseBatchTranslationResponse(response: string, count: number): any[] {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length === count) {
        return parsed.map((text) => ({ translatedText: text }));
      }
      throw new Error('Invalid batch response format');
    } catch (error) {
      logger.error('Error parsing batch response:', error);
      return Array(count).fill({ translatedText: 'Error processing' });
    }
  }

  /**
   * Generic batch processing
   */
  private async batchGeneric(requests: QueuedRequest[]): Promise<any[]> {
    // Process individually for services without batch optimization
    const results: any[] = [];

    for (const request of requests) {
      try {
        const result = await this.aiGateway.generateCompletion({
          prompt: request.data.prompt || JSON.stringify(request.data),
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        });
        results.push(result);
      } catch (error) {
        logger.error(`Error processing request ${request.id}:`, error);
        results.push({ error: 'Processing failed' });
      }
    }

    return results;
  }

  /**
   * Start processing interval
   */
  private startProcessingInterval(): void {
    this.processingInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.processBatches();
      }
    }, this.batchTimeout);
  }

  /**
   * Stop processing interval
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    queueLength: number;
    byService: Record<string, number>;
    byPriority: Record<string, number>;
    oldestRequest: Date | null;
  }> {
    const byService: Record<string, number> = {};
    const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 };
    let oldestRequest: Date | null = null;

    for (const request of this.queue) {
      byService[request.service] = (byService[request.service] || 0) + 1;
      byPriority[request.priority]++;

      if (!oldestRequest || request.timestamp < oldestRequest) {
        oldestRequest = request.timestamp;
      }
    }

    return {
      queueLength: this.queue.length,
      byService,
      byPriority,
      oldestRequest
    };
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    // Reject all pending requests
    for (const request of this.queue) {
      request.reject(new Error('Queue cleared'));
    }

    this.queue = [];
    logger.info('Batch queue cleared');
  }
}
