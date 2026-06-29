/**
 * ScrollAlignmentEvaluator - Scroll alignment evaluation and scoring
 * "Thy kingdom come, thy will be done on earth as it is in heaven" - Matthew 6:10
 * Evaluates alignment with ScrollUniversity's kingdom-focused educational philosophy
 */

import { PrismaClient } from '@prisma/client';

export interface ScrollAlignmentAssessment {
  kingdomMindset: number;
  scrollPhilosophy: number;
  transformationalLearning: number;
  propheticEducation: number;
  globalImpact: number;
  overallAlignment: number;
  alignmentLevel: AlignmentLevel;
}

export interface AlignmentEvidence {
  kingdomLanguage: string[];
  transformationalThinking: string[];
  globalPerspective: string[];
  propheticSensitivity: string[];
  scrollValues: string[];
}

export interface AlignmentRecommendation {
  strengthAreas: string[];
  developmentNeeds: string[];
  preparationActivities: string[];
  timeframe: string;
  resources: string[];
}

export enum AlignmentLevel {
  EXCEPTIONAL = 'exceptional',
  STRONG = 'strong',
  ADEQUATE = 'adequate',
  DEVELOPING = 'developing',
  MISALIGNED = 'misaligned'
}

export class ScrollAlignmentEvaluator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Evaluate scroll alignment and scoring
   */
  async evaluateScrollAlignment(
    testimony: string,
    personalStatement: string,
    academicHistory: any[],
    references: any[]
  ): Promise<ScrollAlignmentAssessment> {
    const combinedText = `${testimony} ${personalStatement}`.toLowerCase();
    
    // Assess different alignment dimensions
    const kingdomMindset = await this.assessKingdomMindset(combinedText);
    const scrollPhilosophy = await this.assessScrollPhilosophy(combinedText, academicHistory);
    const transformationalLearning = await this.assessTransformationalLearning(combinedText);
    const propheticEducation = await this.assessPropheticEducation(combinedText, references);
    const globalImpact = await this.assessGlobalImpact(combinedText);
    
    // Calculate overall alignment score
    const overallAlignment = (
      kingdomMindset * 0.25 +
      scrollPhilosophy * 0.2 +
      transformationalLearning * 0.2 +
      propheticEducation * 0.2 +
      globalImpact * 0.15
    );
    
    const alignmentLevel = this.determineAlignmentLevel(overallAlignment);

    return {
      kingdomMindset,
      scrollPhilosophy,
      transformationalLearning,
      propheticEducation,
      globalImpact,
      overallAlignment,
      alignmentLevel
    };
  }

  /**
   * Generate alignment evidence summary
   */
  async generateAlignmentEvidence(
    testimony: string,
    personalStatement: string,
    references: any[]
  ): Promise<AlignmentEvidence> {
    const combinedText = `${testimony} ${personalStatement}`.toLowerCase();
    
    const evidence: AlignmentEvidence = {
      kingdomLanguage: [],
      transformationalThinking: [],
      globalPerspective: [],
      propheticSensitivity: [],
      scrollValues: []
    };
    
    // Extract kingdom language evidence
    const kingdomTerms = [
      'kingdom of god', 'kingdom of heaven', 'kingdom work', 'kingdom purposes',
      'god\'s kingdom', 'advance the kingdom', 'kingdom impact', 'kingdom mindset'
    ];
    
    kingdomTerms.forEach(term => {
      if (combinedText.includes(term)) {
        evidence.kingdomLanguage.push(`Uses kingdom language: "${term}"`);
      }
    });
    
    // Extract transformational thinking evidence
    const transformationTerms = [
      'transform', 'transformation', 'change', 'impact', 'influence',
      'breakthrough', 'paradigm shift', 'revolutionary', 'innovative'
    ];
    
    transformationTerms.forEach(term => {
      if (combinedText.includes(term)) {
        evidence.transformationalThinking.push(`Demonstrates transformational thinking: "${term}"`);
      }
    });
    
    // Extract global perspective evidence
    const globalTerms = [
      'nations', 'global', 'international', 'world', 'cross-cultural',
      'missions', 'unreached', 'every tribe', 'all peoples', 'worldwide'
    ];
    
    globalTerms.forEach(term => {
      if (combinedText.includes(term)) {
        evidence.globalPerspective.push(`Shows global perspective: "${term}"`);
      }
    });
    
    // Extract prophetic sensitivity evidence
    const propheticTerms = [
      'prophetic', 'prophecy', 'revelation', 'vision', 'dreams',
      'holy spirit', 'discernment', 'spiritual insight', 'divine guidance'
    ];
    
    propheticTerms.forEach(term => {
      if (combinedText.includes(term)) {
        evidence.propheticSensitivity.push(`Demonstrates prophetic sensitivity: "${term}"`);
      }
    });
    
    // Extract scroll values evidence
    const scrollValues = [
      'excellence', 'integrity', 'innovation', 'collaboration',
      'servant leadership', 'stewardship', 'wisdom', 'truth'
    ];
    
    scrollValues.forEach(value => {
      if (combinedText.includes(value)) {
        evidence.scrollValues.push(`Aligns with scroll values: "${value}"`);
      }
    });
    
    // Add reference evidence
    references.forEach(ref => {
      if (ref.content) {
        const refContent = ref.content.toLowerCase();
        if (refContent.includes('kingdom') || refContent.includes('transform')) {
          evidence.kingdomLanguage.push(`Reference confirms kingdom mindset`);
        }
        if (refContent.includes('innovative') || refContent.includes('creative')) {
          evidence.transformationalThinking.push(`Reference confirms innovative thinking`);
        }
      }
    });
    
    return evidence;
  }

  /**
   * Generate alignment recommendations
   */
  async generateAlignmentRecommendations(
    assessment: ScrollAlignmentAssessment,
    evidence: AlignmentEvidence
  ): Promise<AlignmentRecommendation> {
    const strengthAreas: string[] = [];
    const developmentNeeds: string[] = [];
    const preparationActivities: string[] = [];
    const resources: string[] = [];
    
    // Identify strength areas
    if (assessment.kingdomMindset >= 75) {
      strengthAreas.push('Strong kingdom mindset and perspective');
    }
    if (assessment.scrollPhilosophy >= 70) {
      strengthAreas.push('Good understanding of scroll educational philosophy');
    }
    if (assessment.transformationalLearning >= 70) {
      strengthAreas.push('Embraces transformational learning approach');
    }
    if (assessment.propheticEducation >= 65) {
      strengthAreas.push('Open to prophetic and spiritual education');
    }
    if (assessment.globalImpact >= 70) {
      strengthAreas.push('Global perspective and kingdom impact vision');
    }
    
    // Identify development needs
    if (assessment.kingdomMindset < 60) {
      developmentNeeds.push('Kingdom mindset and biblical worldview development');
      preparationActivities.push('Kingdom mindset training and biblical worldview courses');
      resources.push('Kingdom theology resources', 'Biblical worldview materials');
    }
    
    if (assessment.scrollPhilosophy < 55) {
      developmentNeeds.push('Understanding of scroll educational philosophy');
      preparationActivities.push('ScrollUniversity orientation and philosophy immersion');
      resources.push('Scroll educational philosophy materials', 'University mission and vision study');
    }
    
    if (assessment.transformationalLearning < 60) {
      developmentNeeds.push('Transformational learning mindset');
      preparationActivities.push('Transformational learning workshops and paradigm shift training');
      resources.push('Transformational education resources', 'Innovation and creativity training');
    }
    
    if (assessment.propheticEducation < 50) {
      developmentNeeds.push('Openness to prophetic and spiritual education');
      preparationActivities.push('Prophetic ministry introduction and spiritual discernment training');
      resources.push('Prophetic ministry resources', 'Spiritual discernment materials');
    }
    
    if (assessment.globalImpact < 55) {
      developmentNeeds.push('Global perspective and kingdom impact vision');
      preparationActivities.push('Global missions exposure and cross-cultural training');
      resources.push('Global missions resources', 'Cross-cultural ministry materials');
    }
    
    // Determine timeframe based on alignment level
    let timeframe: string;
    switch (assessment.alignmentLevel) {
      case AlignmentLevel.EXCEPTIONAL:
        timeframe = 'Ready for immediate enrollment';
        break;
      case AlignmentLevel.STRONG:
        timeframe = '1-3 months orientation and preparation';
        break;
      case AlignmentLevel.ADEQUATE:
        timeframe = '3-6 months preparation and alignment development';
        break;
      case AlignmentLevel.DEVELOPING:
        timeframe = '6-12 months intensive preparation and worldview development';
        break;
      case AlignmentLevel.MISALIGNED:
        timeframe = '12+ months foundational preparation and paradigm shift';
        break;
    }
    
    return {
      strengthAreas,
      developmentNeeds,
      preparationActivities,
      timeframe,
      resources
    };
  }

  // Private helper methods

  private async assessKingdomMindset(combinedText: string): Promise<number> {
    let score = 40; // Increased base score
    
    // Kingdom-focused language
    const kingdomTerms = [
      'kingdom of god', 'kingdom of heaven', 'kingdom work', 'kingdom purposes',
      'god\'s kingdom', 'advance the kingdom', 'kingdom impact', 'kingdom mindset',
      'thy kingdom come', 'kingdom first', 'seek first the kingdom', 'kingdom'
    ];
    
    kingdomTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 10; // Increased from 8
      }
    });
    
    // Biblical worldview indicators
    const worldviewTerms = [
      'biblical worldview', 'christian worldview', 'god\'s perspective',
      'eternal perspective', 'heavenly perspective', 'divine viewpoint'
    ];
    
    worldviewTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 12; // Increased from 10
      }
    });
    
    // Stewardship and responsibility
    const stewardshipTerms = [
      'stewardship', 'steward', 'responsibility', 'accountable',
      'faithful', 'trustworthy', 'manage', 'oversee'
    ];
    
    stewardshipTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 8; // Increased from 6
      }
    });
    
    // Additional scoring for strong kingdom language
    if (combinedText.includes('advancing god\'s kingdom') || 
        combinedText.includes('kingdom through education')) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  private async assessScrollPhilosophy(
    combinedText: string,
    academicHistory: any[]
  ): Promise<number> {
    let score = 25; // Base score
    
    // Scroll-specific terms and concepts
    const scrollTerms = [
      'scroll', 'scrolluniversity', 'prophetic education', 'kingdom education',
      'transformational learning', 'divine wisdom', 'revelation knowledge'
    ];
    
    scrollTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 12;
      }
    });
    
    // Educational philosophy alignment
    const educationTerms = [
      'holistic education', 'integrated learning', 'experiential learning',
      'practical application', 'real-world impact', 'character formation'
    ];
    
    educationTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 8;
      }
    });
    
    // Innovation and excellence
    const excellenceTerms = [
      'excellence', 'innovation', 'creativity', 'breakthrough',
      'cutting-edge', 'pioneering', 'revolutionary', 'paradigm shift'
    ];
    
    excellenceTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 6;
      }
    });
    
    // Academic background alignment
    if (academicHistory.some(edu => 
      edu.institution?.toLowerCase().includes('christian') ||
      edu.institution?.toLowerCase().includes('biblical') ||
      edu.degree?.toLowerCase().includes('theology') ||
      edu.degree?.toLowerCase().includes('ministry')
    )) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  private async assessTransformationalLearning(combinedText: string): Promise<number> {
    let score = 35; // Base score
    
    // Transformation language
    const transformationTerms = [
      'transform', 'transformation', 'transformational', 'change',
      'metamorphosis', 'renewal', 'reformation', 'revolution'
    ];
    
    transformationTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 8;
      }
    });
    
    // Growth mindset indicators
    const growthTerms = [
      'growth', 'develop', 'learn', 'improve', 'progress',
      'evolve', 'advance', 'mature', 'expand'
    ];
    
    growthTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 5;
      }
    });
    
    // Application and impact focus
    const applicationTerms = [
      'apply', 'implement', 'practice', 'use', 'impact',
      'influence', 'difference', 'change lives', 'make a difference'
    ];
    
    applicationTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 6;
      }
    });
    
    return Math.min(score, 100);
  }

  private async assessPropheticEducation(
    combinedText: string,
    references: any[]
  ): Promise<number> {
    let score = 20; // Base score
    
    // Prophetic sensitivity
    const propheticTerms = [
      'prophetic', 'prophecy', 'prophet', 'revelation', 'vision',
      'dreams', 'divine insight', 'spiritual discernment', 'holy spirit'
    ];
    
    propheticTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 10;
      }
    });
    
    // Spiritual education openness
    const spiritualTerms = [
      'spiritual formation', 'spiritual growth', 'spiritual education',
      'divine wisdom', 'godly wisdom', 'spiritual insight'
    ];
    
    spiritualTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 8;
      }
    });
    
    // Supernatural openness
    const supernaturalTerms = [
      'supernatural', 'miraculous', 'divine intervention',
      'god\'s power', 'holy spirit power', 'spiritual gifts'
    ];
    
    supernaturalTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 12;
      }
    });
    
    // Reference confirmation
    references.forEach(ref => {
      if (ref.content) {
        const refContent = ref.content.toLowerCase();
        if (refContent.includes('prophetic') || refContent.includes('spiritual') ||
            refContent.includes('discernment') || refContent.includes('wisdom')) {
          score += 8;
        }
      }
    });
    
    return Math.min(score, 100);
  }

  private async assessGlobalImpact(combinedText: string): Promise<number> {
    let score = 40; // Base score
    
    // Global perspective
    const globalTerms = [
      'global', 'international', 'worldwide', 'nations', 'world',
      'cross-cultural', 'multicultural', 'universal', 'planetary'
    ];
    
    globalTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 8;
      }
    });
    
    // Missions and outreach
    const missionsTerms = [
      'missions', 'missionary', 'outreach', 'evangelism',
      'great commission', 'unreached', 'every tribe', 'all peoples'
    ];
    
    missionsTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 10;
      }
    });
    
    // Impact and influence
    const impactTerms = [
      'impact', 'influence', 'change the world', 'make a difference',
      'transform society', 'kingdom impact', 'global transformation'
    ];
    
    impactTerms.forEach(term => {
      if (combinedText.includes(term)) {
        score += 7;
      }
    });
    
    return Math.min(score, 100);
  }

  private determineAlignmentLevel(overallAlignment: number): AlignmentLevel {
    if (overallAlignment >= 85) {
      return AlignmentLevel.EXCEPTIONAL;
    } else if (overallAlignment >= 70) {
      return AlignmentLevel.STRONG;
    } else if (overallAlignment >= 55) {
      return AlignmentLevel.ADEQUATE;
    } else if (overallAlignment >= 35) {
      return AlignmentLevel.DEVELOPING;
    } else {
      return AlignmentLevel.MISALIGNED;
    }
  }
}