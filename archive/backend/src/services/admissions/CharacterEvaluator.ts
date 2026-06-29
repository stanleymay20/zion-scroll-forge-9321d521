/**
 * CharacterEvaluator - Character trait assessment and evaluation service
 * "Above all else, guard your heart, for everything you do flows from it" - Proverbs 4:23
 */

import { PrismaClient } from '@prisma/client';

export interface CharacterTrait {
  name: string;
  description: string;
  biblicalBasis: string;
  weight: number; // Importance weight (1-10)
}

export interface CharacterAssessment {
  trait: string;
  score: number; // 0-100
  evidence: CharacterEvidence[];
  growthAreas: string[];
  recommendations: string[];
  confidenceLevel: number; // How confident we are in this assessment
}

export interface CharacterEvidence {
  source: 'testimony' | 'reference' | 'interview' | 'document';
  content: string;
  strength: 'weak' | 'moderate' | 'strong';
  context: string;
}

export interface CharacterReference {
  referenceId: string;
  relationship: string;
  duration: string;
  content: string;
  contactInfo: string;
  verified: boolean;
}

export interface CharacterEvaluationResult {
  overallCharacterScore: number;
  characterAssessments: CharacterAssessment[];
  strengthAreas: string[];
  developmentAreas: string[];
  redFlags: string[];
  recommendations: string[];
  readinessLevel: CharacterReadinessLevel;
}

export enum CharacterReadinessLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  ADEQUATE = 'adequate',
  NEEDS_DEVELOPMENT = 'needs_development',
  CONCERNING = 'concerning'
}

export class CharacterEvaluator {
  private prisma: PrismaClient;
  private coreCharacterTraits: CharacterTrait[];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeCoreTraits();
  }

  /**
   * Evaluate character based on testimony, references, and other evidence
   */
  async evaluateCharacter(
    testimony: string,
    references: CharacterReference[],
    interviewNotes?: string,
    additionalDocuments?: any[]
  ): Promise<CharacterEvaluationResult> {
    const characterAssessments: CharacterAssessment[] = [];

    // Assess each core character trait
    for (const trait of this.coreCharacterTraits) {
      const assessment = await this.assessCharacterTrait(
        trait,
        testimony,
        references,
        interviewNotes,
        additionalDocuments
      );
      characterAssessments.push(assessment);
    }

    // Calculate overall character score
    const overallCharacterScore = this.calculateOverallScore(characterAssessments);

    // Identify strengths and development areas
    const strengthAreas = this.identifyStrengthAreas(characterAssessments);
    const developmentAreas = this.identifyDevelopmentAreas(characterAssessments);

    // Check for red flags
    const redFlags = this.identifyRedFlags(characterAssessments, references);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      characterAssessments,
      strengthAreas,
      developmentAreas,
      redFlags
    );

    // Determine readiness level
    const readinessLevel = this.determineReadinessLevel(
      overallCharacterScore,
      redFlags.length
    );

    return {
      overallCharacterScore,
      characterAssessments,
      strengthAreas,
      developmentAreas,
      redFlags,
      recommendations,
      readinessLevel
    };
  }

  /**
   * Verify character references through contact and validation
   */
  async verifyCharacterReferences(references: CharacterReference[]): Promise<CharacterReference[]> {
    const verifiedReferences: CharacterReference[] = [];

    for (const reference of references) {
      const verified = await this.verifyReference(reference);
      verifiedReferences.push({
        ...reference,
        verified
      });
    }

    return verifiedReferences;
  }

  /**
   * Cross-validate character assessment with multiple sources
   */
  async crossValidateCharacterAssessment(
    primaryAssessment: CharacterEvaluationResult,
    secondaryEvidence: any[]
  ): Promise<{ consistency: number; discrepancies: string[] }> {
    const discrepancies: string[] = [];
    let consistencyScore = 80; // Base consistency score

    // Compare primary assessment with secondary evidence
    for (const evidence of secondaryEvidence) {
      const comparison = await this.compareWithSecondaryEvidence(
        primaryAssessment,
        evidence
      );
      
      if (comparison.hasDiscrepancy) {
        discrepancies.push(comparison.discrepancy);
        consistencyScore -= 10;
      }
    }

    return {
      consistency: Math.max(0, consistencyScore),
      discrepancies
    };
  }

  // Private helper methods

  private initializeCoreTraits(): void {
    this.coreCharacterTraits = [
      {
        name: 'integrity',
        description: 'Honesty, truthfulness, and moral uprightness',
        biblicalBasis: 'Proverbs 10:9 - Whoever walks in integrity walks securely',
        weight: 10
      },
      {
        name: 'humility',
        description: 'Modest view of one\'s importance, teachable spirit',
        biblicalBasis: 'Philippians 2:3 - In humility value others above yourselves',
        weight: 9
      },
      {
        name: 'faithfulness',
        description: 'Reliability, loyalty, and steadfastness',
        biblicalBasis: '1 Corinthians 4:2 - It is required that those who have been given a trust must prove faithful',
        weight: 9
      },
      {
        name: 'compassion',
        description: 'Empathy, kindness, and care for others',
        biblicalBasis: 'Colossians 3:12 - Clothe yourselves with compassion, kindness, humility',
        weight: 8
      },
      {
        name: 'wisdom',
        description: 'Sound judgment, discernment, and prudence',
        biblicalBasis: 'Proverbs 27:14 - The beginning of wisdom is the fear of the Lord',
        weight: 8
      },
      {
        name: 'courage',
        description: 'Bravery in facing difficulties, moral fortitude',
        biblicalBasis: 'Joshua 1:9 - Be strong and courageous',
        weight: 7
      },
      {
        name: 'perseverance',
        description: 'Persistence through challenges, endurance',
        biblicalBasis: 'James 1:12 - Blessed is the one who perseveres under trial',
        weight: 7
      },
      {
        name: 'gentleness',
        description: 'Meekness, self-control, considerate behavior',
        biblicalBasis: 'Galatians 5:23 - But the fruit of the Spirit is... gentleness',
        weight: 6
      },
      {
        name: 'generosity',
        description: 'Willingness to give and share with others',
        biblicalBasis: '2 Corinthians 9:7 - God loves a cheerful giver',
        weight: 6
      },
      {
        name: 'forgiveness',
        description: 'Ability to forgive others and seek reconciliation',
        biblicalBasis: 'Ephesians 4:32 - Be kind and compassionate, forgiving each other',
        weight: 8
      }
    ];
  }

  private async assessCharacterTrait(
    trait: CharacterTrait,
    testimony: string,
    references: CharacterReference[],
    interviewNotes?: string,
    additionalDocuments?: any[]
  ): Promise<CharacterAssessment> {
    const evidence: CharacterEvidence[] = [];
    let score = 50; // Base score

    // Analyze testimony for trait evidence
    const testimonyEvidence = this.extractTraitEvidenceFromTestimony(trait.name, testimony);
    if (testimonyEvidence.length > 0) {
      evidence.push(...testimonyEvidence);
      score += testimonyEvidence.length * 5;
    }

    // Analyze references for trait evidence
    const referenceEvidence = this.extractTraitEvidenceFromReferences(trait.name, references);
    if (referenceEvidence.length > 0) {
      evidence.push(...referenceEvidence);
      score += referenceEvidence.length * 8;
    }

    // Analyze interview notes if available
    if (interviewNotes) {
      const interviewEvidence = this.extractTraitEvidenceFromInterview(trait.name, interviewNotes);
      if (interviewEvidence.length > 0) {
        evidence.push(...interviewEvidence);
        score += interviewEvidence.length * 6;
      }
    }

    // Analyze additional documents
    if (additionalDocuments) {
      const documentEvidence = this.extractTraitEvidenceFromDocuments(trait.name, additionalDocuments);
      if (documentEvidence.length > 0) {
        evidence.push(...documentEvidence);
        score += documentEvidence.length * 4;
      }
    }

    // Calculate confidence level based on evidence sources
    const confidenceLevel = this.calculateConfidenceLevel(evidence);

    // Generate growth areas and recommendations
    const growthAreas = this.identifyGrowthAreas(trait.name, score, evidence);
    const recommendations = this.generateTraitRecommendations(trait.name, score, evidence);

    return {
      trait: trait.name,
      score: Math.min(100, score),
      evidence,
      growthAreas,
      recommendations,
      confidenceLevel
    };
  }

  private extractTraitEvidenceFromTestimony(traitName: string, testimony: string): CharacterEvidence[] {
    const evidence: CharacterEvidence[] = [];
    const lowerTestimony = testimony.toLowerCase();
    
    // Define trait-specific keywords and phrases
    const traitKeywords = this.getTraitKeywords(traitName);
    
    for (const keyword of traitKeywords) {
      if (lowerTestimony.includes(keyword.toLowerCase())) {
        // Find the sentence containing the keyword
        const sentences = testimony.split(/[.!?]+/);
        const relevantSentence = sentences.find(sentence => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (relevantSentence) {
          evidence.push({
            source: 'testimony',
            content: relevantSentence.trim(),
            strength: this.assessEvidenceStrength(relevantSentence, keyword),
            context: `Mentioned ${traitName} in personal testimony`
          });
        }
      }
    }

    return evidence;
  }

  private extractTraitEvidenceFromReferences(traitName: string, references: CharacterReference[]): CharacterEvidence[] {
    const evidence: CharacterEvidence[] = [];
    const traitKeywords = this.getTraitKeywords(traitName);
    
    for (const reference of references) {
      const lowerContent = reference.content.toLowerCase();
      
      for (const keyword of traitKeywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          // Find relevant sentences
          const sentences = reference.content.split(/[.!?]+/);
          const relevantSentences = sentences.filter(sentence => 
            sentence.toLowerCase().includes(keyword.toLowerCase())
          );
          
          for (const sentence of relevantSentences) {
            evidence.push({
              source: 'reference',
              content: sentence.trim(),
              strength: this.assessEvidenceStrength(sentence, keyword),
              context: `Confirmed by ${reference.relationship} (${reference.duration})`
            });
          }
        }
      }
    }

    return evidence;
  }

  private extractTraitEvidenceFromInterview(traitName: string, interviewNotes: string): CharacterEvidence[] {
    const evidence: CharacterEvidence[] = [];
    const traitKeywords = this.getTraitKeywords(traitName);
    const lowerNotes = interviewNotes.toLowerCase();
    
    for (const keyword of traitKeywords) {
      if (lowerNotes.includes(keyword.toLowerCase())) {
        const sentences = interviewNotes.split(/[.!?]+/);
        const relevantSentence = sentences.find(sentence => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (relevantSentence) {
          evidence.push({
            source: 'interview',
            content: relevantSentence.trim(),
            strength: this.assessEvidenceStrength(relevantSentence, keyword),
            context: 'Observed during interview process'
          });
        }
      }
    }

    return evidence;
  }

  private extractTraitEvidenceFromDocuments(traitName: string, documents: any[]): CharacterEvidence[] {
    const evidence: CharacterEvidence[] = [];
    // Implementation would depend on document structure
    // This is a placeholder for document analysis
    return evidence;
  }

  private getTraitKeywords(traitName: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      integrity: ['honest', 'truthful', 'trustworthy', 'reliable', 'authentic', 'genuine', 'transparent'],
      humility: ['humble', 'modest', 'teachable', 'meek', 'servant', 'learning', 'admit mistakes'],
      faithfulness: ['faithful', 'loyal', 'committed', 'dedicated', 'consistent', 'dependable', 'steadfast'],
      compassion: ['compassionate', 'caring', 'empathetic', 'kind', 'loving', 'merciful', 'understanding'],
      wisdom: ['wise', 'discerning', 'prudent', 'thoughtful', 'insightful', 'good judgment', 'sound advice'],
      courage: ['courageous', 'brave', 'bold', 'fearless', 'stood up', 'faced challenges', 'took risks'],
      perseverance: ['persevered', 'persistent', 'endured', 'overcame', 'never gave up', 'kept going'],
      gentleness: ['gentle', 'patient', 'calm', 'peaceful', 'self-controlled', 'considerate', 'mild'],
      generosity: ['generous', 'giving', 'sharing', 'sacrificial', 'charitable', 'selfless', 'donated'],
      forgiveness: ['forgave', 'forgiveness', 'reconciled', 'mercy', 'grace', 'let go', 'made peace']
    };

    return keywordMap[traitName] || [];
  }

  private assessEvidenceStrength(content: string, keyword: string): 'weak' | 'moderate' | 'strong' {
    const contentLength = content.length;
    const hasSpecificExample = content.includes('when') || content.includes('example') || content.includes('time');
    const hasEmotionalDepth = /\b(felt|feel|heart|deeply|profound)\b/i.test(content);
    
    if (contentLength > 100 && hasSpecificExample && hasEmotionalDepth) {
      return 'strong';
    } else if (contentLength > 50 && (hasSpecificExample || hasEmotionalDepth)) {
      return 'moderate';
    } else {
      return 'weak';
    }
  }

  private calculateConfidenceLevel(evidence: CharacterEvidence[]): number {
    if (evidence.length === 0) return 20;
    
    let confidence = 40; // Base confidence
    
    // Add confidence based on evidence sources
    const sources = new Set(evidence.map(e => e.source));
    confidence += sources.size * 15; // More sources = higher confidence
    
    // Add confidence based on evidence strength
    const strongEvidence = evidence.filter(e => e.strength === 'strong').length;
    const moderateEvidence = evidence.filter(e => e.strength === 'moderate').length;
    
    confidence += strongEvidence * 10;
    confidence += moderateEvidence * 5;
    
    return Math.min(100, confidence);
  }

  private identifyGrowthAreas(traitName: string, score: number, evidence: CharacterEvidence[]): string[] {
    const growthAreas: string[] = [];
    
    if (score < 70) {
      growthAreas.push(`Continue developing ${traitName} through practical application`);
    }
    
    if (evidence.length < 2) {
      growthAreas.push(`Seek more opportunities to demonstrate ${traitName}`);
    }
    
    const hasStrongEvidence = evidence.some(e => e.strength === 'strong');
    if (!hasStrongEvidence) {
      growthAreas.push(`Develop deeper expressions of ${traitName} in daily life`);
    }
    
    return growthAreas;
  }

  private generateTraitRecommendations(traitName: string, score: number, evidence: CharacterEvidence[]): string[] {
    const recommendations: string[] = [];
    
    if (score >= 80) {
      recommendations.push(`Strong evidence of ${traitName} - consider leadership opportunities`);
    } else if (score >= 60) {
      recommendations.push(`Good foundation in ${traitName} - continue growth through mentorship`);
    } else {
      recommendations.push(`Focus on developing ${traitName} before enrollment`);
    }
    
    if (evidence.length < 3) {
      recommendations.push(`Gather additional references that can speak to ${traitName}`);
    }
    
    return recommendations;
  }

  private calculateOverallScore(assessments: CharacterAssessment[]): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const assessment of assessments) {
      const trait = this.coreCharacterTraits.find(t => t.name === assessment.trait);
      if (trait) {
        weightedSum += assessment.score * trait.weight;
        totalWeight += trait.weight;
      }
    }
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private identifyStrengthAreas(assessments: CharacterAssessment[]): string[] {
    return assessments
      .filter(a => a.score >= 80)
      .map(a => a.trait)
      .sort((a, b) => {
        const scoreA = assessments.find(assessment => assessment.trait === a)?.score || 0;
        const scoreB = assessments.find(assessment => assessment.trait === b)?.score || 0;
        return scoreB - scoreA;
      });
  }

  private identifyDevelopmentAreas(assessments: CharacterAssessment[]): string[] {
    return assessments
      .filter(a => a.score < 70)
      .map(a => a.trait)
      .sort((a, b) => {
        const scoreA = assessments.find(assessment => assessment.trait === a)?.score || 0;
        const scoreB = assessments.find(assessment => assessment.trait === b)?.score || 0;
        return scoreA - scoreB;
      });
  }

  private identifyRedFlags(assessments: CharacterAssessment[], references: CharacterReference[]): string[] {
    const redFlags: string[] = [];
    
    // Check for critically low scores
    const criticalTraits = ['integrity', 'faithfulness', 'humility'];
    for (const trait of criticalTraits) {
      const assessment = assessments.find(a => a.trait === trait);
      if (assessment && assessment.score < 50) {
        redFlags.push(`Concerning score in ${trait} (${assessment.score})`);
      }
    }
    
    // Check for lack of references
    if (references.length < 2) {
      redFlags.push('Insufficient character references provided');
    }
    
    // Check for unverified references
    const unverifiedRefs = references.filter(r => !r.verified).length;
    if (unverifiedRefs > references.length / 2) {
      redFlags.push('Majority of references could not be verified');
    }
    
    // Check for conflicting evidence
    const conflictingAssessments = assessments.filter(a => 
      a.evidence.some(e => e.strength === 'strong') && a.score < 60
    );
    if (conflictingAssessments.length > 0) {
      redFlags.push('Conflicting evidence in character assessment');
    }
    
    return redFlags;
  }

  private generateRecommendations(
    assessments: CharacterAssessment[],
    strengthAreas: string[],
    developmentAreas: string[],
    redFlags: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (redFlags.length > 0) {
      recommendations.push('Conduct additional character interviews before admission decision');
      recommendations.push('Require character development plan with mentorship');
    }
    
    if (developmentAreas.length > 3) {
      recommendations.push('Consider deferral with character development requirements');
    } else if (developmentAreas.length > 0) {
      recommendations.push('Provide character development resources and mentorship');
    }
    
    if (strengthAreas.length >= 5) {
      recommendations.push('Consider for leadership development track');
    }
    
    return recommendations;
  }

  private determineReadinessLevel(overallScore: number, redFlagCount: number): CharacterReadinessLevel {
    if (redFlagCount > 2) return CharacterReadinessLevel.CONCERNING;
    if (redFlagCount > 0 || overallScore < 50) return CharacterReadinessLevel.NEEDS_DEVELOPMENT;
    if (overallScore < 70) return CharacterReadinessLevel.ADEQUATE;
    if (overallScore < 85) return CharacterReadinessLevel.GOOD;
    return CharacterReadinessLevel.EXCELLENT;
  }

  private async verifyReference(reference: CharacterReference): Promise<boolean> {
    // In real implementation, this would involve:
    // 1. Contacting the reference via phone/email
    // 2. Verifying their identity and relationship
    // 3. Confirming the content of their reference
    // 4. Checking for any inconsistencies
    
    // For now, return a simulated verification result
    return Math.random() > 0.2; // 80% verification success rate
  }

  private async compareWithSecondaryEvidence(
    primaryAssessment: CharacterEvaluationResult,
    secondaryEvidence: any
  ): Promise<{ hasDiscrepancy: boolean; discrepancy: string }> {
    // Simplified comparison logic
    // In real implementation, this would be more sophisticated
    
    return {
      hasDiscrepancy: false,
      discrepancy: ''
    };
  }
}