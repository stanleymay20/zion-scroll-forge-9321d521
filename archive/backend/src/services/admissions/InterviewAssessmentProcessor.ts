/**
 * InterviewAssessmentProcessor - Creates interview assessment processing and analysis
 * "The simple believe anything, but the prudent give thought to their steps" (Proverbs 14:15)
 */

import { InterviewEvaluation, EvaluationScores, EvaluationObservations } from './InterviewEvaluator';
import { VideoConferenceSession } from './VideoConferenceManager';
import { InterviewType, RecommendationType } from '@prisma/client';

export interface AssessmentAnalysis {
  interviewId: string;
  analysisId: string;
  analysisType: AnalysisType[];
  results: AnalysisResults;
  insights: AssessmentInsights;
  recommendations: ProcessorRecommendations;
  confidence: number;
  processedAt: Date;
}

export interface AnalysisResults {
  transcriptAnalysis?: TranscriptAnalysis;
  videoAnalysis?: VideoAnalysis;
  audioAnalysis?: AudioAnalysis;
  behavioralAnalysis?: BehavioralAnalysis;
  sentimentAnalysis?: SentimentAnalysis;
}

export interface TranscriptAnalysis {
  wordCount: number;
  speakingTime: SpeakingTimeBreakdown;
  keywordFrequency: KeywordFrequency[];
  topicCoverage: TopicCoverage[];
  languageComplexity: LanguageComplexity;
  spiritualContent: SpiritualContentAnalysis;
}

export interface VideoAnalysis {
  eyeContact: number; // 0-1 score
  facialExpressions: FacialExpressionAnalysis;
  bodyLanguage: BodyLanguageAnalysis;
  engagement: EngagementMetrics;
  professionalPresentation: PresentationAnalysis;
}

export interface AudioAnalysis {
  speechClarity: number; // 0-1 score
  speakingPace: SpeakingPaceAnalysis;
  volumeConsistency: number; // 0-1 score
  fillerWords: FillerWordAnalysis;
  emotionalTone: EmotionalToneAnalysis;
}

export interface BehavioralAnalysis {
  responseLatency: ResponseLatencyAnalysis;
  questionHandling: QuestionHandlingAnalysis;
  adaptability: AdaptabilityAnalysis;
  stressIndicators: StressIndicatorAnalysis;
}

export interface SentimentAnalysis {
  overallSentiment: SentimentScore;
  sentimentProgression: SentimentProgression[];
  emotionalStability: number; // 0-1 score
  authenticity: AuthenticityAnalysis;
}

export interface AssessmentInsights {
  strengths: InsightItem[];
  concerns: InsightItem[];
  patterns: PatternInsight[];
  comparisons: ComparisonInsight[];
  predictions: PredictionInsight[];
}

export interface ProcessorRecommendations {
  overallRecommendation: RecommendationType;
  confidence: number;
  reasoning: string[];
  followUpSuggestions: FollowUpSuggestion[];
  developmentAreas: DevelopmentArea[];
}

export enum AnalysisType {
  TRANSCRIPT = 'transcript',
  VIDEO = 'video',
  AUDIO = 'audio',
  BEHAVIORAL = 'behavioral',
  SENTIMENT = 'sentiment',
  COMPREHENSIVE = 'comprehensive'
}

export interface SpeakingTimeBreakdown {
  applicantPercentage: number;
  interviewerPercentage: number;
  silencePercentage: number;
  averageResponseLength: number;
}

export interface KeywordFrequency {
  keyword: string;
  frequency: number;
  context: string[];
  relevance: number;
}

export interface TopicCoverage {
  topic: string;
  coverage: number; // 0-1 score
  depth: number; // 0-1 score
  quality: number; // 0-1 score
}

export interface LanguageComplexity {
  vocabularyLevel: number; // 0-1 score
  sentenceComplexity: number; // 0-1 score
  grammarAccuracy: number; // 0-1 score
  coherence: number; // 0-1 score
}

export interface SpiritualContentAnalysis {
  testimonyClarity: number; // 0-1 score
  biblicalReferences: number;
  spiritualMaturityIndicators: string[];
  callingClarity: number; // 0-1 score
  kingdomFocus: number; // 0-1 score
}

export interface FacialExpressionAnalysis {
  positiveExpressions: number; // 0-1 score
  engagement: number; // 0-1 score
  authenticity: number; // 0-1 score
  emotionalRange: number; // 0-1 score
}

export interface BodyLanguageAnalysis {
  posture: number; // 0-1 score
  gestures: number; // 0-1 score
  openness: number; // 0-1 score
  confidence: number; // 0-1 score
}

export interface EngagementMetrics {
  attentiveness: number; // 0-1 score
  responsiveness: number; // 0-1 score
  enthusiasm: number; // 0-1 score
  connection: number; // 0-1 score
}

export interface PresentationAnalysis {
  appearance: number; // 0-1 score
  environment: number; // 0-1 score
  technicalSetup: number; // 0-1 score
  professionalism: number; // 0-1 score
}

export interface SpeakingPaceAnalysis {
  averageWordsPerMinute: number;
  paceConsistency: number; // 0-1 score
  appropriatePauses: number; // 0-1 score
  rushingIndicators: number;
}

export interface FillerWordAnalysis {
  fillerWordCount: number;
  fillerWordRate: number; // per minute
  commonFillers: string[];
  impactOnClarity: number; // 0-1 score
}

export interface EmotionalToneAnalysis {
  confidence: number; // 0-1 score
  enthusiasm: number; // 0-1 score
  nervousness: number; // 0-1 score
  sincerity: number; // 0-1 score
}

export interface ResponseLatencyAnalysis {
  averageResponseTime: number; // seconds
  consistencyScore: number; // 0-1 score
  thoughtfulnessIndicator: number; // 0-1 score
}

export interface QuestionHandlingAnalysis {
  directAnswering: number; // 0-1 score
  completeness: number; // 0-1 score
  relevance: number; // 0-1 score
  clarificationSeeking: number;
}

export interface AdaptabilityAnalysis {
  flexibilityScore: number; // 0-1 score
  recoveryFromMistakes: number; // 0-1 score
  responseToUnexpected: number; // 0-1 score
}

export interface StressIndicatorAnalysis {
  stressLevel: number; // 0-1 score
  stressManagement: number; // 0-1 score
  stressImpactOnPerformance: number; // 0-1 score
}

export interface SentimentScore {
  positive: number; // 0-1 score
  negative: number; // 0-1 score
  neutral: number; // 0-1 score
  overall: number; // -1 to 1 score
}

export interface SentimentProgression {
  timeSegment: number; // minutes into interview
  sentiment: SentimentScore;
  context: string;
}

export interface AuthenticityAnalysis {
  genuineness: number; // 0-1 score
  consistency: number; // 0-1 score
  naturalness: number; // 0-1 score
}

export interface InsightItem {
  category: string;
  description: string;
  evidence: string[];
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

export interface PatternInsight {
  pattern: string;
  description: string;
  frequency: number;
  significance: number;
}

export interface ComparisonInsight {
  metric: string;
  applicantScore: number;
  benchmarkScore: number;
  percentile: number;
  interpretation: string;
}

export interface PredictionInsight {
  outcome: string;
  probability: number;
  factors: string[];
  confidence: number;
}

export interface FollowUpSuggestion {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
}

export interface DevelopmentArea {
  area: string;
  currentLevel: number;
  targetLevel: number;
  recommendations: string[];
}

export class InterviewAssessmentProcessor {
  /**
   * Process comprehensive interview assessment
   */
  async processAssessment(
    interviewId: string,
    videoSession?: VideoConferenceSession,
    evaluation?: InterviewEvaluation
  ): Promise<AssessmentAnalysis> {
    try {
      console.log(`Processing assessment for interview ${interviewId}`);

      const analysisId = this.generateAnalysisId();
      const analysisTypes = this.determineAnalysisTypes(videoSession, evaluation);

      // Perform different types of analysis
      const results: AnalysisResults = {};

      if (analysisTypes.includes(AnalysisType.TRANSCRIPT) && videoSession?.recording.transcriptUrl) {
        results.transcriptAnalysis = await this.analyzeTranscript(videoSession.recording.transcriptUrl);
      }

      if (analysisTypes.includes(AnalysisType.VIDEO) && videoSession?.recording.recordingUrl) {
        results.videoAnalysis = await this.analyzeVideo(videoSession.recording.recordingUrl);
      }

      if (analysisTypes.includes(AnalysisType.AUDIO) && videoSession?.recording.recordingUrl) {
        results.audioAnalysis = await this.analyzeAudio(videoSession.recording.recordingUrl);
      }

      if (analysisTypes.includes(AnalysisType.BEHAVIORAL)) {
        results.behavioralAnalysis = await this.analyzeBehavior(videoSession, evaluation);
      }

      if (analysisTypes.includes(AnalysisType.SENTIMENT)) {
        results.sentimentAnalysis = await this.analyzeSentiment(videoSession, evaluation);
      }

      // Generate insights from analysis results
      const insights = await this.generateInsights(results, evaluation);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(results, insights, evaluation);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(results, insights);

      const assessment: AssessmentAnalysis = {
        interviewId,
        analysisId,
        analysisType: analysisTypes,
        results,
        insights,
        recommendations,
        confidence,
        processedAt: new Date()
      };

      // Store assessment results
      await this.storeAssessment(assessment);

      console.log(`Assessment processing completed for interview ${interviewId}`);
      return assessment;
    } catch (error) {
      console.error('Error processing assessment:', error);
      throw new Error(`Failed to process assessment: ${error.message}`);
    }
  }

  /**
   * Analyze transcript content
   */
  private async analyzeTranscript(transcriptUrl: string): Promise<TranscriptAnalysis> {
    console.log(`Analyzing transcript: ${transcriptUrl}`);

    // Mock transcript analysis - in reality would use NLP services
    return {
      wordCount: 2500,
      speakingTime: {
        applicantPercentage: 65,
        interviewerPercentage: 30,
        silencePercentage: 5,
        averageResponseLength: 45
      },
      keywordFrequency: [
        { keyword: 'calling', frequency: 12, context: ['ministry calling', 'divine calling'], relevance: 0.9 },
        { keyword: 'faith', frequency: 8, context: ['personal faith', 'faith journey'], relevance: 0.85 },
        { keyword: 'service', frequency: 6, context: ['community service', 'church service'], relevance: 0.8 }
      ],
      topicCoverage: [
        { topic: 'Personal Testimony', coverage: 0.9, depth: 0.8, quality: 0.85 },
        { topic: 'Academic Background', coverage: 0.8, depth: 0.7, quality: 0.75 },
        { topic: 'Ministry Calling', coverage: 0.85, depth: 0.9, quality: 0.9 }
      ],
      languageComplexity: {
        vocabularyLevel: 0.75,
        sentenceComplexity: 0.7,
        grammarAccuracy: 0.85,
        coherence: 0.8
      },
      spiritualContent: {
        testimonyClarity: 0.85,
        biblicalReferences: 5,
        spiritualMaturityIndicators: ['prayer life', 'biblical knowledge', 'servant heart'],
        callingClarity: 0.8,
        kingdomFocus: 0.75
      }
    };
  }

  /**
   * Analyze video content
   */
  private async analyzeVideo(recordingUrl: string): Promise<VideoAnalysis> {
    console.log(`Analyzing video: ${recordingUrl}`);

    // Mock video analysis - in reality would use computer vision
    return {
      eyeContact: 0.75,
      facialExpressions: {
        positiveExpressions: 0.8,
        engagement: 0.85,
        authenticity: 0.9,
        emotionalRange: 0.7
      },
      bodyLanguage: {
        posture: 0.8,
        gestures: 0.75,
        openness: 0.85,
        confidence: 0.8
      },
      engagement: {
        attentiveness: 0.9,
        responsiveness: 0.85,
        enthusiasm: 0.8,
        connection: 0.75
      },
      professionalPresentation: {
        appearance: 0.9,
        environment: 0.85,
        technicalSetup: 0.8,
        professionalism: 0.85
      }
    };
  }

  /**
   * Analyze audio content
   */
  private async analyzeAudio(recordingUrl: string): Promise<AudioAnalysis> {
    console.log(`Analyzing audio: ${recordingUrl}`);

    // Mock audio analysis - in reality would use speech recognition and analysis
    return {
      speechClarity: 0.85,
      speakingPace: {
        averageWordsPerMinute: 150,
        paceConsistency: 0.8,
        appropriatePauses: 0.75,
        rushingIndicators: 2
      },
      volumeConsistency: 0.8,
      fillerWords: {
        fillerWordCount: 15,
        fillerWordRate: 2.5,
        commonFillers: ['um', 'uh', 'like'],
        impactOnClarity: 0.85
      },
      emotionalTone: {
        confidence: 0.8,
        enthusiasm: 0.75,
        nervousness: 0.3,
        sincerity: 0.9
      }
    };
  }

  /**
   * Analyze behavioral patterns
   */
  private async analyzeBehavior(
    videoSession?: VideoConferenceSession,
    evaluation?: InterviewEvaluation
  ): Promise<BehavioralAnalysis> {
    console.log('Analyzing behavioral patterns');

    // Mock behavioral analysis
    return {
      responseLatency: {
        averageResponseTime: 3.5,
        consistencyScore: 0.8,
        thoughtfulnessIndicator: 0.85
      },
      questionHandling: {
        directAnswering: 0.8,
        completeness: 0.75,
        relevance: 0.85,
        clarificationSeeking: 3
      },
      adaptability: {
        flexibilityScore: 0.8,
        recoveryFromMistakes: 0.85,
        responseToUnexpected: 0.75
      },
      stressIndicators: {
        stressLevel: 0.4,
        stressManagement: 0.8,
        stressImpactOnPerformance: 0.2
      }
    };
  }

  /**
   * Analyze sentiment and emotional patterns
   */
  private async analyzeSentiment(
    videoSession?: VideoConferenceSession,
    evaluation?: InterviewEvaluation
  ): Promise<SentimentAnalysis> {
    console.log('Analyzing sentiment');

    // Mock sentiment analysis
    return {
      overallSentiment: {
        positive: 0.7,
        negative: 0.1,
        neutral: 0.2,
        overall: 0.6
      },
      sentimentProgression: [
        { timeSegment: 5, sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2, overall: 0.4 }, context: 'Initial nervousness' },
        { timeSegment: 15, sentiment: { positive: 0.8, negative: 0.1, neutral: 0.1, overall: 0.7 }, context: 'Warming up' },
        { timeSegment: 30, sentiment: { positive: 0.75, negative: 0.05, neutral: 0.2, overall: 0.7 }, context: 'Steady confidence' }
      ],
      emotionalStability: 0.8,
      authenticity: {
        genuineness: 0.85,
        consistency: 0.8,
        naturalness: 0.9
      }
    };
  }

  /**
   * Generate insights from analysis results
   */
  private async generateInsights(
    results: AnalysisResults,
    evaluation?: InterviewEvaluation
  ): Promise<AssessmentInsights> {
    const strengths: InsightItem[] = [];
    const concerns: InsightItem[] = [];
    const patterns: PatternInsight[] = [];
    const comparisons: ComparisonInsight[] = [];
    const predictions: PredictionInsight[] = [];

    // Analyze strengths
    if (results.transcriptAnalysis?.spiritualContent.testimonyClarity && results.transcriptAnalysis.spiritualContent.testimonyClarity > 0.8) {
      strengths.push({
        category: 'Spiritual Maturity',
        description: 'Clear and compelling personal testimony',
        evidence: ['High testimony clarity score', 'Strong biblical references'],
        confidence: 0.9,
        impact: 'high'
      });
    }

    if (results.videoAnalysis?.engagement.attentiveness && results.videoAnalysis.engagement.attentiveness > 0.85) {
      strengths.push({
        category: 'Communication',
        description: 'Excellent engagement and attentiveness',
        evidence: ['High attentiveness score', 'Good eye contact'],
        confidence: 0.85,
        impact: 'high'
      });
    }

    // Analyze concerns
    if (results.audioAnalysis?.fillerWords.fillerWordRate && results.audioAnalysis.fillerWords.fillerWordRate > 3) {
      concerns.push({
        category: 'Communication',
        description: 'Frequent use of filler words affecting clarity',
        evidence: [`${results.audioAnalysis.fillerWords.fillerWordRate} filler words per minute`],
        confidence: 0.8,
        impact: 'medium'
      });
    }

    // Identify patterns
    patterns.push({
      pattern: 'Increasing confidence throughout interview',
      description: 'Sentiment analysis shows positive progression',
      frequency: 1,
      significance: 0.8
    });

    // Generate comparisons (mock data)
    comparisons.push({
      metric: 'Overall Communication Score',
      applicantScore: 8.2,
      benchmarkScore: 7.5,
      percentile: 75,
      interpretation: 'Above average communication skills'
    });

    // Generate predictions
    predictions.push({
      outcome: 'Academic Success',
      probability: 0.85,
      factors: ['Strong communication', 'Clear calling', 'Good engagement'],
      confidence: 0.8
    });

    return {
      strengths,
      concerns,
      patterns,
      comparisons,
      predictions
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    results: AnalysisResults,
    insights: AssessmentInsights,
    evaluation?: InterviewEvaluation
  ): Promise<ProcessorRecommendations> {
    // Calculate recommendation based on analysis
    let recommendationScore = 0;
    let totalWeight = 0;

    // Weight different analysis components
    if (results.transcriptAnalysis) {
      const spiritualScore = results.transcriptAnalysis.spiritualContent.testimonyClarity * 0.3 +
                            results.transcriptAnalysis.spiritualContent.callingClarity * 0.3 +
                            results.transcriptAnalysis.spiritualContent.kingdomFocus * 0.4;
      recommendationScore += spiritualScore * 0.4;
      totalWeight += 0.4;
    }

    if (results.videoAnalysis) {
      const videoScore = (results.videoAnalysis.engagement.attentiveness +
                         results.videoAnalysis.engagement.responsiveness +
                         results.videoAnalysis.professionalPresentation.professionalism) / 3;
      recommendationScore += videoScore * 0.3;
      totalWeight += 0.3;
    }

    if (results.audioAnalysis) {
      const audioScore = (results.audioAnalysis.speechClarity +
                         results.audioAnalysis.emotionalTone.confidence +
                         results.audioAnalysis.emotionalTone.sincerity) / 3;
      recommendationScore += audioScore * 0.3;
      totalWeight += 0.3;
    }

    const finalScore = totalWeight > 0 ? recommendationScore / totalWeight : 0.5;

    // Determine recommendation type
    let recommendationType: RecommendationType;
    if (finalScore >= 0.9) {
      recommendationType = RecommendationType.STRONG_RECOMMEND;
    } else if (finalScore >= 0.75) {
      recommendationType = RecommendationType.RECOMMEND;
    } else if (finalScore >= 0.5) {
      recommendationType = RecommendationType.NEUTRAL;
    } else if (finalScore >= 0.3) {
      recommendationType = RecommendationType.NOT_RECOMMEND;
    } else {
      recommendationType = RecommendationType.STRONG_NOT_RECOMMEND;
    }

    // Generate reasoning
    const reasoning: string[] = [];
    insights.strengths.forEach(strength => {
      if (strength.impact === 'high') {
        reasoning.push(`Strength: ${strength.description}`);
      }
    });
    insights.concerns.forEach(concern => {
      if (concern.impact === 'high') {
        reasoning.push(`Concern: ${concern.description}`);
      }
    });

    // Generate follow-up suggestions
    const followUpSuggestions: FollowUpSuggestion[] = [];
    if (insights.concerns.some(c => c.category === 'Communication')) {
      followUpSuggestions.push({
        type: 'Communication Assessment',
        description: 'Additional communication skills evaluation recommended',
        priority: 'medium',
        timeline: '1 week'
      });
    }

    // Generate development areas
    const developmentAreas: DevelopmentArea[] = [];
    if (results.audioAnalysis?.fillerWords.fillerWordRate && results.audioAnalysis.fillerWords.fillerWordRate > 3) {
      developmentAreas.push({
        area: 'Public Speaking',
        currentLevel: 0.6,
        targetLevel: 0.8,
        recommendations: ['Practice speaking exercises', 'Join Toastmasters', 'Record practice sessions']
      });
    }

    return {
      overallRecommendation: recommendationType,
      confidence: Math.min(0.95, finalScore + 0.1),
      reasoning,
      followUpSuggestions,
      developmentAreas
    };
  }

  /**
   * Calculate overall confidence in assessment
   */
  private calculateOverallConfidence(results: AnalysisResults, insights: AssessmentInsights): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available data
    if (results.transcriptAnalysis) confidence += 0.2;
    if (results.videoAnalysis) confidence += 0.15;
    if (results.audioAnalysis) confidence += 0.1;
    if (results.behavioralAnalysis) confidence += 0.1;
    if (results.sentimentAnalysis) confidence += 0.05;

    // Adjust based on insight quality
    const highConfidenceInsights = insights.strengths.filter(s => s.confidence > 0.8).length +
                                  insights.concerns.filter(c => c.confidence > 0.8).length;
    
    confidence += Math.min(0.1, highConfidenceInsights * 0.02);

    return Math.min(0.95, confidence);
  }

  /**
   * Determine which analysis types to perform
   */
  private determineAnalysisTypes(
    videoSession?: VideoConferenceSession,
    evaluation?: InterviewEvaluation
  ): AnalysisType[] {
    const types: AnalysisType[] = [];

    if (videoSession?.recording.transcriptUrl) {
      types.push(AnalysisType.TRANSCRIPT);
    }

    if (videoSession?.recording.recordingUrl) {
      types.push(AnalysisType.VIDEO);
      types.push(AnalysisType.AUDIO);
    }

    if (videoSession || evaluation) {
      types.push(AnalysisType.BEHAVIORAL);
      types.push(AnalysisType.SENTIMENT);
    }

    if (types.length > 2) {
      types.push(AnalysisType.COMPREHENSIVE);
    }

    return types;
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Store assessment results
   */
  private async storeAssessment(assessment: AssessmentAnalysis): Promise<void> {
    console.log(`Storing assessment results: ${assessment.analysisId}`);
    // In a real implementation, this would store in database
  }

  /**
   * Get assessment results
   */
  async getAssessment(analysisId: string): Promise<AssessmentAnalysis | null> {
    try {
      console.log(`Retrieving assessment: ${analysisId}`);
      // In a real implementation, this would query the database
      return null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      throw new Error(`Failed to get assessment: ${error.message}`);
    }
  }

  /**
   * Generate assessment report
   */
  async generateAssessmentReport(interviewId: string): Promise<any> {
    try {
      console.log(`Generating assessment report for interview: ${interviewId}`);

      // Get all assessments for the interview
      // In a real implementation, this would query the database

      const report = {
        interviewId,
        reportGeneratedAt: new Date(),
        executiveSummary: {
          overallScore: 8.2,
          recommendation: RecommendationType.RECOMMEND,
          confidence: 0.85,
          keyStrengths: ['Clear testimony', 'Strong engagement', 'Professional presentation'],
          keyConcerns: ['Minor communication issues', 'Some nervousness initially']
        },
        detailedAnalysis: {
          communicationAnalysis: 'Strong overall communication with room for improvement in filler word usage',
          spiritualAssessment: 'Clear testimony and strong calling evident',
          behavioralObservations: 'Professional demeanor with good adaptability',
          technicalQuality: 'Excellent video and audio quality throughout'
        },
        recommendations: {
          admissionRecommendation: RecommendationType.RECOMMEND,
          developmentSuggestions: ['Public speaking practice', 'Interview skills workshop'],
          followUpActions: ['Reference check', 'Academic transcript review']
        },
        appendices: {
          rawScores: {},
          transcriptExcerpts: [],
          technicalMetrics: {}
        }
      };

      return report;
    } catch (error) {
      console.error('Error generating assessment report:', error);
      throw new Error(`Failed to generate assessment report: ${error.message}`);
    }
  }

  /**
   * Compare assessment with benchmarks
   */
  async compareWithBenchmarks(assessment: AssessmentAnalysis): Promise<any> {
    try {
      console.log(`Comparing assessment with benchmarks: ${assessment.analysisId}`);

      // Mock benchmark comparison
      const comparison = {
        overallPerformance: {
          percentile: 75,
          comparison: 'Above Average',
          benchmarkScore: 7.5,
          applicantScore: 8.2
        },
        categoryComparisons: [
          {
            category: 'Communication',
            percentile: 70,
            benchmarkScore: 7.2,
            applicantScore: 8.0
          },
          {
            category: 'Spiritual Maturity',
            percentile: 85,
            benchmarkScore: 7.8,
            applicantScore: 8.5
          },
          {
            category: 'Professional Presentation',
            percentile: 80,
            benchmarkScore: 7.5,
            applicantScore: 8.3
          }
        ],
        cohortComparison: {
          cohort: 'Spring 2024 Applicants',
          totalApplicants: 150,
          applicantRank: 38,
          percentileRank: 75
        }
      };

      return comparison;
    } catch (error) {
      console.error('Error comparing with benchmarks:', error);
      throw new Error(`Failed to compare with benchmarks: ${error.message}`);
    }
  }
}