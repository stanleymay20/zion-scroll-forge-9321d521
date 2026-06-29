/**
 * CallingDiscerner - Ministry calling identification and clarity assessment
 * "For many are called, but few are chosen" - Matthew 22:14
 * Assesses divine calling clarity and ministry readiness
 */

import { PrismaClient } from '@prisma/client';

export interface CallingAssessment {
  callingClarity: number;
  divineConfirmation: number;
  ministryReadiness: number;
  kingdomVision: number;
  overallCallingScore: number;
  callingType: CallingType;
  readinessLevel: CallingReadinessLevel;
}

export interface CallingEvidence {
  personalTestimony: string[];
  ministryExperience: string[];
  propheticConfirmation: string[];
  elderEndorsement: string[];
  fruitfulness: string[];
}

export interface CallingRecommendation {
  type: RecommendationType;
  description: string;
  developmentAreas: string[];
  timeframe: string;
  resources: string[];
}

export enum CallingType {
  APOSTOLIC = 'apostolic',
  PROPHETIC = 'prophetic',
  EVANGELISTIC = 'evangelistic',
  PASTORAL = 'pastoral',
  TEACHING = 'teaching',
  MARKETPLACE = 'marketplace',
  INTERCESSION = 'intercession',
  WORSHIP = 'worship',
  ADMINISTRATION = 'administration',
  MERCY = 'mercy',
  UNDEFINED = 'undefined'
}

export enum CallingReadinessLevel {
  EMERGING = 'emerging',
  DEVELOPING = 'developing',
  CONFIRMED = 'confirmed',
  MATURE = 'mature',
  UNCLEAR = 'unclear'
}

export enum RecommendationType {
  IMMEDIATE_ADMISSION = 'immediate_admission',
  CONDITIONAL_ADMISSION = 'conditional_admission',
  PREPARATION_NEEDED = 'preparation_needed',
  FURTHER_DISCERNMENT = 'further_discernment',
  NOT_READY = 'not_ready'
}

export class CallingDiscerner {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Assess ministry calling identification and clarity
   */
  async assessMinistryCallingClarity(
    testimony: string,
    ministryExperience: any[],
    references: any[]
  ): Promise<CallingAssessment> {
    // Analyze calling clarity from testimony
    const callingClarity = await this.analyzeCallingClarity(testimony);
    
    // Assess divine confirmation evidence
    const divineConfirmation = await this.assessDivineConfirmation(
      testimony, 
      references
    );
    
    // Evaluate ministry readiness
    const ministryReadiness = await this.evaluateMinistryReadiness(
      ministryExperience,
      references
    );
    
    // Assess kingdom vision alignment
    const kingdomVision = await this.assessKingdomVision(testimony);
    
    // Calculate overall calling score
    const overallCallingScore = (
      callingClarity * 0.3 +
      divineConfirmation * 0.25 +
      ministryReadiness * 0.25 +
      kingdomVision * 0.2
    );
    
    // Determine calling type and readiness level
    const callingType = await this.identifyCallingType(testimony, ministryExperience);
    const readinessLevel = this.determineReadinessLevel(overallCallingScore, callingClarity);

    return {
      callingClarity,
      divineConfirmation,
      ministryReadiness,
      kingdomVision,
      overallCallingScore,
      callingType,
      readinessLevel
    };
  }

  /**
   * Identify specific calling type based on testimony and experience
   */
  async identifyCallingType(
    testimony: string,
    ministryExperience: any[]
  ): Promise<CallingType> {
    const testimonyLower = testimony.toLowerCase();
    const experienceText = ministryExperience
      .map(exp => `${exp.role} ${exp.description || ''}`)
      .join(' ')
      .toLowerCase();
    
    const combinedText = `${testimonyLower} ${experienceText}`;
    
    // Analyze for calling indicators
    const callingIndicators = {
      [CallingType.APOSTOLIC]: [
        'church planting', 'pioneer', 'new territory', 'breakthrough', 
        'establish', 'foundation', 'apostolic', 'sent one'
      ],
      [CallingType.PROPHETIC]: [
        'prophetic', 'prophecy', 'vision', 'dreams', 'revelation', 
        'word of the lord', 'thus says', 'intercession'
      ],
      [CallingType.EVANGELISTIC]: [
        'evangelist', 'evangelism', 'soul winning', 'outreach', 
        'missions', 'sharing gospel', 'witnessing'
      ],
      [CallingType.PASTORAL]: [
        'pastor', 'shepherd', 'care', 'counseling', 'nurture', 
        'discipleship', 'mentoring', 'pastoral care'
      ],
      [CallingType.TEACHING]: [
        'teacher', 'teaching', 'bible study', 'instruction', 
        'education', 'training', 'equipping'
      ],
      [CallingType.MARKETPLACE]: [
        'business', 'marketplace', 'workplace', 'professional', 
        'corporate', 'entrepreneur', 'secular'
      ],
      [CallingType.WORSHIP]: [
        'worship', 'music', 'praise', 'arts', 'creative', 
        'musician', 'singer', 'worship leader'
      ],
      [CallingType.ADMINISTRATION]: [
        'administration', 'management', 'organization', 'leadership', 
        'coordination', 'planning', 'systems'
      ],
      [CallingType.MERCY]: [
        'mercy', 'compassion', 'helping', 'serving', 'care', 
        'social work', 'humanitarian', 'justice'
      ]
    };
    
    let highestScore = 0;
    let identifiedCalling = CallingType.UNDEFINED;
    
    for (const [callingType, indicators] of Object.entries(callingIndicators)) {
      const score = indicators.reduce((count, indicator) => {
        return count + (combinedText.includes(indicator) ? 1 : 0);
      }, 0);
      
      if (score > highestScore) {
        highestScore = score;
        identifiedCalling = callingType as CallingType;
      }
    }
    
    return identifiedCalling;
  }

  /**
   * Generate calling evidence summary
   */
  async generateCallingEvidence(
    testimony: string,
    ministryExperience: any[],
    references: any[],
    propheticInput?: any[]
  ): Promise<CallingEvidence> {
    const evidence: CallingEvidence = {
      personalTestimony: [],
      ministryExperience: [],
      propheticConfirmation: [],
      elderEndorsement: [],
      fruitfulness: []
    };
    
    // Extract testimony evidence
    if (testimony.toLowerCase().includes('call') || testimony.toLowerCase().includes('purpose')) {
      evidence.personalTestimony.push('Mentions divine calling or purpose in testimony');
    }
    
    if (testimony.toLowerCase().includes('ministry') || testimony.toLowerCase().includes('serve')) {
      evidence.personalTestimony.push('Expresses desire for ministry and service');
    }
    
    // Extract ministry experience evidence
    ministryExperience.forEach(exp => {
      if (exp.role && exp.organization) {
        evidence.ministryExperience.push(
          `Served as ${exp.role} at ${exp.organization} for ${exp.duration || 'unspecified time'}`
        );
      }
      
      if (exp.achievements && exp.achievements.length > 0) {
        evidence.fruitfulness.push(`Achievements: ${exp.achievements.join(', ')}`);
      }
    });
    
    // Extract reference evidence
    references.forEach(ref => {
      if (ref.relationship?.toLowerCase().includes('pastor') || 
          ref.relationship?.toLowerCase().includes('elder')) {
        evidence.elderEndorsement.push(
          `${ref.relationship} endorsement: ${ref.content?.substring(0, 100) || 'Positive reference'}`
        );
      }
      
      if (ref.content?.toLowerCase().includes('call') || 
          ref.content?.toLowerCase().includes('gift')) {
        evidence.propheticConfirmation.push(
          `Reference confirms calling or spiritual gifts: ${ref.content.substring(0, 100)}`
        );
      }
    });
    
    // Add prophetic input if available
    if (propheticInput && propheticInput.length > 0) {
      propheticInput.forEach(input => {
        evidence.propheticConfirmation.push(
          `Prophetic input: ${input.content || input.description || 'Prophetic confirmation received'}`
        );
      });
    }
    
    return evidence;
  }

  /**
   * Generate calling recommendations
   */
  async generateCallingRecommendations(
    assessment: CallingAssessment,
    evidence: CallingEvidence
  ): Promise<CallingRecommendation[]> {
    const recommendations: CallingRecommendation[] = [];
    
    // Primary recommendation based on overall score
    if (assessment.overallCallingScore >= 85) {
      recommendations.push({
        type: RecommendationType.IMMEDIATE_ADMISSION,
        description: 'Strong calling clarity and confirmation. Ready for advanced ministry training.',
        developmentAreas: ['Continue in current trajectory', 'Seek deeper prophetic training'],
        timeframe: 'Immediate',
        resources: ['Advanced ministry courses', 'Prophetic training modules']
      });
    } else if (assessment.overallCallingScore >= 70) {
      recommendations.push({
        type: RecommendationType.CONDITIONAL_ADMISSION,
        description: 'Good calling foundation with room for development. Suitable for structured program.',
        developmentAreas: this.identifyDevelopmentAreas(assessment),
        timeframe: '3-6 months preparation',
        resources: ['Calling clarification workshops', 'Ministry mentorship program']
      });
    } else if (assessment.overallCallingScore >= 50) {
      recommendations.push({
        type: RecommendationType.PREPARATION_NEEDED,
        description: 'Emerging calling needs further development and confirmation.',
        developmentAreas: this.identifyDevelopmentAreas(assessment),
        timeframe: '6-12 months preparation',
        resources: ['Calling discovery course', 'Spiritual mentorship', 'Ministry exploration']
      });
    } else if (assessment.overallCallingScore >= 30) {
      recommendations.push({
        type: RecommendationType.FURTHER_DISCERNMENT,
        description: 'Calling unclear. Recommend focused discernment process.',
        developmentAreas: ['Calling discernment', 'Spiritual formation', 'Ministry exploration'],
        timeframe: '12-18 months discernment',
        resources: ['Calling discernment retreat', 'Prophetic ministry', 'Elder counseling']
      });
    } else {
      recommendations.push({
        type: RecommendationType.NOT_READY,
        description: 'Insufficient calling clarity. Recommend foundational spiritual development.',
        developmentAreas: ['Basic discipleship', 'Spiritual formation', 'Character development'],
        timeframe: '18+ months foundation building',
        resources: ['Discipleship program', 'Character development', 'Basic ministry training']
      });
    }
    
    // Specific recommendations based on calling type
    if (assessment.callingType !== CallingType.UNDEFINED) {
      recommendations.push(this.generateCallingSpecificRecommendation(assessment.callingType));
    }
    
    return recommendations;
  }

  // Private helper methods

  private async analyzeCallingClarity(testimony: string): Promise<number> {
    let score = 35; // Increased base score
    
    const testimonyLower = testimony.toLowerCase();
    
    // Check for calling-related keywords
    const callingKeywords = [
      'called', 'calling', 'purpose', 'destiny', 'mission', 
      'vision', 'burden', 'passion', 'ministry', 'serve'
    ];
    
    callingKeywords.forEach(keyword => {
      if (testimonyLower.includes(keyword)) {
        score += 10; // Increased from 8
      }
    });
    
    // Check for specificity
    if (testimonyLower.includes('specific') || testimonyLower.includes('clear')) {
      score += 15;
    }
    
    // Check for divine confirmation language
    const confirmationWords = ['god told me', 'lord showed me', 'holy spirit', 'confirmed', 'revelation'];
    confirmationWords.forEach(word => {
      if (testimonyLower.includes(word)) {
        score += 12; // Increased from 10
      }
    });
    
    // Check for timeline and process
    if (testimonyLower.includes('over time') || testimonyLower.includes('gradually') || 
        testimonyLower.includes('process')) {
      score += 10;
    }
    
    // Additional scoring for strong testimony content
    if (testimonyLower.includes('god has called') || testimonyLower.includes('lord has called')) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  private async assessDivineConfirmation(
    testimony: string,
    references: any[]
  ): Promise<number> {
    let score = 25; // Base score
    
    const testimonyLower = testimony.toLowerCase();
    
    // Check for divine confirmation in testimony
    const confirmationIndicators = [
      'god confirmed', 'lord confirmed', 'holy spirit confirmed',
      'prophecy', 'prophetic word', 'word from god', 'vision',
      'dream', 'supernatural', 'miraculous', 'divine appointment'
    ];
    
    confirmationIndicators.forEach(indicator => {
      if (testimonyLower.includes(indicator)) {
        score += 12;
      }
    });
    
    // Check references for confirmation
    references.forEach(ref => {
      if (ref.content) {
        const refContent = ref.content.toLowerCase();
        if (refContent.includes('call') || refContent.includes('gift') || 
            refContent.includes('anointing') || refContent.includes('ministry')) {
          score += 15;
        }
      }
    });
    
    // Check for multiple confirmations
    if (references.length >= 2) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  private async evaluateMinistryReadiness(
    ministryExperience: any[],
    references: any[]
  ): Promise<number> {
    let score = 20; // Base score
    
    // Evaluate ministry experience
    ministryExperience.forEach(exp => {
      if (exp.role && exp.organization) {
        score += 15;
      }
      
      if (exp.duration) {
        const duration = exp.duration.toLowerCase();
        if (duration.includes('year')) {
          const years = parseInt(duration.match(/\d+/)?.[0] || '0');
          score += Math.min(years * 5, 25);
        }
      }
      
      if (exp.achievements && exp.achievements.length > 0) {
        score += 10;
      }
      
      if (exp.responsibilities && exp.responsibilities.length > 2) {
        score += 8;
      }
    });
    
    // Check references for ministry effectiveness
    references.forEach(ref => {
      if (ref.content) {
        const refContent = ref.content.toLowerCase();
        if (refContent.includes('effective') || refContent.includes('fruitful') || 
            refContent.includes('successful') || refContent.includes('impact')) {
          score += 12;
        }
      }
    });
    
    return Math.min(score, 100);
  }

  private async assessKingdomVision(testimony: string): Promise<number> {
    let score = 35; // Base score
    
    const testimonyLower = testimony.toLowerCase();
    
    // Check for kingdom-focused language
    const kingdomKeywords = [
      'kingdom', 'kingdom of god', 'kingdom of heaven', 'advance the kingdom',
      'god\'s kingdom', 'kingdom work', 'kingdom impact', 'kingdom purposes',
      'great commission', 'make disciples', 'transform', 'change the world'
    ];
    
    kingdomKeywords.forEach(keyword => {
      if (testimonyLower.includes(keyword)) {
        score += 10;
      }
    });
    
    // Check for global perspective
    const globalKeywords = [
      'nations', 'world', 'global', 'international', 'cross-cultural',
      'missions', 'unreached', 'every tribe', 'all peoples'
    ];
    
    globalKeywords.forEach(keyword => {
      if (testimonyLower.includes(keyword)) {
        score += 8;
      }
    });
    
    // Check for transformation focus
    const transformationKeywords = [
      'transform', 'change', 'impact', 'influence', 'difference',
      'breakthrough', 'revival', 'awakening', 'reformation'
    ];
    
    transformationKeywords.forEach(keyword => {
      if (testimonyLower.includes(keyword)) {
        score += 6;
      }
    });
    
    return Math.min(score, 100);
  }

  private determineReadinessLevel(
    overallScore: number,
    callingClarity: number
  ): CallingReadinessLevel {
    if (overallScore >= 85 && callingClarity >= 80) {
      return CallingReadinessLevel.MATURE;
    } else if (overallScore >= 70 && callingClarity >= 65) {
      return CallingReadinessLevel.CONFIRMED;
    } else if (overallScore >= 50 && callingClarity >= 45) {
      return CallingReadinessLevel.DEVELOPING;
    } else if (overallScore >= 30) {
      return CallingReadinessLevel.EMERGING;
    } else {
      return CallingReadinessLevel.UNCLEAR;
    }
  }

  private identifyDevelopmentAreas(assessment: CallingAssessment): string[] {
    const areas: string[] = [];
    
    if (assessment.callingClarity < 70) {
      areas.push('Calling clarity and discernment');
    }
    
    if (assessment.divineConfirmation < 60) {
      areas.push('Seeking divine confirmation and prophetic input');
    }
    
    if (assessment.ministryReadiness < 65) {
      areas.push('Ministry experience and practical training');
    }
    
    if (assessment.kingdomVision < 60) {
      areas.push('Kingdom vision and global perspective');
    }
    
    return areas;
  }

  private generateCallingSpecificRecommendation(callingType: CallingType): CallingRecommendation {
    const recommendations = {
      [CallingType.APOSTOLIC]: {
        type: RecommendationType.CONDITIONAL_ADMISSION,
        description: 'Apostolic calling identified. Recommend leadership and church planting track.',
        developmentAreas: ['Leadership development', 'Church planting training', 'Cross-cultural ministry'],
        timeframe: 'Advanced track - 2-3 years',
        resources: ['Apostolic training program', 'Leadership mentorship', 'Church planting resources']
      },
      [CallingType.PROPHETIC]: {
        type: RecommendationType.CONDITIONAL_ADMISSION,
        description: 'Prophetic calling identified. Recommend prophetic ministry and intercession track.',
        developmentAreas: ['Prophetic training', 'Intercession', 'Spiritual discernment'],
        timeframe: 'Specialized track - 2-3 years',
        resources: ['Prophetic school', 'Intercession training', 'Spiritual warfare']
      },
      [CallingType.TEACHING]: {
        type: RecommendationType.IMMEDIATE_ADMISSION,
        description: 'Teaching calling identified. Excellent fit for ScrollUniversity program.',
        developmentAreas: ['Advanced biblical studies', 'Curriculum development', 'Educational methods'],
        timeframe: 'Standard track - 2-4 years',
        resources: ['Teaching methodology', 'Biblical studies', 'Educational technology']
      },
      [CallingType.PASTORAL]: {
        type: RecommendationType.CONDITIONAL_ADMISSION,
        description: 'Pastoral calling identified. Recommend pastoral care and counseling track.',
        developmentAreas: ['Pastoral care', 'Counseling skills', 'Church administration'],
        timeframe: 'Pastoral track - 3-4 years',
        resources: ['Pastoral training', 'Counseling certification', 'Church leadership']
      }
    };
    
    return recommendations[callingType] || {
      type: RecommendationType.CONDITIONAL_ADMISSION,
      description: `${callingType} calling identified. Recommend specialized ministry track.`,
      developmentAreas: ['Ministry specialization', 'Practical training', 'Mentorship'],
      timeframe: 'Specialized track - 2-3 years',
      resources: ['Ministry training', 'Practical experience', 'Specialized mentorship']
    };
  }
}