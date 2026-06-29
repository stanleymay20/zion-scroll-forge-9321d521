/**
 * Mock Interview Service
 * AI-powered mock interview system with realistic questions and feedback
 */

import {
  InterviewSession,
  JobRole,
  InterviewQuestion,
  InterviewResponse,
  InterviewFeedback,
  QuestionFeedback,
  InterviewQuestionType,
  QuestionCategory,
} from '../types/career-services.types';
import AIGatewayService from './AIGatewayService';
import logger from '../utils/logger';

/**
 * MockInterviewService
 * Conducts AI-powered mock interviews with detailed feedback
 */
export class MockInterviewService {
  private aiGateway: AIGatewayService;
  private activeSessions: Map<string, InterviewSession>;

  constructor() {
    this.aiGateway = new AIGatewayService();
    this.activeSessions = new Map();
  }

  /**
   * Create new interview session
   */
  async createSession(
    studentId: string,
    role: JobRole,
    questionCount: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
  ): Promise<InterviewSession> {
    try {
      logger.info('Creating mock interview session', { studentId, role: role.title });

      // Generate interview questions
      const questions = await this.generateQuestions(role, questionCount, difficulty);

      const session: InterviewSession = {
        sessionId: `interview_${Date.now()}_${studentId}`,
        studentId,
        role,
        questions,
        responses: [],
        feedback: this.getEmptyFeedback(),
        startTime: new Date(),
        status: 'in_progress',
      };

      this.activeSessions.set(session.sessionId, session);

      logger.info('Mock interview session created', {
        sessionId: session.sessionId,
        questionCount: questions.length,
      });

      return session;
    } catch (error) {
      logger.error('Error creating interview session', { error, studentId });
      throw error;
    }
  }

  /**
   * Submit response to interview question
   */
  async submitResponse(
    sessionId: string,
    questionId: string,
    response: string,
    duration: number
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    const interviewResponse: InterviewResponse = {
      questionId,
      response,
      duration,
      timestamp: new Date(),
    };

    session.responses.push(interviewResponse);
    this.activeSessions.set(sessionId, session);

    logger.info('Interview response submitted', { sessionId, questionId });
  }

  /**
   * Complete interview and generate feedback
   */
  async completeInterview(sessionId: string): Promise<InterviewFeedback> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Interview session not found');
      }

      logger.info('Completing interview session', { sessionId });

      // Generate feedback for each question
      const questionFeedback = await this.generateQuestionFeedback(session);

      // Generate overall feedback
      const overallFeedback = await this.generateOverallFeedback(session, questionFeedback);

      session.feedback = overallFeedback;
      session.endTime = new Date();
      session.status = 'completed';

      this.activeSessions.set(sessionId, session);

      logger.info('Interview session completed', {
        sessionId,
        overallScore: overallFeedback.overallScore,
      });

      return overallFeedback;
    } catch (error) {
      logger.error('Error completing interview', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get interview session
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Generate interview questions based on role
   */
  private async generateQuestions(
    role: JobRole,
    count: number,
    difficulty: string
  ): Promise<InterviewQuestion[]> {
    const prompt = `Generate ${count} realistic interview questions for this role:

Role: ${role.title}
Level: ${role.level}
Industry: ${role.industry}
${role.company ? `Company: ${role.company}` : ''}

Description: ${role.description}

Create a mix of:
- Behavioral questions (STAR method)
- Technical/role-specific questions
- Situational questions
- Cultural fit questions
- Questions about spiritual/ministry alignment (for Christian workplace)

For each question provide:
1. Question text
2. Type (behavioral/technical/situational/cultural_fit/spiritual)
3. Category (leadership/problem_solving/teamwork/etc)
4. Difficulty (easy/medium/hard)
5. Expected elements in a good answer

${difficulty !== 'mixed' ? `Focus on ${difficulty} difficulty questions.` : 'Mix difficulty levels appropriately.'}

Return as JSON array of question objects.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are an experienced hiring manager creating realistic interview questions.',
      maxTokens: 2500,
      temperature: 0.8,
    });

    try {
      const questions = JSON.parse(response.content);
      return questions.map((q: any, index: number) => ({
        questionId: `q_${Date.now()}_${index}`,
        type: q.type as InterviewQuestionType,
        question: q.question,
        category: q.category as QuestionCategory,
        difficulty: q.difficulty || 'medium',
        expectedElements: q.expectedElements || [],
        timeLimit: this.getTimeLimit(q.type),
      }));
    } catch (error) {
      logger.error('Error parsing interview questions', { error });
      return this.getFallbackQuestions(role, count);
    }
  }

  /**
   * Generate feedback for each question response
   */
  private async generateQuestionFeedback(session: InterviewSession): Promise<QuestionFeedback[]> {
    const feedbackPromises = session.responses.map(async (response) => {
      const question = session.questions.find(q => q.questionId === response.questionId);
      if (!question) {
        return this.getDefaultQuestionFeedback(response.questionId);
      }

      return await this.evaluateResponse(question, response, session.role);
    });

    return Promise.all(feedbackPromises);
  }

  /**
   * Evaluate individual question response
   */
  private async evaluateResponse(
    question: InterviewQuestion,
    response: InterviewResponse,
    role: JobRole
  ): Promise<QuestionFeedback> {
    const prompt = `Evaluate this interview response:

Question: ${question.question}
Type: ${question.type}
Category: ${question.category}
Expected Elements: ${question.expectedElements.join(', ')}

Candidate Response:
${response.response}

Role Context: ${role.title} (${role.level} level)

Evaluate:
1. Overall score (0-100)
2. Strengths (what they did well)
3. Weaknesses (what could be improved)
4. Specific suggestions for improvement
5. Example of an ideal answer

Consider:
- STAR method for behavioral questions (Situation, Task, Action, Result)
- Technical accuracy for technical questions
- Communication clarity and confidence
- Relevance to the question
- Depth and specificity of examples

Return as JSON with score, strengths, weaknesses, suggestions, and idealAnswer.`;

    const aiResponse = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are an expert interview coach providing constructive, encouraging feedback.',
      maxTokens: 1000,
      temperature: 0.6,
    });

    try {
      const evaluation = JSON.parse(aiResponse.content);
      return {
        questionId: question.questionId,
        score: evaluation.score || 70,
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        suggestions: evaluation.suggestions || [],
        idealAnswer: evaluation.idealAnswer,
      };
    } catch (error) {
      logger.error('Error parsing question feedback', { error });
      return this.getDefaultQuestionFeedback(question.questionId);
    }
  }

  /**
   * Generate overall interview feedback
   */
  private async generateOverallFeedback(
    session: InterviewSession,
    questionFeedback: QuestionFeedback[]
  ): Promise<InterviewFeedback> {
    // Calculate scores
    const overallScore = Math.round(
      questionFeedback.reduce((sum, f) => sum + f.score, 0) / questionFeedback.length
    );

    // Categorize feedback by type
    const technicalQuestions = session.questions.filter(q => q.type === 'technical');
    const technicalFeedback = questionFeedback.filter(f =>
      technicalQuestions.some(q => q.questionId === f.questionId)
    );
    const technicalScore = technicalFeedback.length > 0
      ? Math.round(technicalFeedback.reduce((sum, f) => sum + f.score, 0) / technicalFeedback.length)
      : overallScore;

    const behavioralQuestions = session.questions.filter(q => q.type === 'behavioral');
    const behavioralFeedback = questionFeedback.filter(f =>
      behavioralQuestions.some(q => q.questionId === f.questionId)
    );
    const communicationScore = behavioralFeedback.length > 0
      ? Math.round(behavioralFeedback.reduce((sum, f) => sum + f.score, 0) / behavioralFeedback.length)
      : overallScore;

    const culturalQuestions = session.questions.filter(q => q.type === 'cultural_fit' || q.type === 'spiritual');
    const culturalFeedback = questionFeedback.filter(f =>
      culturalQuestions.some(q => q.questionId === f.questionId)
    );
    const culturalFitScore = culturalFeedback.length > 0
      ? Math.round(culturalFeedback.reduce((sum, f) => sum + f.score, 0) / culturalFeedback.length)
      : overallScore;

    // Aggregate strengths and weaknesses
    const allStrengths = questionFeedback.flatMap(f => f.strengths);
    const allWeaknesses = questionFeedback.flatMap(f => f.weaknesses);

    const strengths = this.deduplicateAndPrioritize(allStrengths).slice(0, 5);
    const areasForImprovement = this.deduplicateAndPrioritize(allWeaknesses).slice(0, 5);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      session,
      overallScore,
      strengths,
      areasForImprovement
    );

    // Generate next steps
    const nextSteps = this.generateNextSteps(overallScore, areasForImprovement);

    return {
      overallScore,
      communicationScore,
      technicalScore,
      culturalFitScore,
      strengths,
      areasForImprovement,
      questionFeedback,
      recommendations,
      nextSteps,
    };
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(
    session: InterviewSession,
    overallScore: number,
    strengths: string[],
    weaknesses: string[]
  ): Promise<string[]> {
    const prompt = `Based on this mock interview performance, provide 3-5 specific recommendations for improvement.

Role: ${session.role.title} (${session.role.level})
Overall Score: ${overallScore}/100

Strengths:
${strengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${weaknesses.map(w => `- ${w}`).join('\n')}

Provide actionable, specific recommendations that will help the candidate improve their interview performance. Focus on practical steps they can take.

Return as JSON array of recommendation strings.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a supportive career coach providing encouraging, actionable advice.',
      maxTokens: 800,
      temperature: 0.7,
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Error parsing recommendations', { error });
      return [
        'Practice answering questions using the STAR method (Situation, Task, Action, Result)',
        'Research the company and role thoroughly before interviews',
        'Prepare specific examples that demonstrate your key skills and achievements',
      ];
    }
  }

  /**
   * Generate next steps based on performance
   */
  private generateNextSteps(overallScore: number, weaknesses: string[]): string[] {
    const steps: string[] = [];

    if (overallScore >= 85) {
      steps.push('You\'re interview-ready! Start applying to target positions with confidence.');
      steps.push('Continue practicing to maintain your skills and stay sharp.');
    } else if (overallScore >= 70) {
      steps.push('Schedule 2-3 more mock interviews to refine your responses.');
      steps.push('Focus on the areas for improvement identified in this feedback.');
      steps.push('Research common questions for your target role and prepare strong answers.');
    } else {
      steps.push('Practice extensively with mock interviews before applying to positions.');
      steps.push('Work with a career coach or mentor to improve interview skills.');
      steps.push('Study the STAR method and prepare 10-15 strong examples from your experience.');
    }

    if (weaknesses.some(w => w.toLowerCase().includes('technical'))) {
      steps.push('Review technical concepts and practice explaining them clearly.');
    }

    if (weaknesses.some(w => w.toLowerCase().includes('communication') || w.toLowerCase().includes('clarity'))) {
      steps.push('Practice speaking clearly and concisely. Record yourself to identify areas for improvement.');
    }

    return steps;
  }

  /**
   * Helper methods
   */

  private getTimeLimit(type: InterviewQuestionType): number {
    const limits: Record<InterviewQuestionType, number> = {
      behavioral: 180, // 3 minutes
      technical: 300, // 5 minutes
      situational: 180,
      case_study: 600, // 10 minutes
      cultural_fit: 120,
      spiritual: 120,
    };
    return limits[type] || 180;
  }

  private getEmptyFeedback(): InterviewFeedback {
    return {
      overallScore: 0,
      communicationScore: 0,
      technicalScore: 0,
      culturalFitScore: 0,
      strengths: [],
      areasForImprovement: [],
      questionFeedback: [],
      recommendations: [],
      nextSteps: [],
    };
  }

  private getDefaultQuestionFeedback(questionId: string): QuestionFeedback {
    return {
      questionId,
      score: 70,
      strengths: ['Provided a response'],
      weaknesses: ['Could provide more specific details'],
      suggestions: ['Use the STAR method to structure your answer'],
    };
  }

  private deduplicateAndPrioritize(items: string[]): string[] {
    const counts = new Map<string, number>();
    items.forEach(item => {
      const normalized = item.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => items.find(i => i.toLowerCase().trim() === item) || item);
  }

  private getFallbackQuestions(role: JobRole, count: number): InterviewQuestion[] {
    const baseQuestions: InterviewQuestion[] = [
      {
        questionId: `q_fallback_1`,
        type: 'behavioral',
        question: 'Tell me about a time when you faced a significant challenge at work. How did you handle it?',
        category: 'problem_solving',
        difficulty: 'medium',
        expectedElements: ['Specific situation', 'Actions taken', 'Results achieved'],
      },
      {
        questionId: `q_fallback_2`,
        type: 'behavioral',
        question: 'Describe a situation where you had to work with a difficult team member. What was your approach?',
        category: 'teamwork',
        difficulty: 'medium',
        expectedElements: ['Conflict description', 'Resolution strategy', 'Outcome'],
      },
      {
        questionId: `q_fallback_3`,
        type: 'technical',
        question: `What technical skills and tools are most important for a ${role.title} role?`,
        category: 'technical_skills',
        difficulty: 'easy',
        expectedElements: ['Relevant technologies', 'Practical experience', 'Learning approach'],
      },
      {
        questionId: `q_fallback_4`,
        type: 'cultural_fit',
        question: 'Why are you interested in this role and our organization?',
        category: 'communication',
        difficulty: 'easy',
        expectedElements: ['Company research', 'Role alignment', 'Career goals'],
      },
      {
        questionId: `q_fallback_5`,
        type: 'spiritual',
        question: 'How do you integrate your faith into your professional work?',
        category: 'ministry_alignment',
        difficulty: 'medium',
        expectedElements: ['Personal testimony', 'Practical examples', 'Values alignment'],
      },
    ];

    return baseQuestions.slice(0, Math.min(count, baseQuestions.length));
  }
}
