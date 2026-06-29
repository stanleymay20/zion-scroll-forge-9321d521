/**
 * Employer Matching Service
 * Matches students to relevant employers and job opportunities
 */

import {
  StudentProfile,
  EmployerMatch,
  Employer,
  JobPosting,
  FitAnalysis,
  ApplicationStrategy,
  CareerPreferences,
} from '../types/career-services.types';
import AIGatewayService from './AIGatewayService';
import logger from '../utils/logger';

/**
 * EmployerMatchingService
 * Analyzes student profiles and matches them to employers and positions
 */
export class EmployerMatchingService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Match student to employers and job opportunities
   */
  async matchEmployers(
    profile: StudentProfile,
    preferences?: CareerPreferences
  ): Promise<EmployerMatch[]> {
    try {
      logger.info('Matching employers for student', { studentId: profile.studentId });

      // Get potential employers
      const employers = await this.identifyPotentialEmployers(profile, preferences);

      // Analyze each employer match
      const matches: EmployerMatch[] = [];
      for (const employer of employers) {
        // Find best position match for this employer
        const bestPosition = await this.findBestPosition(profile, employer);
        if (bestPosition) {
          const match = await this.analyzeEmployerMatch(profile, employer, bestPosition, preferences);
          matches.push(match);
        }
      }

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);

      // Return top 15 matches
      return matches.slice(0, 15);
    } catch (error) {
      logger.error('Error matching employers', { error, studentId: profile.studentId });
      throw error;
    }
  }

  /**
   * Track application outcome
   */
  async trackApplicationOutcome(
    studentId: string,
    employerId: string,
    positionId: string,
    status: string,
    feedback?: string
  ): Promise<void> {
    logger.info('Tracking application outcome', {
      studentId,
      employerId,
      positionId,
      status,
    });

    // In a real implementation, this would update the database
    // For now, just log the outcome
  }

  /**
   * Identify potential employers based on student profile
   */
  private async identifyPotentialEmployers(
    profile: StudentProfile,
    preferences?: CareerPreferences
  ): Promise<Employer[]> {
    const prompt = `Identify 20 potential employers that would be a good fit for this student profile.

Student Profile:
- Skills: ${profile.skills.map(s => s.name).join(', ')}
- Interests: ${profile.interests.join(', ')}
- Values: ${profile.values.join(', ')}
- Education: ${profile.education.map(e => `${e.degree} in ${e.major}`).join(', ')}
- Experience: ${profile.experience.length} positions
${preferences?.industries ? `- Preferred Industries: ${preferences.industries.join(', ')}` : ''}
${preferences?.locations ? `- Preferred Locations: ${preferences.locations.join(', ')}` : ''}
${preferences?.ministryFocus ? '- Ministry Focus: Yes' : ''}

For each employer, provide:
1. Company name
2. Industry
3. Size (startup/small/medium/large/enterprise)
4. Locations (array)
5. Culture scores (workLifeBalance, innovation, collaboration, diversity, growth - each 0-100)
6. Mission statement
7. Values (array)
8. Benefits (array)
9. Christian-friendly (boolean)
10. Ministry opportunities (if applicable)
11. 2-3 open positions with details

Return as JSON array of employer objects.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career services expert with knowledge of employers across industries, including Christian organizations and faith-friendly companies.',
      maxTokens: 4000,
      temperature: 0.7,
    });

    try {
      const employers = JSON.parse(response.content);
      return employers.map((e: any, index: number) => ({
        id: `employer_${Date.now()}_${index}`,
        name: e.name,
        industry: e.industry,
        size: e.size || 'medium',
        location: e.locations || [],
        culture: {
          workLifeBalance: e.culture?.workLifeBalance || 70,
          innovation: e.culture?.innovation || 70,
          collaboration: e.culture?.collaboration || 70,
          diversity: e.culture?.diversity || 70,
          growth: e.culture?.growth || 70,
          mission: e.culture?.mission || e.mission || '',
        },
        values: e.values || [],
        openPositions: (e.openPositions || []).map((p: any, pIndex: number) => ({
          id: `position_${Date.now()}_${index}_${pIndex}`,
          title: p.title,
          description: p.description || '',
          requirements: p.requirements || [],
          preferredQualifications: p.preferredQualifications || [],
          salaryRange: p.salaryRange,
          location: p.location || e.locations?.[0] || 'Remote',
          remote: p.remote || false,
          postedDate: new Date(),
        })),
        benefits: e.benefits || [],
        christianFriendly: e.christianFriendly || false,
        ministryOpportunities: e.ministryOpportunities || [],
      }));
    } catch (error) {
      logger.error('Error parsing employer data', { error });
      return this.getFallbackEmployers(profile);
    }
  }

  /**
   * Find best position match at employer
   */
  private async findBestPosition(
    profile: StudentProfile,
    employer: Employer
  ): Promise<JobPosting | null> {
    if (employer.openPositions.length === 0) {
      return null;
    }

    // Score each position
    const scoredPositions = employer.openPositions.map(position => {
      const score = this.scorePosition(profile, position);
      return { position, score };
    });

    // Return highest scoring position
    scoredPositions.sort((a, b) => b.score - a.score);
    return scoredPositions[0].position;
  }

  /**
   * Score how well a position matches student profile
   */
  private scorePosition(profile: StudentProfile, position: JobPosting): number {
    let score = 0;

    // Skills match
    const studentSkills = new Set(profile.skills.map(s => s.name.toLowerCase()));
    const requiredMatch = position.requirements.filter(req =>
      Array.from(studentSkills).some(skill => req.toLowerCase().includes(skill))
    ).length;
    score += (requiredMatch / Math.max(position.requirements.length, 1)) * 50;

    // Education match
    const hasRelevantEducation = profile.education.some(edu =>
      position.requirements.some(req =>
        req.toLowerCase().includes(edu.degree.toLowerCase()) ||
        req.toLowerCase().includes(edu.major.toLowerCase())
      )
    );
    score += hasRelevantEducation ? 25 : 10;

    // Experience match
    const hasRelevantExperience = profile.experience.some(exp =>
      position.title.toLowerCase().includes(exp.position.toLowerCase()) ||
      position.description.toLowerCase().includes(exp.position.toLowerCase())
    );
    score += hasRelevantExperience ? 25 : 10;

    return score;
  }

  /**
   * Analyze match between student and employer
   */
  private async analyzeEmployerMatch(
    profile: StudentProfile,
    employer: Employer,
    position: JobPosting,
    preferences?: CareerPreferences
  ): Promise<EmployerMatch> {
    // Analyze fit
    const fitAnalysis = await this.analyzeFit(profile, employer, position, preferences);

    // Calculate overall match score
    const matchScore = this.calculateMatchScore(fitAnalysis, preferences);

    // Generate application strategy
    const applicationStrategy = await this.generateApplicationStrategy(
      profile,
      employer,
      position,
      fitAnalysis
    );

    // Generate reasoning
    const reasoning = await this.generateMatchReasoning(
      profile,
      employer,
      position,
      matchScore,
      fitAnalysis
    );

    return {
      employer,
      matchScore,
      position,
      fitAnalysis,
      applicationStrategy,
      reasoning,
    };
  }

  /**
   * Analyze fit between student and employer/position
   */
  private async analyzeFit(
    profile: StudentProfile,
    employer: Employer,
    position: JobPosting,
    preferences?: CareerPreferences
  ): Promise<FitAnalysis> {
    // Skills match
    const studentSkills = new Set(profile.skills.map(s => s.name.toLowerCase()));
    const requiredSkills = position.requirements.filter(req =>
      Array.from(studentSkills).some(skill => req.toLowerCase().includes(skill))
    );
    const skillsMatch = (requiredSkills.length / Math.max(position.requirements.length, 1)) * 100;

    // Culture match
    const cultureMatch = await this.calculateCultureMatch(profile, employer);

    // Values match
    const valuesMatch = this.calculateValuesMatch(profile, employer);

    // Location match
    const locationMatch = this.calculateLocationMatch(profile, employer, position, preferences);

    // Salary match
    const salaryMatch = this.calculateSalaryMatch(profile, position, preferences);

    // Overall fit
    const overallFit = Math.round(
      (skillsMatch * 0.35 + cultureMatch * 0.25 + valuesMatch * 0.20 + locationMatch * 0.10 + salaryMatch * 0.10)
    );

    // Identify strengths and concerns
    const strengths: string[] = [];
    const concerns: string[] = [];

    if (skillsMatch >= 70) {
      strengths.push('Strong skills alignment with position requirements');
    } else if (skillsMatch < 50) {
      concerns.push('Significant skill gaps for this position');
    }

    if (cultureMatch >= 75) {
      strengths.push('Excellent cultural fit with company values');
    } else if (cultureMatch < 60) {
      concerns.push('Potential cultural misalignment');
    }

    if (valuesMatch >= 80) {
      strengths.push('Strong alignment with company values and mission');
    }

    if (employer.christianFriendly && profile.values.some(v => v.toLowerCase().includes('faith'))) {
      strengths.push('Christian-friendly workplace aligns with faith values');
    }

    if (locationMatch < 50) {
      concerns.push('Location may not match preferences');
    }

    if (salaryMatch < 60) {
      concerns.push('Salary may not meet expectations');
    }

    return {
      skillsMatch,
      cultureMatch,
      valuesMatch,
      locationMatch,
      salaryMatch,
      overallFit,
      strengths,
      concerns,
    };
  }

  /**
   * Calculate culture match score
   */
  private async calculateCultureMatch(profile: StudentProfile, employer: Employer): Promise<number> {
    // Simple heuristic based on values alignment
    const valueKeywords = profile.values.map(v => v.toLowerCase());
    const missionMatch = valueKeywords.some(keyword =>
      employer.culture.mission.toLowerCase().includes(keyword)
    );

    let score = 60; // Base score

    if (missionMatch) score += 20;
    if (employer.culture.workLifeBalance >= 70) score += 10;
    if (employer.culture.collaboration >= 70) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate values match score
   */
  private calculateValuesMatch(profile: StudentProfile, employer: Employer): number {
    const studentValues = new Set(profile.values.map(v => v.toLowerCase()));
    const employerValues = new Set(employer.values.map(v => v.toLowerCase()));

    const matchingValues = Array.from(studentValues).filter(v =>
      Array.from(employerValues).some(ev => ev.includes(v) || v.includes(ev))
    );

    return (matchingValues.length / Math.max(studentValues.size, 1)) * 100;
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatch(
    profile: StudentProfile,
    employer: Employer,
    position: JobPosting,
    preferences?: CareerPreferences
  ): number {
    if (position.remote) return 100;

    if (!preferences?.locations || preferences.locations.length === 0) {
      return 80; // Neutral if no preference
    }

    const hasMatch = employer.location.some(loc =>
      preferences.locations?.some(pref =>
        loc.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(loc.toLowerCase())
      )
    );

    return hasMatch ? 100 : 40;
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatch(
    profile: StudentProfile,
    position: JobPosting,
    preferences?: CareerPreferences
  ): number {
    if (!position.salaryRange || !preferences?.salaryRange) {
      return 75; // Neutral if no data
    }

    const positionMin = position.salaryRange.min;
    const positionMax = position.salaryRange.max;
    const expectedMin = preferences.salaryRange.min;
    const expectedMax = preferences.salaryRange.max;

    // Check if ranges overlap
    if (positionMax >= expectedMin && positionMin <= expectedMax) {
      // Calculate overlap percentage
      const overlapMin = Math.max(positionMin, expectedMin);
      const overlapMax = Math.min(positionMax, expectedMax);
      const overlap = overlapMax - overlapMin;
      const expectedRange = expectedMax - expectedMin;
      return Math.min(100, (overlap / expectedRange) * 100);
    }

    return 30; // No overlap
  }

  /**
   * Calculate overall match score
   */
  private calculateMatchScore(fitAnalysis: FitAnalysis, preferences?: CareerPreferences): number {
    let score = fitAnalysis.overallFit;

    // Bonus for strong fits
    if (fitAnalysis.skillsMatch >= 80) score += 5;
    if (fitAnalysis.cultureMatch >= 80) score += 5;
    if (fitAnalysis.valuesMatch >= 80) score += 5;

    // Penalty for concerns
    if (fitAnalysis.concerns.length > 2) score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate application strategy
   */
  private async generateApplicationStrategy(
    profile: StudentProfile,
    employer: Employer,
    position: JobPosting,
    fitAnalysis: FitAnalysis
  ): Promise<ApplicationStrategy> {
    const prompt = `Create an application strategy for this student applying to this position.

Student Profile:
- Skills: ${profile.skills.slice(0, 5).map(s => s.name).join(', ')}
- Experience: ${profile.experience.length} positions
- Education: ${profile.education.map(e => e.degree).join(', ')}

Company: ${employer.name}
Position: ${position.title}
Industry: ${employer.industry}

Fit Analysis:
- Skills Match: ${fitAnalysis.skillsMatch}%
- Culture Match: ${fitAnalysis.cultureMatch}%
- Strengths: ${fitAnalysis.strengths.join(', ')}
- Concerns: ${fitAnalysis.concerns.join(', ')}

Provide:
1. Priority level (low/medium/high)
2. Recommended approach (how to apply)
3. Key points to highlight in application
4. Potential challenges to address
5. Networking opportunities
6. Application timeline

Return as JSON object.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career strategist helping students optimize their job applications.',
      maxTokens: 1000,
      temperature: 0.7,
    });

    try {
      const strategy = JSON.parse(response.content);
      return {
        priority: strategy.priority || 'medium',
        recommendedApproach: strategy.recommendedApproach || 'Apply through company website',
        keyPointsToHighlight: strategy.keyPointsToHighlight || [],
        potentialChallenges: strategy.potentialChallenges || [],
        networkingOpportunities: strategy.networkingOpportunities || [],
        timeline: strategy.timeline || 'Apply within 1-2 weeks',
      };
    } catch (error) {
      logger.error('Error parsing application strategy', { error });
      return this.getDefaultApplicationStrategy(fitAnalysis);
    }
  }

  /**
   * Generate reasoning for match
   */
  private async generateMatchReasoning(
    profile: StudentProfile,
    employer: Employer,
    position: JobPosting,
    matchScore: number,
    fitAnalysis: FitAnalysis
  ): Promise<string> {
    const prompt = `Explain why this employer/position is a ${matchScore >= 80 ? 'strong' : matchScore >= 60 ? 'good' : 'moderate'} match for this student.

Company: ${employer.name}
Position: ${position.title}
Match Score: ${matchScore}/100

Strengths: ${fitAnalysis.strengths.join(', ')}
Concerns: ${fitAnalysis.concerns.join(', ')}

Provide a 2-3 sentence explanation focusing on fit and opportunities.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career counselor providing encouraging, realistic guidance.',
      maxTokens: 200,
      temperature: 0.7,
    });

    return response.content.trim();
  }

  /**
   * Helper methods
   */

  private getDefaultApplicationStrategy(fitAnalysis: FitAnalysis): ApplicationStrategy {
    const priority = fitAnalysis.overallFit >= 75 ? 'high' : fitAnalysis.overallFit >= 60 ? 'medium' : 'low';

    return {
      priority,
      recommendedApproach: 'Apply through company website and follow up with hiring manager',
      keyPointsToHighlight: fitAnalysis.strengths,
      potentialChallenges: fitAnalysis.concerns,
      networkingOpportunities: ['Connect with employees on LinkedIn', 'Attend company events'],
      timeline: priority === 'high' ? 'Apply immediately' : 'Apply within 1-2 weeks',
    };
  }

  private getFallbackEmployers(profile: StudentProfile): Employer[] {
    return [
      {
        id: 'employer_fallback_1',
        name: 'Tech for Good Inc.',
        industry: 'Technology',
        size: 'medium',
        location: ['Remote', 'Multiple Locations'],
        culture: {
          workLifeBalance: 85,
          innovation: 90,
          collaboration: 85,
          diversity: 80,
          growth: 85,
          mission: 'Using technology to serve communities and advance the Kingdom',
        },
        values: ['Innovation', 'Service', 'Excellence', 'Faith'],
        openPositions: [
          {
            id: 'position_fallback_1',
            title: 'Software Developer',
            description: 'Build applications that make a difference',
            requirements: ['Programming skills', 'Problem solving', 'Team collaboration'],
            preferredQualifications: ['Cloud experience', 'Agile methodology'],
            location: 'Remote',
            remote: true,
            postedDate: new Date(),
          },
        ],
        benefits: ['Health insurance', 'Flexible schedule', 'Professional development'],
        christianFriendly: true,
        ministryOpportunities: ['Tech for missions', 'Digital ministry'],
      },
    ];
  }
}
