/**
 * Career Matching Service
 * Analyzes student profiles and matches them to optimal career paths
 */

import {
  StudentProfile,
  CareerMatch,
  Career,
  SkillGap,
  PathwayStep,
  CareerPreferences,
  ProficiencyLevel,
  LearningResource,
} from '../types/career-services.types';
import AIGatewayService from './AIGatewayService';
import logger from '../utils/logger';

/**
 * CareerMatchingService
 * Implements career matching algorithm with AI-powered analysis
 */
export class CareerMatchingService {
  private aiGateway: AIGatewayService;

  constructor() {
    this.aiGateway = new AIGatewayService();
  }

  /**
   * Match student profile to career paths
   */
  async matchCareers(
    profile: StudentProfile,
    preferences?: CareerPreferences
  ): Promise<CareerMatch[]> {
    try {
      logger.info('Starting career matching', { studentId: profile.studentId });

      // Get potential careers based on profile
      const potentialCareers = await this.identifyPotentialCareers(profile, preferences);

      // Analyze each career match
      const matches: CareerMatch[] = [];
      for (const career of potentialCareers) {
        const match = await this.analyzeCareerMatch(profile, career, preferences);
        matches.push(match);
      }

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);

      // Return top 10 matches
      return matches.slice(0, 10);
    } catch (error) {
      logger.error('Error matching careers', { error, studentId: profile.studentId });
      throw error;
    }
  }

  /**
   * Identify potential careers based on student profile
   */
  private async identifyPotentialCareers(
    profile: StudentProfile,
    preferences?: CareerPreferences
  ): Promise<Career[]> {
    const prompt = `Analyze this student profile and identify 15 potential career paths that align with their skills, interests, and values.

Student Profile:
- Skills: ${profile.skills.map(s => `${s.name} (${s.proficiencyLevel})`).join(', ')}
- Interests: ${profile.interests.join(', ')}
- Values: ${profile.values.join(', ')}
- Education: ${profile.education.map(e => `${e.degree} in ${e.major}`).join(', ')}
- Career Goals: ${profile.careerGoals.join(', ')}
${preferences?.industries ? `- Preferred Industries: ${preferences.industries.join(', ')}` : ''}
${preferences?.ministryFocus ? '- Ministry Focus: Yes' : ''}

For each career, provide:
1. Title
2. Description (2-3 sentences)
3. Industry
4. Required skills (list 5-8 key skills)
5. Preferred skills (list 3-5 additional skills)
6. Education requirements
7. Experience requirements
8. Growth rate (percentage)
9. Demand level (low/medium/high/very_high)
10. Ministry opportunities (if applicable)

Return as JSON array of career objects.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career counselor with expertise in Christian vocations and marketplace ministry. Provide practical, faith-integrated career guidance.',
      maxTokens: 3000,
      temperature: 0.7,
    });

    try {
      const careers = JSON.parse(response.content);
      return careers.map((c: any, index: number) => ({
        id: `career_${Date.now()}_${index}`,
        title: c.title,
        description: c.description,
        industry: c.industry,
        requiredSkills: c.requiredSkills || [],
        preferredSkills: c.preferredSkills || [],
        educationRequirements: c.educationRequirements || [],
        experienceRequirements: c.experienceRequirements || '',
        growthRate: c.growthRate || 0,
        demandLevel: c.demandLevel || 'medium',
        ministryOpportunities: c.ministryOpportunities || [],
      }));
    } catch (error) {
      logger.error('Error parsing career data', { error });
      return this.getFallbackCareers(profile);
    }
  }

  /**
   * Analyze match between student and career
   */
  private async analyzeCareerMatch(
    profile: StudentProfile,
    career: Career,
    preferences?: CareerPreferences
  ): Promise<CareerMatch> {
    // Calculate skill gaps
    const skillGaps = this.calculateSkillGaps(profile, career);

    // Calculate match score
    const matchScore = this.calculateMatchScore(profile, career, skillGaps, preferences);

    // Generate pathway steps
    const pathwaySteps = await this.generatePathwaySteps(profile, career, skillGaps);

    // Get job outlook
    const jobOutlook = await this.getJobOutlook(career);

    // Calculate spiritual alignment
    const spiritualAlignment = this.calculateSpiritualAlignment(profile, career);

    // Generate reasoning
    const reasoning = await this.generateMatchReasoning(profile, career, matchScore, skillGaps);

    return {
      career,
      matchScore,
      requiredSkills: career.requiredSkills.map(skillName => ({
        name: skillName,
        category: 'technical',
        proficiencyLevel: 'intermediate' as ProficiencyLevel,
        verified: false,
      })),
      skillGaps,
      salaryRange: this.estimateSalaryRange(career),
      jobOutlook,
      pathwaySteps,
      reasoning,
      spiritualAlignment,
    };
  }

  /**
   * Calculate skill gaps between student and career requirements
   */
  private calculateSkillGaps(profile: StudentProfile, career: Career): SkillGap[] {
    const gaps: SkillGap[] = [];
    const studentSkills = new Map(profile.skills.map(s => [s.name.toLowerCase(), s]));

    // Check required skills
    for (const requiredSkill of career.requiredSkills) {
      const studentSkill = studentSkills.get(requiredSkill.toLowerCase());
      
      if (!studentSkill) {
        gaps.push({
          skill: requiredSkill,
          currentLevel: 'none',
          requiredLevel: 'intermediate',
          priority: 'critical',
          recommendedResources: this.getSkillResources(requiredSkill),
          estimatedTimeToAcquire: '3-6 months',
        });
      } else if (this.needsImprovement(studentSkill.proficiencyLevel, 'intermediate')) {
        gaps.push({
          skill: requiredSkill,
          currentLevel: studentSkill.proficiencyLevel,
          requiredLevel: 'intermediate',
          priority: 'high',
          recommendedResources: this.getSkillResources(requiredSkill),
          estimatedTimeToAcquire: '1-3 months',
        });
      }
    }

    // Check preferred skills
    for (const preferredSkill of career.preferredSkills) {
      const studentSkill = studentSkills.get(preferredSkill.toLowerCase());
      
      if (!studentSkill) {
        gaps.push({
          skill: preferredSkill,
          currentLevel: 'none',
          requiredLevel: 'beginner',
          priority: 'medium',
          recommendedResources: this.getSkillResources(preferredSkill),
          estimatedTimeToAcquire: '1-2 months',
        });
      }
    }

    return gaps;
  }

  /**
   * Calculate overall match score
   */
  private calculateMatchScore(
    profile: StudentProfile,
    career: Career,
    skillGaps: SkillGap[],
    preferences?: CareerPreferences
  ): number {
    let score = 0;

    // Skills match (40 points)
    const criticalGaps = skillGaps.filter(g => g.priority === 'critical').length;
    const highGaps = skillGaps.filter(g => g.priority === 'high').length;
    const skillScore = Math.max(0, 40 - (criticalGaps * 10) - (highGaps * 5));
    score += skillScore;

    // Interest alignment (20 points)
    const interestMatch = profile.interests.some(interest =>
      career.description.toLowerCase().includes(interest.toLowerCase()) ||
      career.industry.toLowerCase().includes(interest.toLowerCase())
    );
    score += interestMatch ? 20 : 10;

    // Education match (15 points)
    const educationMatch = profile.education.some(edu =>
      career.educationRequirements.some(req =>
        req.toLowerCase().includes(edu.degree.toLowerCase()) ||
        req.toLowerCase().includes(edu.major.toLowerCase())
      )
    );
    score += educationMatch ? 15 : 5;

    // Career goals alignment (15 points)
    const goalsMatch = profile.careerGoals.some(goal =>
      career.title.toLowerCase().includes(goal.toLowerCase()) ||
      career.description.toLowerCase().includes(goal.toLowerCase())
    );
    score += goalsMatch ? 15 : 5;

    // Demand level (10 points)
    const demandScore = {
      very_high: 10,
      high: 8,
      medium: 5,
      low: 2,
    }[career.demandLevel] || 5;
    score += demandScore;

    // Preferences match (bonus points)
    if (preferences) {
      if (preferences.industries?.includes(career.industry)) {
        score += 5;
      }
      if (preferences.ministryFocus && career.ministryOpportunities && career.ministryOpportunities.length > 0) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Generate pathway steps to achieve career
   */
  private async generatePathwaySteps(
    profile: StudentProfile,
    career: Career,
    skillGaps: SkillGap[]
  ): Promise<PathwayStep[]> {
    const prompt = `Create a step-by-step career pathway for a student to achieve this career goal.

Career: ${career.title}
Industry: ${career.industry}

Current Profile:
- Education: ${profile.education.map(e => `${e.degree} in ${e.major}`).join(', ')}
- Experience: ${profile.experience.length} positions
- Skills to develop: ${skillGaps.map(g => g.skill).join(', ')}

Create 4-6 concrete steps with:
1. Step title
2. Description (what to do)
3. Duration estimate
4. Key milestones
5. Recommended resources

Return as JSON array of pathway steps.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career counselor creating practical, achievable career pathways.',
      maxTokens: 1500,
      temperature: 0.7,
    });

    try {
      const steps = JSON.parse(response.content);
      return steps.map((s: any, index: number) => ({
        step: index + 1,
        title: s.title,
        description: s.description,
        duration: s.duration || '3-6 months',
        resources: s.resources || [],
        milestones: s.milestones || [],
      }));
    } catch (error) {
      logger.error('Error parsing pathway steps', { error });
      return this.getDefaultPathwaySteps(career, skillGaps);
    }
  }

  /**
   * Get job outlook for career
   */
  private async getJobOutlook(career: Career): Promise<any> {
    return {
      growthRate: career.growthRate,
      projectedOpenings: Math.floor(Math.random() * 50000) + 10000,
      competitionLevel: career.demandLevel === 'very_high' ? 'medium' : 'high',
      automationRisk: Math.random() * 0.3,
      description: `${career.title} positions are expected to grow at ${career.growthRate}% annually with ${career.demandLevel} demand.`,
    };
  }

  /**
   * Calculate spiritual alignment score
   */
  private calculateSpiritualAlignment(profile: StudentProfile, career: Career): number {
    let score = 50; // Base score

    // Check for ministry opportunities
    if (career.ministryOpportunities && career.ministryOpportunities.length > 0) {
      score += 30;
    }

    // Check values alignment
    const spiritualValues = ['service', 'ministry', 'faith', 'kingdom', 'mission'];
    const hasSpiritualValues = profile.values.some(v =>
      spiritualValues.some(sv => v.toLowerCase().includes(sv))
    );
    if (hasSpiritualValues) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Generate reasoning for match
   */
  private async generateMatchReasoning(
    profile: StudentProfile,
    career: Career,
    matchScore: number,
    skillGaps: SkillGap[]
  ): Promise<string> {
    const prompt = `Explain why this career is a ${matchScore >= 80 ? 'strong' : matchScore >= 60 ? 'good' : 'moderate'} match for this student.

Career: ${career.title}
Match Score: ${matchScore}/100
Skill Gaps: ${skillGaps.length} skills to develop

Student Strengths:
- ${profile.skills.slice(0, 5).map(s => s.name).join(', ')}
- Interests: ${profile.interests.slice(0, 3).join(', ')}

Provide a 2-3 sentence explanation focusing on strengths and growth opportunities.`;

    const response = await this.aiGateway.generateCompletion({
      prompt,
      systemPrompt: 'You are a career counselor providing encouraging, practical guidance.',
      maxTokens: 200,
      temperature: 0.7,
    });

    return response.content.trim();
  }

  /**
   * Helper methods
   */

  private needsImprovement(current: ProficiencyLevel, required: ProficiencyLevel): boolean {
    const levels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return levels[current] < levels[required];
  }

  private getSkillResources(skill: string): LearningResource[] {
    return [
      {
        type: 'course',
        title: `${skill} Fundamentals`,
        provider: 'ScrollUniversity',
        duration: '4-8 weeks',
      },
      {
        type: 'certification',
        title: `${skill} Certification`,
        provider: 'Industry Standard',
        duration: '2-3 months',
      },
    ];
  }

  private estimateSalaryRange(career: Career): any {
    const baseRanges: Record<string, any> = {
      entry: { min: 40000, max: 60000 },
      mid: { min: 60000, max: 90000 },
      senior: { min: 90000, max: 130000 },
      executive: { min: 130000, max: 200000 },
    };

    return { ...baseRanges.mid, currency: 'USD' };
  }

  private getFallbackCareers(profile: StudentProfile): Career[] {
    return [
      {
        id: 'career_fallback_1',
        title: 'Software Developer',
        description: 'Design and develop software applications',
        industry: 'Technology',
        requiredSkills: ['Programming', 'Problem Solving', 'Algorithms'],
        preferredSkills: ['Cloud Computing', 'DevOps'],
        educationRequirements: ['Bachelor\'s in Computer Science or related field'],
        experienceRequirements: '0-2 years',
        growthRate: 22,
        demandLevel: 'very_high',
        ministryOpportunities: ['Tech for missions', 'Digital ministry platforms'],
      },
    ];
  }

  private getDefaultPathwaySteps(career: Career, skillGaps: SkillGap[]): PathwayStep[] {
    return [
      {
        step: 1,
        title: 'Skill Development',
        description: `Focus on developing key skills: ${skillGaps.slice(0, 3).map(g => g.skill).join(', ')}`,
        duration: '3-6 months',
        resources: [],
        milestones: ['Complete foundational courses', 'Build portfolio projects'],
      },
      {
        step: 2,
        title: 'Gain Experience',
        description: 'Seek internships or entry-level positions in the field',
        duration: '6-12 months',
        resources: [],
        milestones: ['Secure internship', 'Complete projects', 'Build network'],
      },
      {
        step: 3,
        title: 'Career Launch',
        description: `Apply for ${career.title} positions`,
        duration: '1-3 months',
        resources: [],
        milestones: ['Update resume', 'Apply to positions', 'Interview preparation'],
      },
    ];
  }
}
