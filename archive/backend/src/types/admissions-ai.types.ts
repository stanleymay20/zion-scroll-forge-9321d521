/**
 * ScrollUniversity Admissions AI Types
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * Type definitions for AI-powered admissions processing
 */

export interface DocumentExtractionRequest {
    documentId: string;
    documentType: 'TRANSCRIPT' | 'ESSAY' | 'RESUME' | 'RECOMMENDATION_LETTER' | 'DIPLOMA' | 'CERTIFICATE';
    documentUrl: string;
    applicationId: string;
}

export interface ExtractedTranscriptData {
    institution: string;
    studentName: string;
    studentId?: string;
    degreeProgram?: string;
    gpa?: number;
    gradeScale?: string;
    courses: Array<{
        code: string;
        name: string;
        credits: number;
        grade: string;
        semester: string;
        year: number;
    }>;
    graduationDate?: Date;
    honors?: string[];
    academicStanding?: string;
}

export interface ExtractedEssayData {
    wordCount: number;
    mainThemes: string[];
    spiritualElements: string[];
    personalExperiences: string[];
    careerGoals: string[];
    motivations: string[];
    challenges: string[];
    strengths: string[];
}

export interface ExtractedResumeData {
    personalInfo: {
        name: string;
        email?: string;
        phone?: string;
        location?: string;
    };
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        graduationDate?: Date;
        gpa?: number;
    }>;
    workExperience: Array<{
        company: string;
        position: string;
        startDate: Date;
        endDate?: Date;
        responsibilities: string[];
        achievements: string[];
    }>;
    ministryExperience: Array<{
        organization: string;
        role: string;
        startDate: Date;
        endDate?: Date;
        description: string;
    }>;
    skills: string[];
    certifications: string[];
    languages: string[];
}

export interface ExtractedRecommendationData {
    recommenderName: string;
    recommenderTitle: string;
    recommenderOrganization: string;
    relationshipToApplicant: string;
    durationOfRelationship: string;
    strengths: string[];
    weaknesses: string[];
    spiritualQualities: string[];
    academicAbilities: string[];
    characterTraits: string[];
    leadershipExamples: string[];
    overallRecommendation: 'STRONG_RECOMMEND' | 'RECOMMEND' | 'NEUTRAL' | 'NOT_RECOMMEND';
    additionalComments: string;
}

export interface DocumentExtractionResult {
    documentId: string;
    documentType: string;
    extractedData: ExtractedTranscriptData | ExtractedEssayData | ExtractedResumeData | ExtractedRecommendationData;
    confidence: number;
    validationErrors: string[];
    extractedAt: Date;
    processingTime: number;
    cost: number;
}

export interface ApplicationScoringRequest {
    applicationId: string;
    extractedData: {
        transcripts?: ExtractedTranscriptData[];
        essays?: ExtractedEssayData[];
        resume?: ExtractedResumeData;
        recommendations?: ExtractedRecommendationData[];
    };
    personalStatement?: string;
    spiritualTestimony?: string;
}

export interface AcademicScore {
    gpa: number;
    courseRigor: number;
    relevantCoursework: number;
    academicAchievements: number;
    overallScore: number;
    reasoning: string;
}

export interface SpiritualMaturityScore {
    faithDepth: number;
    biblicalKnowledge: number;
    ministryExperience: number;
    spiritualGrowth: number;
    kingdomFocus: number;
    overallScore: number;
    reasoning: string;
}

export interface LeadershipScore {
    leadershipExperience: number;
    impactDemonstrated: number;
    servantLeadership: number;
    teamCollaboration: number;
    overallScore: number;
    reasoning: string;
}

export interface MissionAlignmentScore {
    scrollUniversityFit: number;
    callingClarity: number;
    visionAlignment: number;
    culturalFit: number;
    overallScore: number;
    reasoning: string;
}

export interface ApplicationScoreResult {
    applicationId: string;
    academicScore: AcademicScore;
    spiritualMaturityScore: SpiritualMaturityScore;
    leadershipScore: LeadershipScore;
    missionAlignmentScore: MissionAlignmentScore;
    overallScore: number;
    recommendation: 'ACCEPTED' | 'INTERVIEW' | 'WAITLISTED' | 'REJECTED';
    confidence: number;
    strengths: string[];
    concerns: string[];
    scoredAt: Date;
    processingTime: number;
    cost: number;
}

export interface EssayEvaluationRequest {
    applicationId: string;
    essayText: string;
    essayType: 'PERSONAL_STATEMENT' | 'SPIRITUAL_TESTIMONY' | 'SUPPLEMENTAL';
    wordLimit?: number;
}

export interface EssayEvaluationResult {
    applicationId: string;
    essayType: string;
    writingQuality: {
        grammar: number;
        clarity: number;
        organization: number;
        vocabulary: number;
        overallScore: number;
    };
    authenticity: {
        genuineness: number;
        personalVoice: number;
        specificExamples: number;
        overallScore: number;
    };
    spiritualDepth: {
        biblicalIntegration: number;
        spiritualInsight: number;
        faithJourney: number;
        transformation: number;
        overallScore: number;
    };
    scrollAlignment: {
        visionAlignment: number;
        kingdomFocus: number;
        callingClarity: number;
        overallScore: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    feedback: string;
    confidence: number;
    evaluatedAt: Date;
    processingTime: number;
    cost: number;
}

export interface DecisionRecommendationRequest {
    applicationId: string;
    overallScore: number;
    componentScores: {
        academic: number;
        spiritual: number;
        leadership: number;
        missionAlignment: number;
    };
    essayEvaluations: EssayEvaluationResult[];
    interviewResults?: any[];
}

export interface DecisionRecommendationResult {
    applicationId: string;
    decision: 'ACCEPTED' | 'INTERVIEW' | 'WAITLISTED' | 'REJECTED';
    confidence: number;
    reasoning: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    scholarshipEligibility?: {
        eligible: boolean;
        amount?: number;
        type?: string;
        reasoning: string;
    };
    alternativePathways?: string[];
    decidedAt: Date;
    processingTime: number;
    cost: number;
}

export interface DecisionLetterRequest {
    applicationId: string;
    applicantName: string;
    decision: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED';
    overallScore: number;
    strengths: string[];
    concerns?: string[];
    scholarshipInfo?: {
        amount: number;
        type: string;
    };
    alternativePathways?: string[];
    programApplied: string;
}

export interface DecisionLetterResult {
    applicationId: string;
    letterType: 'ACCEPTANCE' | 'REJECTION' | 'WAITLIST';
    subject: string;
    body: string;
    tone: 'CONGRATULATORY' | 'ENCOURAGING' | 'CONSTRUCTIVE';
    personalizedElements: string[];
    generatedAt: Date;
    processingTime: number;
    cost: number;
}

export interface AdmissionsAIMetrics {
    totalApplicationsProcessed: number;
    averageProcessingTime: number;
    averageConfidence: number;
    accuracyRate: number;
    costPerApplication: number;
    documentExtractionAccuracy: number;
    scoringAccuracy: number;
    essayEvaluationAccuracy: number;
    decisionAccuracy: number;
    humanReviewRate: number;
    period: {
        start: Date;
        end: Date;
    };
}

export interface AdmissionsAIAuditLog {
    id: string;
    applicationId: string;
    operation: 'DOCUMENT_EXTRACTION' | 'SCORING' | 'ESSAY_EVALUATION' | 'DECISION_RECOMMENDATION' | 'LETTER_GENERATION';
    input: any;
    output: any;
    confidence: number;
    cost: number;
    processingTime: number;
    humanReviewed: boolean;
    reviewOutcome?: 'APPROVED' | 'MODIFIED' | 'REJECTED';
    timestamp: Date;
    metadata?: Record<string, any>;
}
