/**
 * SpiritualAssessor - Core spiritual maturity evaluation service
 * "Test the spirits to see whether they are from God" - 1 John 4:1
 */

import { PrismaClient } from '@prisma/client';
import { CallingDiscerner, CallingAssessment } from './CallingDiscerner';
import { ScrollAlignmentEvaluator, ScrollAlignmentAssessment } from './ScrollAlignmentEvaluator';
import { SpiritualRecommendationGenerator, ComprehensiveRecommendationProfile } from './SpiritualRecommendationGenerator';
import { PropheticInputIntegrator, PropheticInput } from './PropheticInputIntegrator';

export interface TestimonyAssessment {
  authenticity: number;
  clarity: number;
  depth: number;
  transformation: number;
  kingdomFocus: number;
  overallScore: number;
}

export interface SpiritualMaturityMetrics {
  prayerLife: number;
  biblicalKnowledge: number;
  spiritualFruit: number;
  discipleship: number;
  servanthood: number;
  overallMaturity: MaturityLevel;
}

export interface CharacterTraitAssessment {
  trait: string;
  score: number;
  evidence: string[];
  growthAreas: string[];
}

export interface MinistryExperienceValidation {
  role: string;
  organization: string;
  duration: string;
  responsibilities: string[];
  impact: string;
  verified: boolean;
  verificationSource: string;
}

export class SpiritualAssessor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Assess personal testimony for authenticity and spiritual depth
   */
  async assessPersonalTestimony(testimony: string): Promise<TestimonyAssessment> {
    // AI-powered testimony analysis
    const authenticityScore = await this.analyzeAuthenticity(testimony);
    const clarityScore = await this.analyzeClarityOfConversion(testimony);
    const depthScore = await this.analyzeSpritualDepth(testimony);
    const transformationScore = await this.analyzeTransformationEvidence(testimony);
    const kingdomFocusScore = await this.analyzeKingdomFocus(testimony);

    const overallScore = (
      authenticityScore + clarityScore + depthScore + 
      transformationScore + kingdomFocusScore
    ) / 5;

    return {
      authenticity: authenticityScore,
      clarity: clarityScore,
      depth: depthScore,
      transformation: transformationScore,
      kingdomFocus: kingdomFocusScore,
      overallScore
    };
  }

  /**
   * Evaluate spiritual maturity across multiple dimensions
   */
  async evaluateSpiritualMaturity(
    applicationData: any,
    testimony: string,
    references: any[]
  ): Promise<SpiritualMaturityMetrics> {
    const prayerLife = await this.assessPrayerLife(applicationData, testimony);
    const biblicalKnowledge = await this.assessBiblicalKnowledge(applicationData);
    const spiritualFruit = await this.assessSpiritualFruit(testimony, references);
    const discipleship = await this.assessDiscipleshipExperience(applicationData);
    const servanthood = await this.assessServanthoodEvidence(applicationData, references);

    const overallMaturity = this.determineMaturityLevel({
      prayerLife,
      biblicalKnowledge,
      spiritualFruit,
      discipleship,
      servanthood
    });

    return {
      prayerLife,
      biblicalKnowledge,
      spiritualFruit,
      discipleship,
      servanthood,
      overallMaturity
    };
  }

  /**
   * Assess character traits based on testimony and references
   */
  async assessCharacterTraits(
    testimony: string,
    references: any[]
  ): Promise<CharacterTraitAssessment[]> {
    const coreTraits = [
      'integrity',
      'humility',
      'faithfulness',
      'compassion',
      'wisdom',
      'courage',
      'perseverance',
      'gentleness'
    ];

    const assessments: CharacterTraitAssessment[] = [];

    for (const trait of coreTraits) {
      const assessment = await this.assessSingleCharacterTrait(
        trait,
        testimony,
        references
      );
      assessments.push(assessment);
    }

    return assessments;
  }

  /**
   * Validate ministry experience claims
   */
  async validateMinistryExperience(
    experienceData: any[]
  ): Promise<MinistryExperienceValidation[]> {
    const validations: MinistryExperienceValidation[] = [];

    for (const experience of experienceData) {
      const validation = await this.validateSingleMinistryExperience(experience);
      validations.push(validation);
    }

    return validations;
  }

  /**
   * Create comprehensive spiritual evaluation
   */
  async createSpiritualEvaluation(
    applicationId: string,
    evaluatorType: EvaluatorType = 'AI_ASSESSMENT' as EvaluatorType,
    evaluatorId?: string
  ): Promise<SpiritualEvaluation> {
    // Get application data
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Extract relevant data
    const testimony = application.spiritualTestimony || '';
    const references = application.characterReferences as any[] || [];
    const applicationData = {
      personalStatement: application.personalStatement,
      academicHistory: application.academicHistory,
      documents: application.documents
    };

    // Perform assessments
    const testimonyAssessment = await this.assessPersonalTestimony(testimony);
    const maturityMetrics = await this.evaluateSpiritualMaturity(
      applicationData,
      testimony,
      references
    );
    const characterTraits = await this.assessCharacterTraits(testimony, references);
    const ministryExperience = await this.validateMinistryExperience(
      applicationData.documents?.filter((doc: any) => doc.type === 'ministry_experience') || []
    );

    // Create spiritual evaluation record
    const spiritualEvaluation = await this.prisma.spiritualEvaluation.create({
      data: {
        applicationId,
        evaluatorId,
        evaluatorType,
        personalTestimony: testimonyAssessment,
        spiritualMaturity: maturityMetrics.overallMaturity,
        characterTraits,
        ministryExperience,
        authenticityScore: testimonyAssessment.authenticity,
        clarityScore: testimonyAssessment.clarity,
        depthScore: testimonyAssessment.depth,
        transformationScore: testimonyAssessment.transformation,
        kingdomFocusScore: testimonyAssessment.kingdomFocus,
        overallScore: testimonyAssessment.overallScore
      }
    });

    return spiritualEvaluation;
  }

  // Private helper methods

  private async analyzeAuthenticity(testimony: string): Promise<number> {
    // AI analysis for testimony authenticity
    // Look for genuine personal experience markers
    const markers = [
      'personal pronouns usage',
      'specific details and dates',
      'emotional authenticity',
      'consistency in narrative',
      'absence of clichés'
    ];

    // Simulate AI analysis (in real implementation, use actual AI service)
    let score = 0;
    
    if (testimony.length > 100) score += 20;
    if (testimony.includes('I') || testimony.includes('my')) score += 20;
    if (/\d{4}/.test(testimony)) score += 20; // Contains years
    if (testimony.split('.').length > 3) score += 20; // Multiple sentences
    if (!testimony.includes('blessed') || !testimony.includes('amazing')) score += 20;

    return Math.min(score, 100);
  }

  private async analyzeClarityOfConversion(testimony: string): Promise<number> {
    // Analyze clarity of conversion experience
    const conversionMarkers = [
      'before and after',
      'specific moment',
      'decision point',
      'life change',
      'surrender'
    ];

    let score = 50; // Base score
    
    if (testimony.toLowerCase().includes('before')) score += 10;
    if (testimony.toLowerCase().includes('after')) score += 10;
    if (testimony.toLowerCase().includes('jesus') || testimony.toLowerCase().includes('christ')) score += 15;
    if (testimony.toLowerCase().includes('saved') || testimony.toLowerCase().includes('born again')) score += 15;

    return Math.min(score, 100);
  }

  private async analyzeSpritualDepth(testimony: string): Promise<number> {
    // Analyze depth of spiritual understanding
    const depthMarkers = [
      'scripture references',
      'theological concepts',
      'spiritual growth',
      'relationship with God',
      'ongoing journey'
    ];

    let score = 40;
    
    if (testimony.length > 500) score += 20;
    if (/\b(God|Lord|Jesus|Christ|Holy Spirit)\b/gi.test(testimony)) score += 20;
    if (testimony.toLowerCase().includes('grow') || testimony.toLowerCase().includes('learn')) score += 20;

    return Math.min(score, 100);
  }

  private async analyzeTransformationEvidence(testimony: string): Promise<number> {
    // Look for evidence of life transformation
    const transformationMarkers = [
      'changed behavior',
      'new priorities',
      'relationship improvements',
      'character development',
      'lifestyle changes'
    ];

    let score = 45;
    
    if (testimony.toLowerCase().includes('change') || testimony.toLowerCase().includes('different')) score += 15;
    if (testimony.toLowerCase().includes('family') || testimony.toLowerCase().includes('relationship')) score += 15;
    if (testimony.toLowerCase().includes('forgive') || testimony.toLowerCase().includes('love')) score += 25;

    return Math.min(score, 100);
  }

  private async analyzeKingdomFocus(testimony: string): Promise<number> {
    // Analyze focus on God's kingdom and purposes
    const kingdomMarkers = [
      'serving others',
      'ministry calling',
      'kingdom purposes',
      'God\'s will',
      'making disciples'
    ];

    let score = 35;
    
    if (testimony.toLowerCase().includes('serve') || testimony.toLowerCase().includes('ministry')) score += 20;
    if (testimony.toLowerCase().includes('call') || testimony.toLowerCase().includes('purpose')) score += 20;
    if (testimony.toLowerCase().includes('others') || testimony.toLowerCase().includes('people')) score += 25;

    return Math.min(score, 100);
  }

  private async assessPrayerLife(applicationData: any, testimony: string): Promise<number> {
    // Assess evidence of active prayer life
    let score = 50;
    
    if (testimony.toLowerCase().includes('pray') || testimony.toLowerCase().includes('prayer')) score += 25;
    if (testimony.toLowerCase().includes('quiet time') || testimony.toLowerCase().includes('devotion')) score += 25;

    return Math.min(score, 100);
  }

  private async assessBiblicalKnowledge(applicationData: any): Promise<number> {
    // Assess biblical knowledge and understanding
    let score = 60; // Base assumption of some knowledge
    
    // In real implementation, this could include a biblical knowledge assessment
    return score;
  }

  private async assessSpiritualFruit(testimony: string, references: any[]): Promise<number> {
    // Assess evidence of spiritual fruit (Galatians 5:22-23)
    const fruitMarkers = ['love', 'joy', 'peace', 'patience', 'kindness', 'goodness', 'faithfulness', 'gentleness', 'self-control'];
    
    let score = 40;
    
    for (const fruit of fruitMarkers) {
      if (testimony.toLowerCase().includes(fruit)) {
        score += 7;
      }
    }

    // Check references for character confirmation
    if (references.length > 0) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private async assessDiscipleshipExperience(applicationData: any): Promise<number> {
    // Assess discipleship and mentoring experience
    let score = 45;
    
    // This would be enhanced with actual discipleship history data
    return score;
  }

  private async assessServanthoodEvidence(applicationData: any, references: any[]): Promise<number> {
    // Assess evidence of servant leadership and service
    let score = 50;
    
    if (references.some((ref: any) => ref.content?.toLowerCase().includes('serve'))) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  private determineMaturityLevel(metrics: {
    prayerLife: number;
    biblicalKnowledge: number;
    spiritualFruit: number;
    discipleship: number;
    servanthood: number;
  }): MaturityLevel {
    const average = (
      metrics.prayerLife + 
      metrics.biblicalKnowledge + 
      metrics.spiritualFruit + 
      metrics.discipleship + 
      metrics.servanthood
    ) / 5;

    if (average >= 90) return 'PROPHET' as MaturityLevel;
    if (average >= 80) return 'ELDER' as MaturityLevel;
    if (average >= 70) return 'MATURE' as MaturityLevel;
    if (average >= 60) return 'GROWING' as MaturityLevel;
    if (average >= 40) return 'NEW_BELIEVER' as MaturityLevel;
    return 'SEEKER' as MaturityLevel;
  }

  private async assessSingleCharacterTrait(
    trait: string,
    testimony: string,
    references: any[]
  ): Promise<CharacterTraitAssessment> {
    let score = 50; // Base score
    const evidence: string[] = [];
    const growthAreas: string[] = [];

    // Look for trait evidence in testimony
    if (testimony.toLowerCase().includes(trait)) {
      score += 20;
      evidence.push(`Mentioned in personal testimony`);
    }

    // Look for trait evidence in references
    const referenceEvidence = references.filter(ref => 
      ref.content?.toLowerCase().includes(trait)
    );
    
    if (referenceEvidence.length > 0) {
      score += 15 * referenceEvidence.length;
      evidence.push(`Confirmed by ${referenceEvidence.length} reference(s)`);
    }

    // Identify growth areas (simplified logic)
    if (score < 70) {
      growthAreas.push(`Continue developing ${trait} through practical application`);
    }

    return {
      trait,
      score: Math.min(score, 100),
      evidence,
      growthAreas
    };
  }

  private async validateSingleMinistryExperience(
    experience: any
  ): Promise<MinistryExperienceValidation> {
    // In real implementation, this would contact organizations for verification
    return {
      role: experience.role || 'Unknown',
      organization: experience.organization || 'Unknown',
      duration: experience.duration || 'Unknown',
      responsibilities: experience.responsibilities || [],
      impact: experience.impact || 'Not specified',
      verified: false, // Would be true after actual verification
      verificationSource: 'Pending verification'
    };
  }
}