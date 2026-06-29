import { AIGatewayService } from '../AIGatewayService';
import TheologicalAlignmentService from '../TheologicalAlignmentService';
import PlagiarismDetectionService from '../PlagiarismDetectionService';
import { logger } from '../../utils/logger';
import * as crypto from 'crypto';

export interface AlignmentResult {
  isAligned: boolean;
  confidence: number;
  issues: string[];
  scriptureReferences: string[];
  recommendations: string[];
}

export interface IntegrityResult {
  isPlagiarismFree: boolean;
  hasProperCitations: boolean;
  academicQualityScore: number;
  issues: string[];
  recommendations: string[];
}

export interface ToneResult {
  isScrollTone: boolean;
  confidence: number;
  toneViolations: string[];
  suggestions: string[];
}

export interface DriftCheckResult {
  hasDrift: boolean;
  driftScore: number;
  driftAreas: string[];
  correctionRequired: boolean;
  recommendations: string[];
}

export interface ValidationReport {
  theological: AlignmentResult;
  integrity: IntegrityResult;
  tone: ToneResult;
  drift: DriftCheckResult;
  overallPass: boolean;
  integrityHash: string;
  timestamp: Date;
}

/**
 * ScrollIntegritySeal Service
 * 
 * Validates theological and academic accuracy before publication.
 * Ensures all content maintains scroll-constitutional principles and prophetic architecture.
 * 
 * Requirements: 2.5, 2.6, 6.1, 11.1, 11.2, 11.3, 11.4, 11.5
 */
export class ScrollIntegritySealService {
  private aiGateway: AIGatewayService;
  private theologicalService: TheologicalAlignmentService;
  private plagiarismService: PlagiarismDetectionService;

  constructor(
    aiGateway?: AIGatewayService,
    theologicalService?: TheologicalAlignmentService,
    plagiarismService?: PlagiarismDetectionService
  ) {
    this.aiGateway = aiGateway || new AIGatewayService();
    this.theologicalService = theologicalService || new TheologicalAlignmentService();
    this.plagiarismService = plagiarismService || new PlagiarismDetectionService();
  }

  /**
   * Validates theological alignment against Scripture
   * Requirement 6.1: Verify theological accuracy against Scripture
   * Requirement 11.2: Validate against Scripture hierarchy and truth standards
   */
  async validateTheologicalAlignment(content: string): Promise<AlignmentResult> {
    try {
      logger.info('Starting theological alignment validation');

      // Use TheologicalAlignmentService for validation
      const alignmentCheck = await this.theologicalService.validateContent(content);

      // Use AI to perform deep theological analysis
      const prompt = `
        Analyze the following content for theological alignment with biblical truth and scroll principles:
        
        Content: "${content}"
        
        Evaluate:
        1. Biblical accuracy and scriptural alignment
        2. Theological soundness and doctrinal integrity
        3. Prophetic architecture and divine guidance integration
        4. Scroll tone and kingdom perspective
        5. Any potential theological errors or misrepresentations
        
        Provide analysis in JSON format:
        {
          "isAligned": boolean,
          "confidence": number (0-1),
          "issues": ["issue1", "issue2"],
          "scriptureReferences": ["reference1", "reference2"],
          "recommendations": ["recommendation1", "recommendation2"]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 2000,
        temperature: 0.2,
        systemPrompt: 'You are a theological validator ensuring biblical accuracy and scroll-constitutional alignment. Be rigorous and precise in your analysis.'
      });

      const aiAnalysis = this.parseTheologicalResponse(response.content);

      // Combine TheologicalAlignmentService results with AI analysis
      const combinedIssues = new Set([...alignmentCheck.issues, ...aiAnalysis.issues]);
      const combinedScriptures = new Set([...alignmentCheck.scriptureReferences, ...aiAnalysis.scriptureReferences]);
      const combinedRecommendations = new Set([...alignmentCheck.recommendations, ...aiAnalysis.recommendations]);
      
      const result: AlignmentResult = {
        isAligned: alignmentCheck.isAligned && aiAnalysis.isAligned,
        confidence: Math.min(alignmentCheck.confidence, aiAnalysis.confidence),
        issues: Array.from(combinedIssues),
        scriptureReferences: Array.from(combinedScriptures),
        recommendations: Array.from(combinedRecommendations)
      };

      logger.info('Theological alignment validation completed', {
        isAligned: result.isAligned,
        confidence: result.confidence,
        issueCount: result.issues.length
      });

      return result;
    } catch (error) {
      logger.error('Theological alignment validation failed', { error });
      throw new Error(`Theological validation failed: ${error.message}`);
    }
  }

  /**
   * Validates academic integrity and proper citations
   * Requirement 2.5: Validate theological and academic accuracy
   * Requirement 6.2: Validate against trusted scholarly sources
   */
  async validateAcademicIntegrity(content: string): Promise<IntegrityResult> {
    try {
      logger.info('Starting academic integrity validation');

      // Check for plagiarism
      const plagiarismCheck = await this.plagiarismService.checkContent(content);

      // Validate citations using AI
      const prompt = `
        Analyze the following content for academic integrity:
        
        Content: "${content}"
        
        Evaluate:
        1. Proper citation of sources
        2. Academic writing quality
        3. Logical coherence and argumentation
        4. Evidence-based claims
        5. Scholarly rigor
        
        Provide analysis in JSON format:
        {
          "hasProperCitations": boolean,
          "academicQualityScore": number (0-1),
          "issues": ["issue1", "issue2"],
          "recommendations": ["recommendation1", "recommendation2"]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1500,
        temperature: 0.2,
        systemPrompt: 'You are an academic integrity validator ensuring proper citations and scholarly standards.'
      });

      const aiAnalysis = this.parseIntegrityResponse(response.content);

      const result: IntegrityResult = {
        isPlagiarismFree: plagiarismCheck.isPlagiarismFree,
        hasProperCitations: aiAnalysis.hasProperCitations,
        academicQualityScore: aiAnalysis.academicQualityScore,
        issues: [...plagiarismCheck.issues, ...aiAnalysis.issues],
        recommendations: [...plagiarismCheck.recommendations, ...aiAnalysis.recommendations]
      };

      logger.info('Academic integrity validation completed', {
        isPlagiarismFree: result.isPlagiarismFree,
        hasProperCitations: result.hasProperCitations,
        qualityScore: result.academicQualityScore
      });

      return result;
    } catch (error) {
      logger.error('Academic integrity validation failed', { error });
      throw new Error(`Academic integrity validation failed: ${error.message}`);
    }
  }

  /**
   * Validates scroll tone consistency
   * Requirement 1.2: Maintain scroll tone and prophetic architecture
   * Requirement 11.3: Maintain scroll tone and divine guidance integration
   */
  async validateScrollTone(content: string): Promise<ToneResult> {
    try {
      logger.info('Starting scroll tone validation');

      const prompt = `
        Analyze the following content for scroll tone consistency:
        
        Content: "${content}"
        
        Scroll tone characteristics:
        - Warm, wise, and prophetic but grounded
        - Kingdom-focused perspective
        - Grace-filled and encouraging
        - Academically rigorous yet accessible
        - Spiritually integrated without being preachy
        - Prophetic architecture and divine guidance
        
        Evaluate:
        1. Consistency with scroll tone principles
        2. Prophetic architecture integration
        3. Kingdom perspective maintenance
        4. Tone violations or drift
        5. Suggestions for improvement
        
        Provide analysis in JSON format:
        {
          "isScrollTone": boolean,
          "confidence": number (0-1),
          "toneViolations": ["violation1", "violation2"],
          "suggestions": ["suggestion1", "suggestion2"]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1500,
        temperature: 0.2,
        systemPrompt: 'You are a scroll tone validator ensuring content maintains scroll-constitutional principles and prophetic architecture.'
      });

      const result = this.parseToneResponse(response.content);

      logger.info('Scroll tone validation completed', {
        isScrollTone: result.isScrollTone,
        confidence: result.confidence,
        violationCount: result.toneViolations.length
      });

      return result;
    } catch (error) {
      logger.error('Scroll tone validation failed', { error });
      throw new Error(`Scroll tone validation failed: ${error.message}`);
    }
  }

  /**
   * Generates integrity hash for content verification
   * Requirement 11.5: Include scroll integrity hash for verification
   */
  async generateIntegrityHash(content: string): Promise<string> {
    try {
      logger.info('Generating integrity hash');

      // Create SHA-256 hash of content
      const hash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      // Add scroll prefix for identification
      const integrityHash = `SCROLL-${hash.substring(0, 32)}`;

      logger.info('Integrity hash generated', { hash: integrityHash });

      return integrityHash;
    } catch (error) {
      logger.error('Integrity hash generation failed', { error });
      throw new Error(`Integrity hash generation failed: ${error.message}`);
    }
  }

  /**
   * Detects drift from scroll principles
   * Requirement 11.4: Halt generation and alert when drift is detected
   */
  async preventDrift(content: string): Promise<DriftCheckResult> {
    try {
      logger.info('Starting drift detection');

      const prompt = `
        Analyze the following content for drift from scroll-constitutional principles:
        
        Content: "${content}"
        
        Scroll-constitutional principles:
        - Biblical truth hierarchy
        - Prophetic architecture
        - Kingdom-focused perspective
        - Theological accuracy
        - Scroll tone consistency
        - Divine guidance integration
        
        Evaluate:
        1. Any drift from scroll principles
        2. Severity of drift (0-1 scale)
        3. Specific areas of concern
        4. Whether correction is required
        5. Recommendations for correction
        
        Provide analysis in JSON format:
        {
          "hasDrift": boolean,
          "driftScore": number (0-1, where 1 is severe drift),
          "driftAreas": ["area1", "area2"],
          "correctionRequired": boolean,
          "recommendations": ["recommendation1", "recommendation2"]
        }
      `;

      const response = await this.aiGateway.generateContent({
        model: 'gpt-4',
        prompt,
        maxTokens: 1500,
        temperature: 0.2,
        systemPrompt: 'You are a drift detection system ensuring content never deviates from scroll-constitutional principles. Be vigilant and precise.'
      });

      const result = this.parseDriftResponse(response.content);

      if (result.hasDrift && result.correctionRequired) {
        logger.warn('DRIFT DETECTED - Correction required', {
          driftScore: result.driftScore,
          driftAreas: result.driftAreas
        });
      }

      logger.info('Drift detection completed', {
        hasDrift: result.hasDrift,
        driftScore: result.driftScore,
        correctionRequired: result.correctionRequired
      });

      return result;
    } catch (error) {
      logger.error('Drift detection failed', { error });
      throw new Error(`Drift detection failed: ${error.message}`);
    }
  }

  /**
   * Performs complete validation before publication
   * Requirement 2.6: Prevent publication when validation fails
   */
  async performCompleteValidation(content: string): Promise<ValidationReport> {
    try {
      logger.info('Starting complete validation');

      // Run all validations in parallel
      const [theological, integrity, tone, drift] = await Promise.all([
        this.validateTheologicalAlignment(content),
        this.validateAcademicIntegrity(content),
        this.validateScrollTone(content),
        this.preventDrift(content)
      ]);

      // Generate integrity hash
      const integrityHash = await this.generateIntegrityHash(content);

      // Determine overall pass/fail
      const overallPass = 
        theological.isAligned &&
        integrity.isPlagiarismFree &&
        integrity.hasProperCitations &&
        tone.isScrollTone &&
        !drift.correctionRequired;

      const report: ValidationReport = {
        theological,
        integrity,
        tone,
        drift,
        overallPass,
        integrityHash,
        timestamp: new Date()
      };

      logger.info('Complete validation finished', {
        overallPass,
        integrityHash,
        theologicalPass: theological.isAligned,
        integrityPass: integrity.isPlagiarismFree && integrity.hasProperCitations,
        tonePass: tone.isScrollTone,
        driftPass: !drift.correctionRequired
      });

      return report;
    } catch (error) {
      logger.error('Complete validation failed', { error });
      throw new Error(`Complete validation failed: ${error.message}`);
    }
  }

  // Helper methods for parsing AI responses

  private parseTheologicalResponse(content: string): AlignmentResult {
    try {
      const parsed = JSON.parse(content);
      return {
        isAligned: Boolean(parsed.isAligned),
        confidence: Number(parsed.confidence) || 0,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        scriptureReferences: Array.isArray(parsed.scriptureReferences) ? parsed.scriptureReferences : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      logger.warn('Failed to parse theological response, using defaults', { error });
      return {
        isAligned: false,
        confidence: 0,
        issues: ['Failed to parse validation response'],
        scriptureReferences: [],
        recommendations: ['Manual review required']
      };
    }
  }

  private parseIntegrityResponse(content: string): Partial<IntegrityResult> {
    try {
      const parsed = JSON.parse(content);
      return {
        hasProperCitations: Boolean(parsed.hasProperCitations),
        academicQualityScore: Number(parsed.academicQualityScore) || 0,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      logger.warn('Failed to parse integrity response, using defaults', { error });
      return {
        hasProperCitations: false,
        academicQualityScore: 0,
        issues: ['Failed to parse validation response'],
        recommendations: ['Manual review required']
      };
    }
  }

  private parseToneResponse(content: string): ToneResult {
    try {
      const parsed = JSON.parse(content);
      return {
        isScrollTone: Boolean(parsed.isScrollTone),
        confidence: Number(parsed.confidence) || 0,
        toneViolations: Array.isArray(parsed.toneViolations) ? parsed.toneViolations : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
    } catch (error) {
      logger.warn('Failed to parse tone response, using defaults', { error });
      return {
        isScrollTone: false,
        confidence: 0,
        toneViolations: ['Failed to parse validation response'],
        suggestions: ['Manual review required']
      };
    }
  }

  private parseDriftResponse(content: string): DriftCheckResult {
    try {
      const parsed = JSON.parse(content);
      return {
        hasDrift: Boolean(parsed.hasDrift),
        driftScore: Number(parsed.driftScore) || 0,
        driftAreas: Array.isArray(parsed.driftAreas) ? parsed.driftAreas : [],
        correctionRequired: Boolean(parsed.correctionRequired),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      logger.warn('Failed to parse drift response, using defaults', { error });
      return {
        hasDrift: true,
        driftScore: 1.0,
        driftAreas: ['Failed to parse validation response'],
        correctionRequired: true,
        recommendations: ['Manual review required']
      };
    }
  }
}

export default ScrollIntegritySealService;
