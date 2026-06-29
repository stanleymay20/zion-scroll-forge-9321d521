/**
 * ScrollUniversity Feedback Generation Service
 * "Iron sharpens iron, and one person sharpens another" - Proverbs 27:17
 * 
 * Generates constructive, personalized feedback with improvement suggestions
 */

import { aiGatewayService } from './AIGatewayService';
import { logger } from '../utils/productionLogger';

export interface FeedbackOptions {
  includeEncouragement?: boolean;
  includeScripture?: boolean;
  focusAreas?: string[];
  studentLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratedFeedback {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  specificSuggestions: string[];
  nextSteps: string[];
  encouragement?: string;
  scriptureReference?: {
    verse: string;
    reference: string;
    application: string;
  };
  estimatedImprovementTime?: string;
}

export class FeedbackGenerationService {
  /**
   * Generate comprehensive feedback for a graded submission
   */
  async generateFeedback(
    submission: any,
    gradeResult: any,
    options: FeedbackOptions = {}
  ): Promise<GeneratedFeedback> {
    try {
      const {
        includeEncouragement = true,
        includeScripture = true,
        focusAreas = [],
        studentLevel = 'intermediate'
      } = options;

      logger.info('Generating feedback', {
        submissionId: submission.id,
        score: gradeResult.grade.overallScore
      });

      // Build feedback prompt
      const prompt = this.buildFeedbackPrompt(
        submission,
        gradeResult,
        studentLevel,
        focusAreas
      );

      // Generate feedback using AI
      const response = await aiGatewayService.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(includeEncouragement, includeScripture)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1500
      });

      // Parse feedback
      const feedback = JSON.parse(response.content);

      // Add encouragement if requested
      if (includeEncouragement && !feedback.encouragement) {
        feedback.encouragement = this.generateEncouragement(gradeResult.grade.overallScore);
      }

      // Add scripture if requested
      if (includeScripture && !feedback.scriptureReference) {
        feedback.scriptureReference = this.selectRelevantScripture(
          gradeResult.grade.overallScore,
          feedback.areasForImprovement
        );
      }

      logger.info('Feedback generated', {
        submissionId: submission.id,
        strengthsCount: feedback.strengths.length,
        suggestionsCount: feedback.specificSuggestions.length
      });

      return feedback;

    } catch (error: any) {
      logger.error('Feedback generation error', { error: error.message });
      
      // Return basic feedback as fallback
      return this.generateBasicFeedback(gradeResult);
    }
  }

  /**
   * Build feedback generation prompt
   */
  private buildFeedbackPrompt(
    submission: any,
    gradeResult: any,
    studentLevel: string,
    focusAreas: string[]
  ): string {
    const grade = gradeResult.grade;
    const assignmentType = submission.assignment.type;

    let prompt = `Generate constructive, personalized feedback for a student submission.

Assignment: ${submission.assignment.title}
Type: ${assignmentType}
Student Level: ${studentLevel}
Score: ${grade.overallScore}/100

`;

    // Add grade details based on type
    if (grade.lineByLineFeedback) {
      prompt += `\nCode Review Points:\n`;
      grade.lineByLineFeedback.slice(0, 5).forEach((feedback: any) => {
        prompt += `- Line ${feedback.lineNumber}: ${feedback.message}\n`;
      });
    }

    if (grade.paragraphFeedback) {
      prompt += `\nEssay Analysis:\n`;
      prompt += `- Thesis Clarity: ${grade.thesisClarity}/100\n`;
      prompt += `- Argument Structure: ${grade.argumentStructure}/100\n`;
      prompt += `- Evidence Quality: ${grade.evidenceQuality}/100\n`;
    }

    if (grade.stepByStepFeedback) {
      prompt += `\nMath Solution Analysis:\n`;
      const correctSteps = grade.stepByStepFeedback.filter((s: any) => s.isCorrect).length;
      prompt += `- Correct Steps: ${correctSteps}/${grade.stepByStepFeedback.length}\n`;
    }

    if (focusAreas.length > 0) {
      prompt += `\nFocus Areas: ${focusAreas.join(', ')}\n`;
    }

    prompt += `\nProvide feedback in JSON format:
{
  "summary": "Brief overall assessment (2-3 sentences)",
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "areasForImprovement": ["area 1", "area 2", ...],
  "specificSuggestions": ["actionable suggestion 1", "suggestion 2", ...],
  "nextSteps": ["next step 1", "next step 2", ...],
  "estimatedImprovementTime": "realistic timeframe"
}

Be specific, constructive, and encouraging. Focus on growth and learning.`;

    return prompt;
  }

  /**
   * Get system prompt for feedback generation
   */
  private getSystemPrompt(includeEncouragement: boolean, includeScripture: boolean): string {
    let prompt = `You are an expert educator and mentor at ScrollUniversity, a Christian educational institution. 
Your role is to provide constructive, personalized feedback that helps students grow academically and spiritually.

Guidelines:
- Be specific and actionable in your feedback
- Balance critique with encouragement
- Focus on growth mindset and continuous improvement
- Recognize effort and progress, not just outcomes
- Provide clear next steps for improvement
- Use educational best practices`;

    if (includeEncouragement) {
      prompt += `\n- Include genuine encouragement that acknowledges the student's effort`;
    }

    if (includeScripture) {
      prompt += `\n- When appropriate, reference biblical principles of learning and growth`;
    }

    return prompt;
  }

  /**
   * Generate encouragement based on score
   */
  private generateEncouragement(score: number): string {
    if (score >= 90) {
      return "Excellent work! Your dedication and understanding shine through. Continue to pursue excellence as unto the Lord.";
    } else if (score >= 80) {
      return "Great effort! You're demonstrating solid understanding. Keep building on this foundation with continued practice.";
    } else if (score >= 70) {
      return "Good work! You're making progress. Focus on the areas for improvement, and you'll see significant growth.";
    } else if (score >= 60) {
      return "You're on the right track. Don't be discouraged - learning is a journey. Review the feedback carefully and seek help where needed.";
    } else {
      return "Keep persevering! Every expert was once a beginner. Use this feedback as a roadmap for growth, and don't hesitate to ask for help.";
    }
  }

  /**
   * Select relevant scripture based on performance and areas for improvement
   */
  private selectRelevantScripture(
    score: number,
    areasForImprovement: string[]
  ): { verse: string; reference: string; application: string } {
    // Excellence and achievement
    if (score >= 90) {
      return {
        verse: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
        reference: "Colossians 3:23",
        application: "Your excellent work reflects dedication and diligence. Continue to pursue excellence in all you do."
      };
    }

    // Perseverance and growth
    if (score >= 70) {
      return {
        verse: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
        reference: "Galatians 6:9",
        application: "Keep pressing forward. Your consistent effort will yield fruit in due season."
      };
    }

    // Struggle and learning
    if (areasForImprovement.some(area => area.toLowerCase().includes('understanding'))) {
      return {
        verse: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault.",
        reference: "James 1:5",
        application: "Seek understanding with prayer and persistence. God delights in giving wisdom to those who ask."
      };
    }

    // General encouragement
    return {
      verse: "I can do all things through Christ who strengthens me.",
      reference: "Philippians 4:13",
      application: "With God's help and your continued effort, you can overcome any academic challenge."
    };
  }

  /**
   * Generate basic feedback as fallback
   */
  private generateBasicFeedback(gradeResult: any): GeneratedFeedback {
    const score = gradeResult.grade.overallScore;

    return {
      summary: `You scored ${score}/100 on this assignment. ${score >= 70 ? 'Good work!' : 'Keep working to improve.'}`,
      strengths: score >= 70 ? ['Completed the assignment', 'Demonstrated effort'] : ['Submitted on time'],
      areasForImprovement: score < 70 ? ['Review core concepts', 'Practice more problems', 'Seek additional help'] : ['Continue building on this foundation'],
      specificSuggestions: [
        'Review the grading feedback carefully',
        'Practice similar problems',
        'Attend office hours if you have questions'
      ],
      nextSteps: [
        'Review the detailed feedback',
        'Identify specific areas to improve',
        'Create a study plan for the next assignment'
      ],
      encouragement: this.generateEncouragement(score),
      scriptureReference: this.selectRelevantScripture(score, []),
      estimatedImprovementTime: score < 60 ? '2-3 weeks with focused practice' : '1-2 weeks'
    };
  }

  /**
   * Generate improvement suggestions based on specific weaknesses
   */
  async generateImprovementPlan(
    studentId: string,
    weaknesses: string[],
    courseContext: string
  ): Promise<{
    plan: string[];
    resources: string[];
    timeline: string;
  }> {
    try {
      const prompt = `Create a personalized improvement plan for a student.

Course: ${courseContext}
Identified Weaknesses:
${weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Provide a structured improvement plan in JSON format:
{
  "plan": ["step 1", "step 2", ...],
  "resources": ["resource 1", "resource 2", ...],
  "timeline": "realistic timeframe"
}`;

      const response = await aiGatewayService.generateCompletion({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an academic advisor creating personalized improvement plans for students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1000
      });

      return JSON.parse(response.content);

    } catch (error: any) {
      logger.error('Improvement plan generation error', { error: error.message });
      
      return {
        plan: [
          'Review course materials related to weak areas',
          'Complete practice exercises',
          'Attend office hours or tutoring sessions',
          'Form a study group with peers'
        ],
        resources: [
          'Course textbook chapters',
          'Online tutorials and videos',
          'Practice problem sets',
          'Office hours schedule'
        ],
        timeline: '2-4 weeks with consistent effort'
      };
    }
  }
}
