/**
 * Prophetic Check-in and Spiritual Growth Types
 * Types for prophetic check-ins, spiritual growth tracking, and calling discernment
 */

export interface PropheticCheckIn {
  id: string;
  userId: string;
  timestamp: Date;
  questionnaire: QuestionnaireResponse[];
  spiritualTemperature: number; // 1-10 scale
  mood: string;
  lifeCircumstances: string;
  prayerFocus: string[];
  scriptureHighlights: string[];
  godsVoice: string;
  obedienceLevel: number; // 1-10 scale
  communityEngagement: number; // 1-10 scale
  ministryActivity: string;
  challengesFaced: string[];
  victoriesExperienced: string[];
}

export interface QuestionnaireResponse {
  questionId: string;
  question: string;
  answer: string;
  category: QuestionCategory;
  importance: 'low' | 'medium' | 'high';
}

export type QuestionCategory =
  | 'spiritual-health'
  | 'prayer-life'
  | 'scripture-engagement'
  | 'worship'
  | 'service'
  | 'fellowship'
  | 'character-development'
  | 'calling-clarity'
  | 'prophetic-sensitivity'
  | 'kingdom-impact';

export interface SpiritualGrowthTracking {
  id: string;
  userId: string;
  checkInId: string;
  timestamp: Date;
  
  // Growth Metrics
  overallGrowthScore: number; // 0-100
  growthTrend: 'accelerating' | 'steady' | 'plateaued' | 'declining';
  growthAreas: GrowthMetric[];
  
  // Visual Progress Indicators
  progressIndicators: ProgressIndicator[];
  milestones: Milestone[];
  
  // Comparative Analysis
  comparedToLastMonth: number; // percentage change
  comparedToLastQuarter: number;
  comparedToLastYear: number;
  
  // Insights
  insights: string[];
  recommendations: string[];
}

export interface GrowthMetric {
  area: string;
  category: QuestionCategory;
  currentScore: number; // 0-100
  previousScore: number;
  change: number;
  trend: 'improving' | 'stable' | 'declining';
  evidence: string[];
  nextSteps: string[];
}

export interface ProgressIndicator {
  type: 'gauge' | 'bar' | 'line' | 'radar' | 'tree';
  title: string;
  description: string;
  data: ProgressData;
  visualization: VisualizationConfig;
}

export interface ProgressData {
  current: number;
  target: number;
  history: HistoricalDataPoint[];
  benchmarks: Benchmark[];
}

export interface HistoricalDataPoint {
  date: Date;
  value: number;
  context?: string;
}

export interface Benchmark {
  label: string;
  value: number;
  description: string;
}

export interface VisualizationConfig {
  colorScheme: string[];
  showTrend: boolean;
  showBenchmarks: boolean;
  animationEnabled: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  category: QuestionCategory;
  achievedDate: Date;
  significance: 'minor' | 'moderate' | 'major' | 'transformational';
  celebration: string;
  scriptureReference?: string;
  nextMilestone?: string;
}

export interface PropheticGuidance {
  id: string;
  userId: string;
  checkInId: string;
  timestamp: Date;
  
  // AI-Generated Guidance
  guidance: GuidanceMessage[];
  scriptureReferences: ScriptureReference[];
  propheticInsights: PropheticInsight[];
  
  // Calling and Direction
  callingClarification: CallingClarification;
  nextSteps: ActionStep[];
  
  // Warnings and Encouragements
  warnings: Warning[];
  encouragements: Encouragement[];
  
  // Confidence and Review
  confidence: number;
  requiresHumanReview: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface GuidanceMessage {
  type: 'instruction' | 'encouragement' | 'correction' | 'revelation' | 'confirmation';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scriptureSupport: ScriptureReference[];
  actionable: boolean;
}

export interface ScriptureReference {
  reference: string;
  text: string;
  translation: string;
  context: string;
  application: string;
  propheticSignificance?: string;
}

export interface PropheticInsight {
  type: 'word-of-knowledge' | 'word-of-wisdom' | 'discernment' | 'vision' | 'impression';
  insight: string;
  confidence: number;
  requiresConfirmation: boolean;
  confirmationSources: string[];
  timing: 'immediate' | 'soon' | 'season' | 'future';
  application: string;
}

export interface CallingClarification {
  currentCalling: string;
  callingConfidence: number; // 0-100
  callingEvolution: CallingEvolution[];
  giftActivation: GiftActivation[];
  ministryOpportunities: MinistryOpportunity[];
  preparationNeeded: PreparationArea[];
  timingGuidance: string;
}

export interface CallingEvolution {
  date: Date;
  description: string;
  significance: string;
  confirmations: string[];
}

export interface GiftActivation {
  gift: SpiritualGift;
  activationLevel: number; // 0-100
  evidences: string[];
  developmentPath: string[];
  ministryApplications: string[];
}

export interface SpiritualGift {
  name: string;
  category: 'motivational' | 'ministry' | 'manifestation';
  description: string;
  scriptureReference: string;
}

export interface MinistryOpportunity {
  title: string;
  description: string;
  alignment: number; // 0-100 alignment with calling
  requirements: string[];
  timeline: string;
  prayerPoints: string[];
}

export interface PreparationArea {
  area: string;
  currentLevel: number; // 0-100
  targetLevel: number;
  gap: number;
  resources: Resource[];
  mentorshipNeeded: boolean;
  estimatedTime: string;
}

export interface Resource {
  type: 'book' | 'course' | 'article' | 'video' | 'mentor' | 'training';
  title: string;
  author?: string;
  url?: string;
  description: string;
  relevance: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ActionStep {
  step: string;
  category: QuestionCategory;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  resources: Resource[];
  accountability: string[];
  measurable: boolean;
  successCriteria: string[];
}

export interface Warning {
  type: 'spiritual-danger' | 'deception' | 'distraction' | 'compromise' | 'burnout';
  warning: string;
  severity: 'caution' | 'concern' | 'urgent';
  indicators: string[];
  preventionSteps: string[];
  scriptureWarning: ScriptureReference[];
}

export interface Encouragement {
  message: string;
  scripturePromise: ScriptureReference[];
  testimony?: string;
  celebration: string;
  affirmation: string;
}

export interface SpiritualGiftIdentification {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Identified Gifts
  identifiedGifts: IdentifiedGift[];
  giftMix: GiftMix;
  
  // Assessment Results
  assessmentScores: AssessmentScore[];
  evidenceFromLife: LifeEvidence[];
  confirmations: Confirmation[];
  
  // Development Plan
  developmentPlan: GiftDevelopmentPlan;
  
  confidence: number;
  requiresConfirmation: boolean;
}

export interface IdentifiedGift {
  gift: SpiritualGift;
  strength: number; // 0-100
  maturity: number; // 0-100
  frequency: 'dormant' | 'emerging' | 'active' | 'mature';
  evidences: string[];
  testimonies: string[];
  fruitfulness: string[];
}

export interface GiftMix {
  primaryGifts: string[];
  secondaryGifts: string[];
  supportingGifts: string[];
  uniqueCombination: string;
  ministryFit: string[];
}

export interface AssessmentScore {
  giftName: string;
  score: number;
  questions: QuestionScore[];
}

export interface QuestionScore {
  question: string;
  response: number;
  weight: number;
}

export interface LifeEvidence {
  gift: string;
  evidence: string;
  context: string;
  impact: string;
  witnesses: string[];
  date?: Date;
}

export interface Confirmation {
  source: 'self' | 'mentor' | 'community' | 'ministry-leader' | 'prophetic-word' | 'fruit';
  gift: string;
  confirmation: string;
  date: Date;
  confidence: number;
}

export interface GiftDevelopmentPlan {
  gifts: string[];
  developmentStages: DevelopmentStage[];
  trainingResources: Resource[];
  practiceOpportunities: PracticeOpportunity[];
  mentorshipRecommendations: MentorshipRecommendation[];
  timeline: string;
}

export interface DevelopmentStage {
  stage: string;
  description: string;
  duration: string;
  activities: string[];
  milestones: string[];
  resources: Resource[];
}

export interface PracticeOpportunity {
  gift: string;
  opportunity: string;
  setting: string;
  frequency: string;
  supervision: boolean;
  feedback: string;
}

export interface MentorshipRecommendation {
  gift: string;
  mentorType: string;
  mentorCharacteristics: string[];
  mentorshipDuration: string;
  mentorshipGoals: string[];
}

export interface CallingDiscernment {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Calling Analysis
  callingStatement: string;
  callingConfidence: number; // 0-100
  callingComponents: CallingComponent[];
  
  // Discernment Process
  discernmentJourney: DiscernmentEntry[];
  confirmations: CallingConfirmation[];
  questions: CallingQuestion[];
  
  // Alignment Analysis
  giftAlignment: number; // 0-100
  passionAlignment: number;
  opportunityAlignment: number;
  fruitAlignment: number;
  
  // Guidance
  nextSteps: CallingNextStep[];
  preparationPath: PreparationPath;
  timingGuidance: TimingGuidance;
  
  confidence: number;
}

export interface CallingComponent {
  component: string;
  description: string;
  strength: number; // 0-100
  evidences: string[];
  development: string;
}

export interface DiscernmentEntry {
  date: Date;
  entry: string;
  insights: string[];
  questions: string[];
  confirmations: string[];
  concerns: string[];
}

export interface CallingConfirmation {
  source: 'scripture' | 'prophecy' | 'circumstances' | 'counsel' | 'peace' | 'fruit';
  confirmation: string;
  date: Date;
  significance: 'minor' | 'moderate' | 'major';
  details: string;
}

export interface CallingQuestion {
  question: string;
  category: 'clarity' | 'timing' | 'preparation' | 'confirmation' | 'obstacles';
  urgency: 'low' | 'medium' | 'high';
  explorationSteps: string[];
  resources: Resource[];
}

export interface CallingNextStep {
  step: string;
  category: 'preparation' | 'exploration' | 'confirmation' | 'activation' | 'development';
  priority: 'low' | 'medium' | 'high';
  timeline: string;
  dependencies: string[];
  resources: Resource[];
  accountability: string[];
}

export interface PreparationPath {
  currentReadiness: number; // 0-100
  targetReadiness: number;
  preparationAreas: PreparationArea[];
  estimatedDuration: string;
  milestones: PreparationMilestone[];
}

export interface PreparationMilestone {
  milestone: string;
  description: string;
  targetDate: Date;
  requirements: string[];
  celebration: string;
}

export interface TimingGuidance {
  currentSeason: string;
  readiness: 'not-ready' | 'preparing' | 'ready' | 'active';
  indicators: string[];
  waitingGuidance?: string;
  activationGuidance?: string;
  prayerPoints: string[];
}

export interface SpiritualMentorMatch {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Mentorship Needs
  mentorshipNeeds: MentorshipNeed[];
  currentChallenges: string[];
  growthGoals: string[];
  
  // Mentor Recommendations
  recommendedMentors: MentorRecommendation[];
  matchingCriteria: MatchingCriteria;
  
  // Connection Process
  connectionSteps: ConnectionStep[];
  expectations: MentorshipExpectation[];
  
  confidence: number;
}

export interface MentorshipNeed {
  area: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  duration: string;
  specificNeeds: string[];
}

export interface MentorRecommendation {
  mentorId?: string;
  mentorType: string;
  mentorCharacteristics: string[];
  mentorExpertise: string[];
  matchScore: number; // 0-100
  matchReasons: string[];
  mentorshipStyle: string;
  availability: string;
  connectionMethod: string;
}

export interface MatchingCriteria {
  giftAlignment: boolean;
  callingAlignment: boolean;
  experienceLevel: string;
  personalityFit: string;
  geographicPreference: string;
  communicationStyle: string;
  mentorshipGoals: string[];
}

export interface ConnectionStep {
  step: string;
  description: string;
  timeline: string;
  resources: string[];
  completed: boolean;
}

export interface MentorshipExpectation {
  category: 'frequency' | 'duration' | 'format' | 'goals' | 'boundaries';
  expectation: string;
  rationale: string;
}

export interface SpiritualGrowthAnalytics {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  
  // Summary Metrics
  overallGrowth: number; // 0-100
  growthRate: number; // percentage
  consistencyScore: number; // 0-100
  
  // Category Breakdown
  categoryScores: CategoryScore[];
  
  // Trends
  trends: GrowthTrend[];
  patterns: GrowthPattern[];
  
  // Achievements
  achievements: Achievement[];
  breakthroughs: Breakthrough[];
  
  // Challenges
  persistentChallenges: Challenge[];
  newChallenges: Challenge[];
  
  // Recommendations
  recommendations: AnalyticsRecommendation[];
  
  // Comparative Analysis
  peerComparison?: PeerComparison;
  historicalComparison: HistoricalComparison;
}

export interface CategoryScore {
  category: QuestionCategory;
  score: number; // 0-100
  change: number;
  trend: 'improving' | 'stable' | 'declining';
  rank: number;
  insights: string[];
}

export interface GrowthTrend {
  area: string;
  direction: 'upward' | 'stable' | 'downward';
  velocity: 'rapid' | 'moderate' | 'slow';
  sustainability: 'sustainable' | 'at-risk' | 'unsustainable';
  factors: string[];
}

export interface GrowthPattern {
  pattern: string;
  description: string;
  frequency: string;
  impact: 'positive' | 'neutral' | 'negative';
  recommendations: string[];
}

export interface Achievement {
  title: string;
  description: string;
  date: Date;
  category: QuestionCategory;
  significance: 'minor' | 'moderate' | 'major';
  celebration: string;
}

export interface Breakthrough {
  area: string;
  description: string;
  date: Date;
  impact: string;
  testimony: string;
  scriptureConnection?: string;
}

export interface Challenge {
  challenge: string;
  category: QuestionCategory;
  severity: 'low' | 'medium' | 'high';
  duration: string;
  attempts: string[];
  supportNeeded: string[];
  resources: Resource[];
}

export interface AnalyticsRecommendation {
  recommendation: string;
  category: QuestionCategory;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
  expectedImpact: string;
  resources: Resource[];
  timeline: string;
}

export interface PeerComparison {
  percentile: number;
  strengths: string[];
  growthOpportunities: string[];
  uniqueGifts: string[];
}

export interface HistoricalComparison {
  comparedTo: 'last-month' | 'last-quarter' | 'last-year' | 'all-time';
  growthPercentage: number;
  significantChanges: SignificantChange[];
  milestones: Milestone[];
}

export interface SignificantChange {
  area: string;
  change: number;
  date: Date;
  context: string;
  impact: string;
}

export interface PropheticCheckInRequest {
  userId: string;
  questionnaire: QuestionnaireResponse[];
  spiritualTemperature: number;
  mood: string;
  lifeCircumstances: string;
  prayerFocus: string[];
  scriptureHighlights: string[];
  godsVoice: string;
  obedienceLevel: number;
  communityEngagement: number;
  ministryActivity: string;
  challengesFaced: string[];
  victoriesExperienced: string[];
}

export interface PropheticCheckInResponse {
  success: boolean;
  checkIn?: PropheticCheckIn;
  growthTracking?: SpiritualGrowthTracking;
  guidance?: PropheticGuidance;
  error?: string;
  confidence: number;
  requiresHumanReview: boolean;
}

export interface SpiritualGiftAssessmentRequest {
  userId: string;
  assessmentResponses: QuestionScore[];
  lifeExperiences: string[];
  ministryExperiences: string[];
  confirmations: string[];
}

export interface SpiritualGiftAssessmentResponse {
  success: boolean;
  identification?: SpiritualGiftIdentification;
  error?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export interface CallingDiscernmentRequest {
  userId: string;
  currentUnderstanding: string;
  questions: string[];
  experiences: string[];
  confirmations: string[];
  concerns: string[];
}

export interface CallingDiscernmentResponse {
  success: boolean;
  discernment?: CallingDiscernment;
  error?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export interface MentorMatchRequest {
  userId: string;
  mentorshipNeeds: string[];
  growthGoals: string[];
  preferences: {
    mentorType?: string;
    communicationStyle?: string;
    frequency?: string;
    duration?: string;
  };
}

export interface MentorMatchResponse {
  success: boolean;
  matches?: SpiritualMentorMatch;
  error?: string;
  confidence: number;
}

export interface GrowthAnalyticsRequest {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  includeComparisons: boolean;
}

export interface GrowthAnalyticsResponse {
  success: boolean;
  analytics?: SpiritualGrowthAnalytics;
  error?: string;
}
