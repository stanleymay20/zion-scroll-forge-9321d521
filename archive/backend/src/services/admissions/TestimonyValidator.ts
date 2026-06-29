/**
 * TestimonyValidator - Personal testimony verification and authenticity validation
 * "By their fruit you will recognize them" - Matthew 7:16
 */

import { PrismaClient } from '@prisma/client';

export interface TestimonyValidationResult {
  isAuthentic: boolean;
  confidenceScore: number;
  authenticityMarkers: string[];
  concernFlags: string[];
  recommendations: string[];
}

export interface TestimonyAnalysis {
  wordCount: number;
  sentenceCount: number;
  personalPronounUsage: number;
  emotionalDepth: number;
  specificityScore: number;
  coherenceScore: number;
  spiritualContentScore: number;
}

export interface RedFlagAnalysis {
  plagiarismRisk: number;
  genericContentRisk: number;
  inconsistencyRisk: number;
  exaggerationRisk: number;
  overallRiskScore: number;
}

export class TestimonyValidator {
  private prisma: PrismaClient;
  private commonTestimonyPhrases: string[];
  private spiritualKeywords: string[];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeKeywords();
  }

  /**
   * Validate personal testimony for authenticity and depth
   */
  async validateTestimony(testimony: string, applicantId: string): Promise<TestimonyValidationResult> {
    const analysis = await this.analyzeTestimonyContent(testimony);
    const redFlags = await this.analyzeRedFlags(testimony);
    const plagiarismCheck = await this.checkForPlagiarism(testimony);
    
    const confidenceScore = this.calculateConfidenceScore(analysis, redFlags, plagiarismCheck);
    const isAuthentic = confidenceScore >= 70; // 70% threshold for authenticity

    const authenticityMarkers = this.identifyAuthenticityMarkers(analysis);
    const concernFlags = this.identifyConcernFlags(redFlags, plagiarismCheck);
    const recommendations = this.generateRecommendations(analysis, redFlags, isAuthentic);

    return {
      isAuthentic,
      confidenceScore,
      authenticityMarkers,
      concernFlags,
      recommendations
    };
  }

  /**
   * Analyze testimony content for various authenticity indicators
   */
  async analyzeTestimonyContent(testimony: string): Promise<TestimonyAnalysis> {
    const words = testimony.split(/\s+/).filter(word => word.length > 0);
    const sentences = testimony.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    const personalPronouns = this.countPersonalPronouns(testimony);
    const emotionalDepth = this.assessEmotionalDepth(testimony);
    const specificityScore = this.assessSpecificity(testimony);
    const coherenceScore = this.assessCoherence(testimony);
    const spiritualContentScore = this.assessSpiritualContent(testimony);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      personalPronounUsage: personalPronouns,
      emotionalDepth,
      specificityScore,
      coherenceScore,
      spiritualContentScore
    };
  }

  /**
   * Analyze potential red flags in testimony
   */
  async analyzeRedFlags(testimony: string): Promise<RedFlagAnalysis> {
    const plagiarismRisk = await this.assessPlagiarismRisk(testimony);
    const genericContentRisk = this.assessGenericContentRisk(testimony);
    const inconsistencyRisk = this.assessInconsistencyRisk(testimony);
    const exaggerationRisk = this.assessExaggerationRisk(testimony);

    const overallRiskScore = (plagiarismRisk + genericContentRisk + inconsistencyRisk + exaggerationRisk) / 4;

    return {
      plagiarismRisk,
      genericContentRisk,
      inconsistencyRisk,
      exaggerationRisk,
      overallRiskScore
    };
  }

  /**
   * Check for potential plagiarism against known testimonies
   */
  async checkForPlagiarism(testimony: string): Promise<boolean> {
    // In real implementation, this would check against a database of known testimonies
    // and use advanced plagiarism detection algorithms
    
    // Simple check for exact matches with common phrases
    const suspiciousMatches = this.commonTestimonyPhrases.filter(phrase => 
      testimony.toLowerCase().includes(phrase.toLowerCase())
    );

    return suspiciousMatches.length > 3; // More than 3 common phrases might indicate copying
  }

  /**
   * Validate testimony against character references
   */
  async crossValidateWithReferences(
    testimony: string,
    references: any[]
  ): Promise<{ consistency: number; supportingEvidence: string[] }> {
    const supportingEvidence: string[] = [];
    let consistencyScore = 50; // Base score

    // Extract key claims from testimony
    const testimonyClaims = this.extractKeyClaims(testimony);

    // Check if references support these claims
    for (const reference of references) {
      const referenceContent = reference.content || '';
      
      for (const claim of testimonyClaims) {
        if (this.claimSupportedByReference(claim, referenceContent)) {
          consistencyScore += 10;
          supportingEvidence.push(`Reference supports: ${claim}`);
        }
      }
    }

    return {
      consistency: Math.min(consistencyScore, 100),
      supportingEvidence
    };
  }

  // Private helper methods

  private initializeKeywords(): void {
    this.commonTestimonyPhrases = [
      "I was lost but now I'm found",
      "Jesus changed my life",
      "I accepted Christ as my personal savior",
      "God has a plan for my life",
      "I was born again",
      "The Lord works in mysterious ways",
      "God is good all the time",
      "I surrendered my life to Jesus"
    ];

    this.spiritualKeywords = [
      'God', 'Jesus', 'Christ', 'Lord', 'Holy Spirit', 'salvation', 'grace', 'mercy',
      'faith', 'prayer', 'worship', 'church', 'ministry', 'calling', 'purpose',
      'forgiveness', 'redemption', 'transformation', 'testimony', 'witness'
    ];
  }

  private countPersonalPronouns(testimony: string): number {
    const personalPronouns = ['I', 'me', 'my', 'mine', 'myself'];
    const words = testimony.split(/\s+/);
    
    return personalPronouns.reduce((count, pronoun) => {
      return count + words.filter(word => 
        word.toLowerCase().replace(/[^a-z]/g, '') === pronoun.toLowerCase()
      ).length;
    }, 0);
  }

  private assessEmotionalDepth(testimony: string): number {
    const emotionalWords = [
      'felt', 'feel', 'emotion', 'heart', 'soul', 'deep', 'profound',
      'overwhelming', 'peace', 'joy', 'love', 'fear', 'hope', 'despair',
      'broken', 'healing', 'comfort', 'struggle', 'pain', 'suffering'
    ];

    let score = 0;
    const lowerTestimony = testimony.toLowerCase();

    emotionalWords.forEach(word => {
      if (lowerTestimony.includes(word)) {
        score += 5;
      }
    });

    return Math.min(score, 100);
  }

  private assessSpecificity(testimony: string): number {
    let score = 0;

    // Check for specific dates
    if (/\b(19|20)\d{2}\b/.test(testimony)) score += 20;
    
    // Check for specific places
    if (/\b[A-Z][a-z]+ (Church|School|Hospital|City|Street)\b/.test(testimony)) score += 15;
    
    // Check for specific people (names)
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(testimony)) score += 15;
    
    // Check for specific events
    if (testimony.includes('when I was') || testimony.includes('during')) score += 10;
    
    // Check for specific ages
    if (/\b(age|years old|\d+ years)\b/.test(testimony)) score += 10;

    return Math.min(score, 100);
  }

  private assessCoherence(testimony: string): number {
    const sentences = testimony.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 3) return 30; // Too short to be coherent
    if (sentences.length > 20) return 90; // Likely well-developed
    
    // Basic coherence based on sentence structure and flow
    let score = 50;
    
    // Check for transition words
    const transitionWords = ['then', 'after', 'before', 'during', 'while', 'since', 'because', 'so', 'therefore'];
    transitionWords.forEach(word => {
      if (testimony.toLowerCase().includes(word)) score += 5;
    });

    return Math.min(score, 100);
  }

  private assessSpiritualContent(testimony: string): number {
    let score = 0;
    const lowerTestimony = testimony.toLowerCase();

    this.spiritualKeywords.forEach(keyword => {
      if (lowerTestimony.includes(keyword.toLowerCase())) {
        score += 3;
      }
    });

    return Math.min(score, 100);
  }

  private async assessPlagiarismRisk(testimony: string): Promise<number> {
    // Check against common testimony phrases
    let riskScore = 0;
    const lowerTestimony = testimony.toLowerCase();

    this.commonTestimonyPhrases.forEach(phrase => {
      if (lowerTestimony.includes(phrase.toLowerCase())) {
        riskScore += 15;
      }
    });

    return Math.min(riskScore, 100);
  }

  private assessGenericContentRisk(testimony: string): number {
    const genericPhrases = [
      'God is good',
      'blessed and highly favored',
      'God has a plan',
      'everything happens for a reason',
      'God works in mysterious ways',
      'I\'m blessed',
      'praise the Lord'
    ];

    let riskScore = 0;
    const lowerTestimony = testimony.toLowerCase();

    genericPhrases.forEach(phrase => {
      if (lowerTestimony.includes(phrase)) {
        riskScore += 10;
      }
    });

    return Math.min(riskScore, 100);
  }

  private assessInconsistencyRisk(testimony: string): number {
    // Look for potential inconsistencies in timeline or facts
    // This is a simplified implementation
    let riskScore = 0;

    // Check for conflicting time references
    const years = testimony.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length > 1) {
      const yearNumbers = years.map(y => parseInt(y));
      const range = Math.max(...yearNumbers) - Math.min(...yearNumbers);
      if (range > 50) riskScore += 20; // Suspicious age range
    }

    return Math.min(riskScore, 100);
  }

  private assessExaggerationRisk(testimony: string): number {
    const exaggerationWords = [
      'amazing', 'incredible', 'unbelievable', 'miraculous', 'perfect',
      'always', 'never', 'completely', 'totally', 'absolutely',
      'best', 'worst', 'greatest', 'most', 'all'
    ];

    let riskScore = 0;
    const lowerTestimony = testimony.toLowerCase();

    exaggerationWords.forEach(word => {
      const matches = (lowerTestimony.match(new RegExp(word, 'g')) || []).length;
      riskScore += matches * 3;
    });

    return Math.min(riskScore, 100);
  }

  private calculateConfidenceScore(
    analysis: TestimonyAnalysis,
    redFlags: RedFlagAnalysis,
    hasPlagiarism: boolean
  ): number {
    let score = 50; // Base score

    // Positive indicators
    if (analysis.wordCount >= 200) score += 10;
    if (analysis.personalPronounUsage >= 5) score += 10;
    if (analysis.emotionalDepth >= 30) score += 15;
    if (analysis.specificityScore >= 40) score += 15;
    if (analysis.coherenceScore >= 60) score += 10;
    if (analysis.spiritualContentScore >= 30) score += 10;

    // Negative indicators
    score -= redFlags.overallRiskScore * 0.5;
    if (hasPlagiarism) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  private identifyAuthenticityMarkers(analysis: TestimonyAnalysis): string[] {
    const markers: string[] = [];

    if (analysis.personalPronounUsage >= 5) {
      markers.push('Strong personal voice and ownership');
    }
    if (analysis.emotionalDepth >= 30) {
      markers.push('Genuine emotional expression');
    }
    if (analysis.specificityScore >= 40) {
      markers.push('Specific details and circumstances');
    }
    if (analysis.coherenceScore >= 60) {
      markers.push('Coherent narrative structure');
    }
    if (analysis.wordCount >= 300) {
      markers.push('Substantial content depth');
    }

    return markers;
  }

  private identifyConcernFlags(redFlags: RedFlagAnalysis, hasPlagiarism: boolean): string[] {
    const concerns: string[] = [];

    if (redFlags.plagiarismRisk >= 40) {
      concerns.push('High similarity to common testimony phrases');
    }
    if (redFlags.genericContentRisk >= 50) {
      concerns.push('Excessive use of generic spiritual language');
    }
    if (redFlags.inconsistencyRisk >= 30) {
      concerns.push('Potential inconsistencies in timeline or facts');
    }
    if (redFlags.exaggerationRisk >= 40) {
      concerns.push('Frequent use of superlative language');
    }
    if (hasPlagiarism) {
      concerns.push('Possible plagiarism detected');
    }

    return concerns;
  }

  private generateRecommendations(
    analysis: TestimonyAnalysis,
    redFlags: RedFlagAnalysis,
    isAuthentic: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!isAuthentic) {
      recommendations.push('Request additional interview to clarify testimony details');
      recommendations.push('Consider asking for supplementary spiritual references');
    }

    if (analysis.wordCount < 200) {
      recommendations.push('Encourage applicant to provide more detailed testimony');
    }

    if (analysis.specificityScore < 30) {
      recommendations.push('Request more specific examples and circumstances');
    }

    if (redFlags.genericContentRisk >= 40) {
      recommendations.push('Ask for more personal and unique aspects of their journey');
    }

    if (analysis.emotionalDepth < 20) {
      recommendations.push('Explore the emotional and personal impact of their faith journey');
    }

    return recommendations;
  }

  private extractKeyClaims(testimony: string): string[] {
    // Simplified claim extraction - in real implementation, use NLP
    const claims: string[] = [];
    
    const sentences = testimony.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('i was') || 
          sentence.toLowerCase().includes('i became') ||
          sentence.toLowerCase().includes('i started')) {
        claims.push(sentence.trim());
      }
    });

    return claims;
  }

  private claimSupportedByReference(claim: string, referenceContent: string): boolean {
    // Simplified claim validation - in real implementation, use semantic analysis
    const claimWords = claim.toLowerCase().split(/\s+/);
    const referenceWords = referenceContent.toLowerCase().split(/\s+/);
    
    const commonWords = claimWords.filter(word => 
      referenceWords.includes(word) && word.length > 2
    );

    // Also check for key ministry terms
    const ministryTerms = ['youth', 'leader', 'church', 'pastor', 'ministry', 'serve', 'teach'];
    const hasMinistryTerms = ministryTerms.some(term => 
      claim.toLowerCase().includes(term) && referenceContent.toLowerCase().includes(term)
    );

    return commonWords.length >= 1 || hasMinistryTerms; // At least 1 significant word or ministry term in common
  }
}