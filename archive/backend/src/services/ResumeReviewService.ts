/**
 * Resume Review Service
 * AI-powered resume analysis and optimization
 */

import {
  Resume,
  ResumeFeedback,
  ResumeSuggestion,
  KeywordAnalysis,
  ResumeSectionType,
} from '../types/career-services.types';
import AIGatewayService from './AIGatewayService';
import logger from '../utils/logger';

/**
 * ResumeReviewService
 * Analyzes resumes and provides detailed feedback for improvement
 */
export class ResumeReviewService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Review resume and provide comprehensive feedback
   */
  async reviewResume(
    resume: Resume,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<ResumeFeedback> {
    try {
      logger.info('Reviewing resume', { studentId: resume.studentId, targetRole });

      // Analyze content
      const contentAnalysis = await this.analyzeContent(resume, targetRole, targetIndustry);

      // Analyze formatting
      const formattingAnalysis = await this.analyzeFormatting(resume);

      // Check ATS compatibility
      const atsAnalysis = await this.analyzeATSCompatibility(resume, targetRole);

      // Generate keyword analysis
      const keywordAnalysis = await this.analyzeKeywords(resume, targetRole, targetIndustry);

      // Identify strengths and weaknesses
      const strengths = this.identifyStrengths(contentAnalysis, formattingAnalysis, atsAnalysis);
      const weaknesses = this.identifyWeaknesses(contentAnalysis, formattingAnalysis, atsAnalysis);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(
        resume,
        contentAnalysis,
        formattingAnalysis,
        atsAnalysis,
        keywordAnalysis
      );

      // Generate revised version if needed
      const revisedVersion = await this.generateRevisedVersion(resume, suggestions);

      // Calculate scores
      const contentScore = this.calculateContentScore(contentAnalysis);
      const formattingScore = this.calculateFormattingScore(formattingAnalysis);
      const atsCompatibility = atsAnalysis.score;
      const overallScore = Math.round((contentScore + formattingScore + atsCompatibility) / 3);

      const feedback: ResumeFeedback = {
        overallScore,
        contentScore,
        formattingScore,
        atsCompatibility,
        strengths,
        weaknesses,
        suggestions,
        revisedVersion,
        keywordOptimization: keywordAnalysis,
      };

      logger.info('Resume review completed', {
        studentId: resume.studentId,
        overallScore,
        suggestionCount: suggestions.length,
      });

      return feedback;
    } catch (error) {
      logger.error('Error reviewing resume', { error, studentId: resume.studentId });
      throw error;
    }
  }

  /**
   * Analyze resume content quality
   */
  private async analyzeContent(
    resume: Resume,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<any> {
    const prompt = `Analyze this resume content for quality and effectiveness.

Resume Content:
${resume.content}

${targetRole ? `Target Role: ${targetRole}` : ''}
${targetIndustry ? `Target Industry: ${targetIndustry}` : ''}

Evaluate:
1. Professional summary strength (0-100)
2. Experience descriptions (action verbs, quantifiable achievements)
3. Skills relevance and organization
4. Education presentation
5. Overall clarity and impact
6. Tailoring to target role (if provided)

Return JSON with scores and specific observations for each section.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are an expert resume reviewer and career coach. Provide detailed, actionable feedback.',
      maxTokens: 1500,
      temperature: 0.5,
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Error parsing content analysis', { error });
      return {
        summaryScore: 70,
        experienceScore: 70,
        skillsScore: 70,
        educationScore: 80,
        clarityScore: 75,
        tailoringScore: targetRole ? 60 : 80,
      };
    }
  }

  /**
   * Analyze resume formatting
   */
  private async analyzeFormatting(resume: Resume): Promise<any> {
    const prompt = `Analyze this resume's formatting and structure.

Resume Content:
${resume.content}

Evaluate:
1. Visual hierarchy and readability (0-100)
2. Section organization and flow
3. Consistent formatting (fonts, spacing, bullets)
4. Length appropriateness (1-2 pages ideal)
5. White space usage
6. Professional appearance

Return JSON with scores and specific formatting issues.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a resume formatting expert. Focus on visual presentation and readability.',
      maxTokens: 1000,
      temperature: 0.5,
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Error parsing formatting analysis', { error });
      return {
        hierarchyScore: 75,
        organizationScore: 80,
        consistencyScore: 70,
        lengthScore: 85,
        whitespaceScore: 75,
        professionalScore: 80,
      };
    }
  }

  /**
   * Analyze ATS (Applicant Tracking System) compatibility
   */
  private async analyzeATSCompatibility(resume: Resume, targetRole?: string): Promise<any> {
    const prompt = `Analyze this resume for ATS (Applicant Tracking System) compatibility.

Resume Content:
${resume.content}

${targetRole ? `Target Role: ${targetRole}` : ''}

Check for:
1. Standard section headings (Experience, Education, Skills)
2. Simple formatting (no tables, text boxes, headers/footers)
3. Standard fonts and no graphics
4. Keyword optimization for target role
5. File format compatibility
6. Contact information clarity

Return JSON with ATS score (0-100) and specific compatibility issues.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are an ATS optimization expert. Focus on technical compatibility.',
      maxTokens: 1000,
      temperature: 0.5,
    });

    try {
      const analysis = JSON.parse(response.content);
      return {
        score: analysis.score || 75,
        issues: analysis.issues || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      logger.error('Error parsing ATS analysis', { error });
      return {
        score: 75,
        issues: ['Consider using standard section headings'],
        recommendations: ['Add more industry keywords'],
      };
    }
  }

  /**
   * Analyze keywords for optimization
   */
  private async analyzeKeywords(
    resume: Resume,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<KeywordAnalysis> {
    if (!targetRole && !targetIndustry) {
      return {
        missingKeywords: [],
        overusedKeywords: [],
        industryKeywords: [],
        atsScore: 75,
      };
    }

    const prompt = `Analyze keywords in this resume for ${targetRole || 'this industry'}.

Resume Content:
${resume.content}

${targetRole ? `Target Role: ${targetRole}` : ''}
${targetIndustry ? `Target Industry: ${targetIndustry}` : ''}

Identify:
1. Missing critical keywords for the role/industry
2. Overused or redundant keywords
3. Important industry-specific keywords present
4. Overall keyword optimization score (0-100)

Return JSON with keyword analysis.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a keyword optimization expert for resumes and ATS systems.',
      maxTokens: 1000,
      temperature: 0.5,
    });

    try {
      const analysis = JSON.parse(response.content);
      return {
        missingKeywords: analysis.missingKeywords || [],
        overusedKeywords: analysis.overusedKeywords || [],
        industryKeywords: analysis.industryKeywords || [],
        atsScore: analysis.atsScore || 75,
      };
    } catch (error) {
      logger.error('Error parsing keyword analysis', { error });
      return {
        missingKeywords: [],
        overusedKeywords: [],
        industryKeywords: [],
        atsScore: 75,
      };
    }
  }

  /**
   * Identify resume strengths
   */
  private identifyStrengths(
    contentAnalysis: any,
    formattingAnalysis: any,
    atsAnalysis: any
  ): string[] {
    const strengths: string[] = [];

    if (contentAnalysis.summaryScore >= 80) {
      strengths.push('Strong professional summary that clearly communicates value proposition');
    }
    if (contentAnalysis.experienceScore >= 80) {
      strengths.push('Well-written experience descriptions with quantifiable achievements');
    }
    if (contentAnalysis.skillsScore >= 80) {
      strengths.push('Relevant skills well-organized and aligned with career goals');
    }
    if (formattingAnalysis.hierarchyScore >= 80) {
      strengths.push('Excellent visual hierarchy and readability');
    }
    if (formattingAnalysis.consistencyScore >= 80) {
      strengths.push('Consistent formatting throughout the document');
    }
    if (atsAnalysis.score >= 80) {
      strengths.push('Highly compatible with Applicant Tracking Systems');
    }

    if (strengths.length === 0) {
      strengths.push('Resume shows potential with room for improvement');
    }

    return strengths;
  }

  /**
   * Identify resume weaknesses
   */
  private identifyWeaknesses(
    contentAnalysis: any,
    formattingAnalysis: any,
    atsAnalysis: any
  ): string[] {
    const weaknesses: string[] = [];

    if (contentAnalysis.summaryScore < 60) {
      weaknesses.push('Professional summary needs strengthening to better showcase unique value');
    }
    if (contentAnalysis.experienceScore < 60) {
      weaknesses.push('Experience descriptions lack quantifiable achievements and impact metrics');
    }
    if (contentAnalysis.skillsScore < 60) {
      weaknesses.push('Skills section needs better organization and relevance to target roles');
    }
    if (formattingAnalysis.hierarchyScore < 60) {
      weaknesses.push('Visual hierarchy could be improved for better readability');
    }
    if (formattingAnalysis.consistencyScore < 60) {
      weaknesses.push('Inconsistent formatting detracts from professional appearance');
    }
    if (atsAnalysis.score < 60) {
      weaknesses.push('ATS compatibility issues may prevent resume from being properly parsed');
    }

    return weaknesses;
  }

  /**
   * Generate specific suggestions for improvement
   */
  private async generateSuggestions(
    resume: Resume,
    contentAnalysis: any,
    formattingAnalysis: any,
    atsAnalysis: any,
    keywordAnalysis: KeywordAnalysis
  ): Promise<ResumeSuggestion[]> {
    const suggestions: ResumeSuggestion[] = [];

    // Content suggestions
    if (contentAnalysis.summaryScore < 80) {
      suggestions.push({
        section: 'summary',
        priority: 'high',
        issue: 'Professional summary lacks impact',
        recommendation: 'Rewrite summary to highlight unique value proposition, key achievements, and career goals in 3-4 compelling sentences',
        example: 'Results-driven [Role] with [X] years of experience in [Industry]. Proven track record of [Key Achievement]. Seeking to leverage [Skills] to [Career Goal].',
      });
    }

    if (contentAnalysis.experienceScore < 80) {
      suggestions.push({
        section: 'experience',
        priority: 'critical',
        issue: 'Experience descriptions need more impact',
        recommendation: 'Use strong action verbs and quantify achievements with metrics (percentages, dollar amounts, time saved)',
        example: 'Led team of 5 developers to deliver project 2 weeks ahead of schedule, reducing costs by 15%',
      });
    }

    // Formatting suggestions
    if (formattingAnalysis.consistencyScore < 80) {
      suggestions.push({
        section: 'experience',
        priority: 'medium',
        issue: 'Inconsistent formatting',
        recommendation: 'Ensure consistent use of fonts, bullet styles, spacing, and date formats throughout',
      });
    }

    // ATS suggestions
    if (atsAnalysis.score < 80) {
      suggestions.push({
        section: 'contact',
        priority: 'high',
        issue: 'ATS compatibility concerns',
        recommendation: 'Use standard section headings (Experience, Education, Skills), avoid tables and text boxes, use simple formatting',
      });
    }

    // Keyword suggestions
    if (keywordAnalysis.missingKeywords.length > 0) {
      suggestions.push({
        section: 'skills',
        priority: 'high',
        issue: 'Missing important keywords',
        recommendation: `Incorporate these relevant keywords: ${keywordAnalysis.missingKeywords.slice(0, 5).join(', ')}`,
      });
    }

    return suggestions;
  }

  /**
   * Generate revised version of resume
   */
  private async generateRevisedVersion(
    resume: Resume,
    suggestions: ResumeSuggestion[]
  ): Promise<string | undefined> {
    if (suggestions.filter(s => s.priority === 'critical' || s.priority === 'high').length === 0) {
      return undefined;
    }

    const prompt = `Revise this resume based on the following suggestions:

Original Resume:
${resume.content}

Suggestions:
${suggestions.map(s => `- ${s.section}: ${s.recommendation}`).join('\n')}

Create an improved version that:
1. Implements all critical and high-priority suggestions
2. Maintains the original information and achievements
3. Uses strong action verbs and quantifiable metrics
4. Ensures ATS compatibility
5. Maintains professional tone

Return the complete revised resume.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are an expert resume writer. Create polished, professional resumes that get results.',
      maxTokens: 2000,
      temperature: 0.7,
    });

    return response.content.trim();
  }

  /**
   * Calculate content score
   */
  private calculateContentScore(analysis: any): number {
    const scores = [
      analysis.summaryScore || 70,
      analysis.experienceScore || 70,
      analysis.skillsScore || 70,
      analysis.educationScore || 80,
      analysis.clarityScore || 75,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  /**
   * Calculate formatting score
   */
  private calculateFormattingScore(analysis: any): number {
    const scores = [
      analysis.hierarchyScore || 75,
      analysis.organizationScore || 80,
      analysis.consistencyScore || 70,
      analysis.lengthScore || 85,
      analysis.whitespaceScore || 75,
      analysis.professionalScore || 80,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
}
