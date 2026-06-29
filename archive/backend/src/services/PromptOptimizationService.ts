/**
 * Prompt Optimization Service
 * Optimizes AI prompts for token efficiency while maintaining quality
 */

import {
  PromptOptimizationConfig,
  OptimizedPrompt,
  PromptTemplate,
  ABTestResult,
  PerformanceMetrics,
  OptimizationRecommendation
} from '../types/cost-optimization.types';
import logger from '../utils/logger';

export default class PromptOptimizationService {
  private templates: Map<string, PromptTemplate> = new Map();
  private abTestResults: Map<string, ABTestResult> = new Map();

  /**
   * Optimize a prompt for token efficiency
   */
  async optimizePrompt(
    prompt: string,
    config: PromptOptimizationConfig
  ): Promise<OptimizedPrompt> {
    try {
      let optimized = prompt;
      const techniques: string[] = [];
      const originalTokens = this.estimateTokens(prompt);

      // Remove redundant whitespace
      if (config.removeRedundancy) {
        optimized = this.removeRedundancy(optimized);
        techniques.push('redundancy_removal');
      }

      // Compress verbose instructions
      if (config.compressionEnabled) {
        optimized = this.compressInstructions(optimized);
        techniques.push('instruction_compression');
      }

      // Use system prompts for common instructions
      if (config.useSystemPrompts) {
        optimized = this.extractSystemPrompts(optimized);
        techniques.push('system_prompt_extraction');
      }

      const optimizedTokens = this.estimateTokens(optimized);
      const tokensSaved = originalTokens - optimizedTokens;
      const compressionRatio = optimizedTokens / originalTokens;

      return {
        original: prompt,
        optimized,
        tokensSaved,
        compressionRatio,
        estimatedCost: this.calculateCost(optimizedTokens),
        optimizationTechniques: techniques
      };
    } catch (error) {
      logger.error('Error optimizing prompt:', error);
      throw error;
    }
  }

  /**
   * Remove redundant whitespace and formatting
   */
  private removeRedundancy(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
      .trim();
  }

  /**
   * Compress verbose instructions to concise form
   */
  private compressInstructions(text: string): string {
    const compressionMap: Record<string, string> = {
      'Please provide': 'Provide',
      'I would like you to': '',
      'Can you please': '',
      'You should': '',
      'Make sure to': '',
      'It is important that': '',
      'Be sure to': '',
      'Remember to': ''
    };

    let compressed = text;
    for (const [verbose, concise] of Object.entries(compressionMap)) {
      compressed = compressed.replace(new RegExp(verbose, 'gi'), concise);
    }

    return compressed;
  }

  /**
   * Extract common instructions to system prompts
   */
  private extractSystemPrompts(text: string): string {
    // Common instructions that can be moved to system prompts
    const systemInstructions = [
      'You are a helpful assistant',
      'Maintain a professional tone',
      'Be concise and clear',
      'Use proper grammar'
    ];

    let extracted = text;
    for (const instruction of systemInstructions) {
      extracted = extracted.replace(new RegExp(instruction, 'gi'), '');
    }

    return extracted.trim();
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters or 0.75 words
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(Math.max(charCount / 4, wordCount / 0.75));
  }

  /**
   * Calculate estimated cost based on tokens
   */
  private calculateCost(tokens: number): number {
    // GPT-4 pricing: $0.03 per 1K input tokens, $0.06 per 1K output tokens
    // Assume 50/50 split for estimation
    const inputCost = (tokens / 1000) * 0.03;
    const outputCost = (tokens / 1000) * 0.06;
    return (inputCost + outputCost) / 2;
  }

  /**
   * Create a reusable prompt template
   */
  async createTemplate(template: PromptTemplate): Promise<void> {
    try {
      this.templates.set(template.id, template);
      logger.info(`Created prompt template: ${template.name}`);
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<PromptTemplate | undefined> {
    return this.templates.get(id);
  }

  /**
   * Fill template with variables
   */
  async fillTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<string> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      let filled = template.template;
      for (const [key, value] of Object.entries(variables)) {
        filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      return filled;
    } catch (error) {
      logger.error('Error filling template:', error);
      throw error;
    }
  }

  /**
   * Run A/B test on prompt variations
   */
  async runABTest(
    testId: string,
    variantA: string,
    variantB: string,
    sampleSize: number
  ): Promise<ABTestResult> {
    try {
      // In production, this would run actual tests
      // For now, simulate with estimates
      const metricsA: PerformanceMetrics = {
        averageTokens: this.estimateTokens(variantA),
        averageCost: this.calculateCost(this.estimateTokens(variantA)),
        averageQuality: 0.85,
        averageResponseTime: 2000,
        sampleSize
      };

      const metricsB: PerformanceMetrics = {
        averageTokens: this.estimateTokens(variantB),
        averageCost: this.calculateCost(this.estimateTokens(variantB)),
        averageQuality: 0.87,
        averageResponseTime: 1800,
        sampleSize
      };

      // Determine winner based on cost-quality tradeoff
      const scoreA = metricsA.averageQuality / metricsA.averageCost;
      const scoreB = metricsB.averageQuality / metricsB.averageCost;

      const result: ABTestResult = {
        variantA,
        variantB,
        variantAPerformance: metricsA,
        variantBPerformance: metricsB,
        winner: scoreB > scoreA * 1.05 ? 'B' : scoreA > scoreB * 1.05 ? 'A' : 'tie',
        confidence: Math.abs(scoreA - scoreB) / Math.max(scoreA, scoreB)
      };

      this.abTestResults.set(testId, result);
      logger.info(`A/B test completed: ${testId}, winner: ${result.winner}`);

      return result;
    } catch (error) {
      logger.error('Error running A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResult | undefined> {
    return this.abTestResults.get(testId);
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(
    service: string,
    currentPrompts: string[]
  ): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];

      for (const prompt of currentPrompts) {
        const optimized = await this.optimizePrompt(prompt, {
          maxTokens: 4000,
          temperature: 0.7,
          compressionEnabled: true,
          useSystemPrompts: true,
          removeRedundancy: true
        });

        if (optimized.tokensSaved > 100) {
          recommendations.push({
            type: 'prompt',
            service,
            currentCost: this.calculateCost(this.estimateTokens(prompt)),
            projectedSavings: this.calculateCost(optimized.tokensSaved),
            implementation: `Apply optimization techniques: ${optimized.optimizationTechniques.join(', ')}`,
            priority: optimized.tokensSaved > 500 ? 'high' : 'medium'
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Document best practices
   */
  async getBestPractices(): Promise<string[]> {
    return [
      'Use clear, concise language without unnecessary verbosity',
      'Remove redundant instructions and formatting',
      'Leverage system prompts for common instructions',
      'Use templates for repeated prompt patterns',
      'Test prompt variations with A/B testing',
      'Monitor token usage and optimize high-volume prompts',
      'Balance token efficiency with output quality',
      'Use specific examples instead of lengthy explanations',
      'Avoid repetition of context in multi-turn conversations',
      'Cache common prompt-response pairs'
    ];
  }
}
