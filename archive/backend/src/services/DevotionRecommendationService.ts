/**
 * Devotion Recommendation Service
 * Provides personalized devotion recommendations
 */

import AIGatewayService from './AIGatewayService';
import VectorStoreService from './VectorStoreService';
import {
  DailyDevotion,
  DevotionRecommendation,
  DevotionPreferences,
  DevotionAnalytics
} from '../types/devotion.types';

export default class DevotionRecommendationService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  constructor(
    aiGateway?: AIGatewayService,
    vectorStore?: VectorStoreService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.vectorStore = vectorStore || new VectorStoreService();
  }

  /**
   * Get personalized devotion recommendations
   */
  async getRecommendations(
    userId: string,
    preferences: DevotionPreferences,
    analytics: DevotionAnalytics,
    limit: number = 5
  ): Promise<DevotionRecommendation[]> {
    try {
      // Build recommendation context
      const context = this.buildRecommendationContext(preferences, analytics);

      // Get AI recommendations
      const prompt = this.buildRecommendationPrompt(context);

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: `You are a spiritual formation advisor recommending daily devotions.
            Consider the user's spiritual journey, preferences, and growth areas.
            Recommend devotions that will challenge, encourage, and guide them.
            Provide specific reasons for each recommendation.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1500
      });

      // Parse recommendations
      const recommendations = this.parseRecommendations(response.content);

      // Enhance with vector search
      const enhancedRecommendations = await this.enhanceWithVectorSearch(
        recommendations,
        preferences.topics
      );

      return enhancedRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error('Failed to get devotion recommendations');
    }
  }

  /**
   * Get recommendations based on current spiritual state
   */
  async getContextualRecommendations(
    userId: string,
    currentMood: string,
    recentStruggles: string[],
    limit: number = 3
  ): Promise<DevotionRecommendation[]> {
    try {
      const prompt = `Recommend devotions for someone who is currently feeling ${currentMood} and dealing with: ${recentStruggles.join(', ')}.

Provide devotions that will:
1. Address their current emotional/spiritual state
2. Provide biblical encouragement
3. Offer practical guidance
4. Build hope and faith

Format as JSON array with devotionId, score, reason, and relevantTo fields.`;

      const response = await this.aiGateway.chat({
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate spiritual advisor recommending devotions for specific needs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1000
      });

      const recommendations = this.parseRecommendations(response.content);
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      throw new Error('Failed to get contextual recommendations');
    }
  }

  /**
   * Get recommendations for specific topics
   */
  async getTopicRecommendations(
    topics: string[],
    difficulty?: 'beginner' | 'intermediate' | 'advanced',
    limit: number = 5
  ): Promise<DevotionRecommendation[]> {
    try {
      // Search vector store for relevant devotions
      const searchResults = await Promise.all(
        topics.map(topic => 
          this.vectorStore.search(`devotion about ${topic}`, 'devotion', 5)
        )
      );

      // Flatten and deduplicate results
      const allResults = searchResults.flat();
      const uniqueResults = this.deduplicateResults(allResults);

      // Convert to recommendations
      const recommendations: DevotionRecommendation[] = uniqueResults.map(result => ({
        devotionId: result.id,
        score: result.score || 0.8,
        reason: `Relevant to topics: ${topics.join(', ')}`,
        relevantTo: topics
      }));

      // Filter by difficulty if specified
      const filtered = difficulty
        ? recommendations.filter(r => this.matchesDifficulty(r.devotionId, difficulty))
        : recommendations;

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error getting topic recommendations:', error);
      throw new Error('Failed to get topic recommendations');
    }
  }

  /**
   * Get recommendations based on reading history
   */
  async getHistoryBasedRecommendations(
    userId: string,
    completedDevotions: string[],
    limit: number = 5
  ): Promise<DevotionRecommendation[]> {
    try {
      // Analyze completed devotions to find patterns
      const patterns = await this.analyzeReadingPatterns(completedDevotions);

      // Find similar devotions
      const recommendations = await this.findSimilarDevotions(
        completedDevotions,
        patterns,
        limit
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting history-based recommendations:', error);
      throw new Error('Failed to get history-based recommendations');
    }
  }

  /**
   * Get trending devotions
   */
  async getTrendingDevotions(limit: number = 5): Promise<DevotionRecommendation[]> {
    try {
      // In a real implementation, this would query analytics data
      // For now, return placeholder recommendations
      const trending: DevotionRecommendation[] = [
        {
          devotionId: 'devotion_trending_1',
          score: 0.95,
          reason: 'Most completed devotion this week',
          relevantTo: ['popular', 'trending']
        },
        {
          devotionId: 'devotion_trending_2',
          score: 0.90,
          reason: 'Highest rated devotion this month',
          relevantTo: ['popular', 'highly-rated']
        }
      ];

      return trending.slice(0, limit);
    } catch (error) {
      console.error('Error getting trending devotions:', error);
      throw new Error('Failed to get trending devotions');
    }
  }

  /**
   * Get seasonal/liturgical recommendations
   */
  async getSeasonalRecommendations(
    season?: string,
    limit: number = 5
  ): Promise<DevotionRecommendation[]> {
    try {
      // Determine current season if not provided
      const currentSeason = season || this.getCurrentLiturgicalSeason();

      // Get devotions appropriate for the season
      const seasonalTopics = this.getSeasonalTopics(currentSeason);
      
      return await this.getTopicRecommendations(seasonalTopics, undefined, limit);
    } catch (error) {
      console.error('Error getting seasonal recommendations:', error);
      throw new Error('Failed to get seasonal recommendations');
    }
  }

  // Helper methods

  private buildRecommendationContext(
    preferences: DevotionPreferences,
    analytics: DevotionAnalytics
  ): any {
    return {
      topics: preferences.topics,
      difficulty: preferences.difficulty,
      favoriteTopics: analytics.favoriteTopics,
      completionRate: analytics.completionRate,
      engagementTrend: analytics.engagementTrend,
      currentStreak: analytics.streakData.currentStreak
    };
  }

  private buildRecommendationPrompt(context: any): string {
    return `Recommend daily devotions for a user with the following profile:

Preferred Topics: ${context.topics.join(', ')}
Difficulty Level: ${context.difficulty}
Favorite Topics: ${context.favoriteTopics.join(', ')}
Completion Rate: ${context.completionRate}%
Engagement Trend: ${context.engagementTrend}
Current Streak: ${context.currentStreak} days

Provide 5-7 devotion recommendations that will:
1. Align with their interests and spiritual maturity
2. Challenge them appropriately
3. Support their spiritual growth
4. Maintain their engagement

Format as JSON array with devotionId, score (0-1), reason, and relevantTo fields.`;
  }

  private parseRecommendations(content: string): DevotionRecommendation[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      return parsed.map((item: any) => ({
        devotionId: item.devotionId || `devotion_${Date.now()}`,
        score: item.score || 0.8,
        reason: item.reason || 'Recommended for you',
        relevantTo: item.relevantTo || []
      }));
    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return [];
    }
  }

  private async enhanceWithVectorSearch(
    recommendations: DevotionRecommendation[],
    topics: string[]
  ): Promise<DevotionRecommendation[]> {
    try {
      // Search for additional relevant devotions
      const searchResults = await this.vectorStore.search(
        topics.join(' '),
        'devotion',
        10
      );

      // Merge with existing recommendations
      const enhanced = [...recommendations];

      for (const result of searchResults) {
        if (!enhanced.find(r => r.devotionId === result.id)) {
          enhanced.push({
            devotionId: result.id,
            score: result.score || 0.7,
            reason: 'Relevant to your interests',
            relevantTo: topics
          });
        }
      }

      // Sort by score
      return enhanced.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error enhancing with vector search:', error);
      return recommendations;
    }
  }

  private deduplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    });
  }

  private matchesDifficulty(devotionId: string, difficulty: string): boolean {
    // In a real implementation, check devotion difficulty from database
    return true;
  }

  private async analyzeReadingPatterns(completedDevotions: string[]): Promise<any> {
    try {
      // Analyze patterns in completed devotions
      return {
        commonTopics: [],
        preferredDifficulty: 'intermediate',
        readingFrequency: 'daily'
      };
    } catch (error) {
      console.error('Error analyzing reading patterns:', error);
      return {};
    }
  }

  private async findSimilarDevotions(
    completedDevotions: string[],
    patterns: any,
    limit: number
  ): Promise<DevotionRecommendation[]> {
    try {
      // Find devotions similar to completed ones
      // In a real implementation, use vector similarity search
      return [];
    } catch (error) {
      console.error('Error finding similar devotions:', error);
      return [];
    }
  }

  private getCurrentLiturgicalSeason(): string {
    // Determine current liturgical season based on date
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Simplified liturgical calendar
    if (month === 12 && day >= 1 && day <= 25) return 'advent';
    if (month === 12 && day > 25 || month === 1 && day <= 6) return 'christmas';
    if (month >= 2 && month <= 3) return 'lent';
    if (month === 4) return 'easter';
    
    return 'ordinary';
  }

  private getSeasonalTopics(season: string): string[] {
    const seasonalTopics: Record<string, string[]> = {
      'advent': ['hope', 'preparation', 'waiting', 'prophecy'],
      'christmas': ['incarnation', 'joy', 'celebration', 'emmanuel'],
      'lent': ['repentance', 'sacrifice', 'fasting', 'reflection'],
      'easter': ['resurrection', 'new life', 'victory', 'hope'],
      'ordinary': ['discipleship', 'growth', 'service', 'faith']
    };

    return seasonalTopics[season] || seasonalTopics['ordinary'];
  }
}
