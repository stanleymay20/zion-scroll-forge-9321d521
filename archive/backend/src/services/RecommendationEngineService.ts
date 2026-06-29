/**
 * Recommendation Engine Service
 * "I will instruct you and teach you in the way you should go" - Psalm 32:8
 * 
 * Generates personalized resource recommendations based on student weaknesses and learning profile
 */

import { PrismaClient } from '@prisma/client';
import {
  ResourceRecommendation,
  ResourceType,
  RecommendResourcesRequest,
  RecommendResourcesResponse,
  LearningProfile
} from '../types/personalization.types';
import { AIGatewayService } from './AIGatewayService';
import { VectorStoreService } from './VectorStoreService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ResourceCandidate {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  topics: string[];
  spiritualAlignment: number;
  url?: string;
}

export default class RecommendationEngineService {
  private aiGateway: AIGatewayService;
  private vectorStore: VectorStoreService;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Generate personalized resource recommendations
   */
  async recommendResources(request: RecommendResourcesRequest): Promise<RecommendResourcesResponse> {
    try {
      logger.info('Generating resource recommendations', {
        studentId: request.studentId,
        topic: request.topic
      });

      // Get student's learning profile
      const profile = await this.getStudentProfile(request.studentId);

      // Find relevant resources
      const candidates = await this.findResourceCandidates(
        request.topic,
        request.weaknessArea,
        profile
      );

      // Score and rank resources
      const scoredResources = await this.scoreResources(
        candidates,
        profile,
        request.weaknessArea
      );

      // Generate recommendations with reasoning
      const recommendations = await this.generateRecommendations(
        scoredResources,
        profile,
        request.maxRecommendations || 10
      );

      // Generate overall reasoning
      const reasoning = await this.generateRecommendationReasoning(
        recommendations,
        profile,
        request.topic
      );

      logger.info('Resource recommendations generated', {
        studentId: request.studentId,
        count: recommendations.length
      });

      return {
        success: true,
        recommendations,
        reasoning
      };
    } catch (error) {
      logger.error('Error generating resource recommendations', { error, request });
      return {
        success: false,
        recommendations: [],
        reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Suggest practice problems based on weaknesses
   */
  async suggestPracticeProblems(
    studentId: string,
    weaknessArea: string,
    count: number = 5
  ): Promise<ResourceRecommendation[]> {
    const profile = await this.getStudentProfile(studentId);
    
    // Find practice problems
    const candidates = await this.findResourceCandidates(
      weaknessArea,
      weaknessArea,
      profile,
      'practice_problem'
    );

    // Score based on difficulty match
    const scoredProblems = await this.scoreResources(candidates, profile, weaknessArea);

    // Adapt difficulty based on performance
    const adaptedProblems = this.adaptDifficultyBasedOnPerformance(
      scoredProblems,
      profile
    );

    return adaptedProblems.slice(0, count);
  }

  /**
   * Recommend study strategies
   */
  async recommendStudyStrategies(
    studentId: string,
    weaknessArea?: string
  ): Promise<string[]> {
    const profile = await this.getStudentProfile(studentId);

    const strategies: string[] = [];

    // Learning style-based strategies
    strategies.push(...this.getStrategiesForLearningStyle(profile.learningStyle));

    // Pace-based strategies
    strategies.push(...this.getStrategiesForPace(profile.pace));

    // Risk-based strategies
    if (profile.riskLevel === 'high' || profile.riskLevel === 'critical') {
      strategies.push(...this.getStrategiesForAtRiskStudents());
    }

    // Weakness-specific strategies
    if (weaknessArea) {
      strategies.push(...await this.getStrategiesForWeakness(weaknessArea, profile));
    }

    // Use AI to personalize and refine strategies
    const personalizedStrategies = await this.personalizeStrategies(
      strategies,
      profile
    );

    return personalizedStrategies.slice(0, 10);
  }

  /**
   * Get student learning profile
   */
  private async getStudentProfile(studentId: string): Promise<LearningProfile> {
    // Try to get cached profile from database
    const cachedProfile = await prisma.learningProfile.findUnique({
      where: { studentId }
    });

    if (cachedProfile && this.isProfileRecent(cachedProfile.lastAnalyzed)) {
      return this.parseLearningProfile(cachedProfile);
    }

    // If no recent profile, return default
    return this.getDefaultProfile(studentId);
  }

  /**
   * Find resource candidates
   */
  private async findResourceCandidates(
    topic: string,
    weaknessArea: string | undefined,
    profile: LearningProfile,
    resourceType?: ResourceType
  ): Promise<ResourceCandidate[]> {
    const candidates: ResourceCandidate[] = [];

    // Search vector store for relevant resources
    const searchQuery = weaknessArea || topic;
    const vectorResults = await this.vectorStore.search(searchQuery, {
      limit: 50,
      filter: { type: 'resource' }
    });

    // Convert vector results to candidates
    for (const result of vectorResults) {
      if (resourceType && result.metadata.resourceType !== resourceType) {
        continue;
      }

      candidates.push({
        id: result.id,
        title: result.metadata.title || 'Untitled Resource',
        description: result.content,
        type: result.metadata.resourceType || 'supplementary_content',
        difficulty: result.metadata.difficulty || 'intermediate',
        estimatedTime: result.metadata.estimatedTime || 30,
        topics: result.metadata.topics || [topic],
        spiritualAlignment: result.metadata.spiritualAlignment || 50,
        url: result.metadata.url
      });
    }

    // Also search course materials
    const courseMaterials = await this.findCourseMaterials(topic, profile);
    candidates.push(...courseMaterials);

    // Add AI-generated practice problems if needed
    if (resourceType === 'practice_problem' && candidates.length < 10) {
      const generatedProblems = await this.generatePracticeProblems(
        topic,
        weaknessArea || topic,
        profile
      );
      candidates.push(...generatedProblems);
    }

    return candidates;
  }

  /**
   * Find course materials
   */
  private async findCourseMaterials(
    topic: string,
    profile: LearningProfile
  ): Promise<ResourceCandidate[]> {
    const materials: ResourceCandidate[] = [];

    // Get student's current courses
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: profile.studentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lectures: true
              }
            }
          }
        }
      }
    });

    // Extract relevant lectures and materials
    for (const enrollment of enrollments) {
      for (const module of enrollment.course.modules) {
        for (const lecture of module.lectures) {
          // Check if lecture is relevant to topic
          if (this.isRelevantToTopic(lecture.title, lecture.content, topic)) {
            materials.push({
              id: lecture.id,
              title: lecture.title,
              description: lecture.content.substring(0, 200),
              type: 'video_lecture',
              difficulty: this.inferDifficulty(lecture.content),
              estimatedTime: lecture.duration || 30,
              topics: [topic],
              spiritualAlignment: lecture.scrollAlignment || 50,
              url: lecture.videoUrl || undefined
            });
          }
        }
      }
    }

    return materials;
  }

  /**
   * Score resources based on relevance and student profile
   */
  private async scoreResources(
    candidates: ResourceCandidate[],
    profile: LearningProfile,
    weaknessArea?: string
  ): Promise<ResourceRecommendation[]> {
    const recommendations: ResourceRecommendation[] = [];

    for (const candidate of candidates) {
      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(
        candidate,
        profile,
        weaknessArea
      );

      // Calculate difficulty match
      const difficultyMatch = this.calculateDifficultyMatch(
        candidate.difficulty,
        profile
      );

      // Calculate learning style match
      const styleMatch = this.calculateLearningStyleMatch(
        candidate.type,
        profile.learningStyle
      );

      // Calculate spiritual alignment match
      const spiritualMatch = Math.abs(
        candidate.spiritualAlignment - profile.spiritualGrowth.scrollAlignment
      ) <= 20 ? 100 : 50;

      // Overall score (weighted average)
      const overallScore = 
        relevanceScore * 0.4 +
        difficultyMatch * 0.25 +
        styleMatch * 0.25 +
        spiritualMatch * 0.1;

      // Generate reasoning
      const reasoning = this.generateResourceReasoning(
        candidate,
        profile,
        weaknessArea,
        overallScore
      );

      recommendations.push({
        resourceId: candidate.id,
        resourceType: candidate.type,
        title: candidate.title,
        description: candidate.description,
        url: candidate.url,
        relevanceScore: Math.round(overallScore),
        difficulty: candidate.difficulty,
        estimatedTime: candidate.estimatedTime,
        reasoning,
        targetWeakness: weaknessArea,
        spiritualAlignment: candidate.spiritualAlignment
      });
    }

    // Sort by relevance score
    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generate final recommendations with AI enhancement
   */
  private async generateRecommendations(
    scoredResources: ResourceRecommendation[],
    profile: LearningProfile,
    maxCount: number
  ): Promise<ResourceRecommendation[]> {
    // Take top candidates
    const topCandidates = scoredResources.slice(0, maxCount * 2);

    // Use AI to refine and personalize
    const prompt = `Given a student with the following profile:
- Learning Style: ${profile.learningStyle}
- Pace: ${profile.pace}
- Risk Level: ${profile.riskLevel}
- Strengths: ${profile.strengths.join(', ')}
- Weaknesses: ${profile.weaknesses.join(', ')}

Review these ${topCandidates.length} resource recommendations and select the top ${maxCount} most beneficial resources.
Consider learning style match, difficulty appropriateness, and spiritual alignment.

Resources:
${topCandidates.map((r, i) => `${i + 1}. ${r.title} (${r.resourceType}, ${r.difficulty}, score: ${r.relevanceScore})`).join('\n')}

Return only the indices of the top ${maxCount} resources (comma-separated numbers).`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 100,
        temperature: 0.3
      });

      // Parse AI response to get selected indices
      const selectedIndices = this.parseSelectedIndices(response.text, maxCount);
      
      return selectedIndices.map(i => topCandidates[i]).filter(Boolean);
    } catch (error) {
      logger.warn('AI refinement failed, using top scored resources', { error });
      return topCandidates.slice(0, maxCount);
    }
  }

  /**
   * Generate overall recommendation reasoning
   */
  private async generateRecommendationReasoning(
    recommendations: ResourceRecommendation[],
    profile: LearningProfile,
    topic: string
  ): Promise<string> {
    const prompt = `Generate a brief explanation (2-3 sentences) for why these ${recommendations.length} resources were recommended to a student studying "${topic}".

Student Profile:
- Learning Style: ${profile.learningStyle}
- Current Performance: ${profile.performanceMetrics.averageScore.toFixed(1)}%
- Risk Level: ${profile.riskLevel}
- Key Weaknesses: ${profile.weaknesses.slice(0, 3).join(', ')}

Recommended Resources:
${recommendations.slice(0, 5).map(r => `- ${r.title} (${r.resourceType})`).join('\n')}

Provide a personalized, encouraging explanation.`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 150,
        temperature: 0.7
      });

      return response.text.trim();
    } catch (error) {
      return `These resources were selected based on your learning style (${profile.learningStyle}) and current performance in ${topic}. They are designed to help you strengthen your understanding and build confidence.`;
    }
  }

  /**
   * Adapt difficulty based on performance
   */
  private adaptDifficultyBasedOnPerformance(
    resources: ResourceRecommendation[],
    profile: LearningProfile
  ): ResourceRecommendation[] {
    const targetDifficulty = this.getTargetDifficulty(profile);

    // Prioritize resources matching target difficulty
    return resources.sort((a, b) => {
      const aDiff = this.difficultyDistance(a.difficulty, targetDifficulty);
      const bDiff = this.difficultyDistance(b.difficulty, targetDifficulty);
      
      if (aDiff !== bDiff) {
        return aDiff - bDiff;
      }
      
      return b.relevanceScore - a.relevanceScore;
    });
  }

  /**
   * Get study strategies for learning style
   */
  private getStrategiesForLearningStyle(style: string): string[] {
    const strategies: Record<string, string[]> = {
      visual: [
        'Create mind maps and diagrams to visualize concepts',
        'Watch video lectures and use color-coded notes',
        'Use flashcards with images and diagrams'
      ],
      auditory: [
        'Listen to lecture recordings multiple times',
        'Discuss concepts with study partners',
        'Record yourself explaining concepts aloud'
      ],
      kinesthetic: [
        'Practice hands-on exercises and labs',
        'Take frequent breaks to stay engaged',
        'Use physical objects to model concepts'
      ],
      'reading-writing': [
        'Take detailed written notes during lectures',
        'Rewrite notes in your own words',
        'Create written summaries of each topic'
      ],
      multimodal: [
        'Combine multiple study methods for best results',
        'Alternate between reading, watching, and practicing',
        'Use varied resources to reinforce learning'
      ]
    };

    return strategies[style] || strategies.multimodal;
  }

  /**
   * Get study strategies for pace
   */
  private getStrategiesForPace(pace: string): string[] {
    const strategies: Record<string, string[]> = {
      fast: [
        'Challenge yourself with advanced materials',
        'Help peers to reinforce your understanding',
        'Explore topics beyond the curriculum'
      ],
      moderate: [
        'Maintain consistent study schedule',
        'Review material regularly to retain knowledge',
        'Balance depth and breadth in your learning'
      ],
      slow: [
        'Break complex topics into smaller chunks',
        'Allow extra time for practice and review',
        'Focus on mastery before moving forward'
      ]
    };

    return strategies[pace] || strategies.moderate;
  }

  /**
   * Get strategies for at-risk students
   */
  private getStrategiesForAtRiskStudents(): string[] {
    return [
      'Schedule regular check-ins with your advisor',
      'Attend all tutoring sessions and office hours',
      'Form or join a study group for accountability',
      'Break assignments into smaller, manageable tasks',
      'Seek help early when struggling with concepts'
    ];
  }

  /**
   * Get strategies for specific weakness
   */
  private async getStrategiesForWeakness(
    weakness: string,
    profile: LearningProfile
  ): Promise<string[]> {
    const prompt = `Suggest 3 specific study strategies for a student struggling with "${weakness}".
Consider their learning style: ${profile.learningStyle}
Keep strategies practical and actionable.`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 200,
        temperature: 0.7
      });

      return response.text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3);
    } catch (error) {
      return [
        `Review foundational concepts in ${weakness}`,
        `Practice additional problems related to ${weakness}`,
        `Seek tutoring support for ${weakness}`
      ];
    }
  }

  /**
   * Personalize strategies using AI
   */
  private async personalizeStrategies(
    strategies: string[],
    profile: LearningProfile
  ): Promise<string[]> {
    // Remove duplicates
    const uniqueStrategies = Array.from(new Set(strategies));

    // If we have a reasonable number, return as is
    if (uniqueStrategies.length <= 10) {
      return uniqueStrategies;
    }

    // Use AI to select most relevant strategies
    const prompt = `Given a student profile:
- Learning Style: ${profile.learningStyle}
- Pace: ${profile.pace}
- Risk Level: ${profile.riskLevel}

Select the 10 most relevant study strategies from this list:
${uniqueStrategies.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return only the indices (comma-separated numbers).`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 100,
        temperature: 0.3
      });

      const selectedIndices = this.parseSelectedIndices(response.text, 10);
      return selectedIndices.map(i => uniqueStrategies[i]).filter(Boolean);
    } catch (error) {
      return uniqueStrategies.slice(0, 10);
    }
  }

  /**
   * Generate practice problems using AI
   */
  private async generatePracticeProblems(
    topic: string,
    weaknessArea: string,
    profile: LearningProfile
  ): Promise<ResourceCandidate[]> {
    const difficulty = this.getTargetDifficulty(profile);
    
    const prompt = `Generate 5 practice problem titles for "${weaknessArea}" in the context of "${topic}".
Difficulty level: ${difficulty}
Format: One title per line, concise and clear.`;

    try {
      const response = await this.aiGateway.generateText({
        prompt,
        maxTokens: 300,
        temperature: 0.8
      });

      const titles = response.text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5);

      return titles.map((title, index) => ({
        id: `generated-problem-${Date.now()}-${index}`,
        title: title.replace(/^\d+\.\s*/, '').trim(),
        description: `Practice problem for ${weaknessArea}`,
        type: 'practice_problem' as ResourceType,
        difficulty,
        estimatedTime: 20,
        topics: [topic, weaknessArea],
        spiritualAlignment: 50
      }));
    } catch (error) {
      logger.warn('Failed to generate practice problems', { error });
      return [];
    }
  }

  /**
   * Helper methods
   */
  private isProfileRecent(lastAnalyzed: Date): boolean {
    const daysSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAnalysis < 7; // Profile is recent if less than 7 days old
  }

  private parseLearningProfile(dbProfile: any): LearningProfile {
    return {
      studentId: dbProfile.studentId,
      strengths: JSON.parse(dbProfile.strengths || '[]'),
      weaknesses: JSON.parse(dbProfile.weaknesses || '[]'),
      learningStyle: dbProfile.learningStyle,
      pace: dbProfile.pace,
      engagement: dbProfile.engagement,
      riskLevel: dbProfile.riskLevel,
      lastAnalyzed: dbProfile.lastAnalyzed,
      performanceMetrics: JSON.parse(dbProfile.performanceMetrics || '{}'),
      spiritualGrowth: JSON.parse(dbProfile.spiritualGrowth || '{}')
    };
  }

  private getDefaultProfile(studentId: string): LearningProfile {
    return {
      studentId,
      strengths: [],
      weaknesses: [],
      learningStyle: 'multimodal',
      pace: 'moderate',
      engagement: 50,
      riskLevel: 'low',
      lastAnalyzed: new Date(),
      performanceMetrics: {
        averageScore: 75,
        completionRate: 80,
        timeOnTask: 300,
        assignmentSubmissionRate: 85,
        quizPerformance: 75,
        projectQuality: 75,
        participationScore: 70,
        improvementTrend: 'stable'
      },
      spiritualGrowth: {
        scrollAlignment: 50,
        spiritualMaturity: 50,
        kingdomFocus: 50,
        characterDevelopment: 50
      }
    };
  }

  private isRelevantToTopic(title: string, content: string, topic: string): boolean {
    const searchText = `${title} ${content}`.toLowerCase();
    const topicLower = topic.toLowerCase();
    return searchText.includes(topicLower);
  }

  private inferDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' {
    // Simple heuristic based on content length and complexity
    if (content.length < 500) return 'beginner';
    if (content.length < 2000) return 'intermediate';
    return 'advanced';
  }

  private calculateRelevanceScore(
    candidate: ResourceCandidate,
    profile: LearningProfile,
    weaknessArea?: string
  ): number {
    let score = 70; // Base score

    // Check topic match
    if (weaknessArea && candidate.topics.some(t => 
      t.toLowerCase().includes(weaknessArea.toLowerCase())
    )) {
      score += 20;
    }

    // Check if addresses student weakness
    if (profile.weaknesses.some(w => 
      candidate.topics.some(t => t.toLowerCase().includes(w.toLowerCase()))
    )) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateDifficultyMatch(
    resourceDifficulty: string,
    profile: LearningProfile
  ): number {
    const targetDifficulty = this.getTargetDifficulty(profile);
    
    if (resourceDifficulty === targetDifficulty) return 100;
    
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    const resourceIndex = difficultyOrder.indexOf(resourceDifficulty);
    const targetIndex = difficultyOrder.indexOf(targetDifficulty);
    
    const distance = Math.abs(resourceIndex - targetIndex);
    return Math.max(100 - (distance * 30), 40);
  }

  private calculateLearningStyleMatch(
    resourceType: ResourceType,
    learningStyle: string
  ): number {
    const matches: Record<string, ResourceType[]> = {
      visual: ['video_lecture', 'interactive_exercise', 'case_study'],
      auditory: ['video_lecture', 'tutorial'],
      kinesthetic: ['interactive_exercise', 'practice_problem', 'case_study'],
      'reading-writing': ['reading_material', 'tutorial', 'supplementary_content'],
      multimodal: ['video_lecture', 'interactive_exercise', 'reading_material', 'practice_problem']
    };

    const preferredTypes = matches[learningStyle] || matches.multimodal;
    return preferredTypes.includes(resourceType) ? 100 : 60;
  }

  private getTargetDifficulty(profile: LearningProfile): 'beginner' | 'intermediate' | 'advanced' {
    if (profile.performanceMetrics.averageScore >= 85) return 'advanced';
    if (profile.performanceMetrics.averageScore >= 70) return 'intermediate';
    return 'beginner';
  }

  private difficultyDistance(
    difficulty: string,
    target: string
  ): number {
    const order = ['beginner', 'intermediate', 'advanced'];
    return Math.abs(order.indexOf(difficulty) - order.indexOf(target));
  }

  private generateResourceReasoning(
    candidate: ResourceCandidate,
    profile: LearningProfile,
    weaknessArea: string | undefined,
    score: number
  ): string {
    const reasons: string[] = [];

    if (weaknessArea && candidate.topics.some(t => 
      t.toLowerCase().includes(weaknessArea.toLowerCase())
    )) {
      reasons.push(`Directly addresses your weakness in ${weaknessArea}`);
    }

    const targetDiff = this.getTargetDifficulty(profile);
    if (candidate.difficulty === targetDiff) {
      reasons.push(`Matches your current skill level (${targetDiff})`);
    }

    if (this.calculateLearningStyleMatch(candidate.type, profile.learningStyle) === 100) {
      reasons.push(`Aligns with your ${profile.learningStyle} learning style`);
    }

    if (reasons.length === 0) {
      reasons.push('Relevant to your learning goals');
    }

    return reasons.join('. ') + '.';
  }

  private parseSelectedIndices(text: string, maxCount: number): number[] {
    // Extract numbers from AI response
    const numbers = text.match(/\d+/g);
    
    if (!numbers) {
      // Fallback: return sequential indices
      return Array.from({ length: maxCount }, (_, i) => i);
    }

    return numbers
      .map(n => parseInt(n) - 1) // Convert to 0-based index
      .filter(n => n >= 0)
      .slice(0, maxCount);
  }
}
