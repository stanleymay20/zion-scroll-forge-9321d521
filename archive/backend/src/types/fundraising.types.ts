/**
 * Fundraising & Donor Management Types
 * Types for AI-powered donor intelligence and relationship management
 */

// ============================================================================
// Core Donor Types
// ============================================================================

export interface Donor {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;
  donorType: DonorType;
  status: DonorStatus;
  firstGiftDate?: Date;
  lastGiftDate?: Date;
  totalLifetimeGiving: number;
  givingHistory: DonationRecord[];
  interests: string[];
  engagementLevel: EngagementLevel;
  preferredContactMethod: ContactMethod;
  communicationPreferences: CommunicationPreferences;
  relationships: DonorRelationship[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  amount: number;
  date: Date;
  campaign?: string;
  designation?: string;
  method: PaymentMethod;
  recurring: boolean;
  frequency?: RecurringFrequency;
  taxDeductible: boolean;
  acknowledged: boolean;
  acknowledgedDate?: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface DonorRelationship {
  type: RelationshipType;
  relatedDonorId?: string;
  organizationName?: string;
  description: string;
}

export interface CommunicationPreferences {
  emailOptIn: boolean;
  phoneOptIn: boolean;
  mailOptIn: boolean;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  topics: string[];
}

// ============================================================================
// Enums
// ============================================================================

export enum DonorType {
  INDIVIDUAL = 'individual',
  FAMILY = 'family',
  CORPORATION = 'corporation',
  FOUNDATION = 'foundation',
  CHURCH = 'church',
  ALUMNI = 'alumni',
  PARENT = 'parent',
  FRIEND = 'friend'
}

export enum DonorStatus {
  ACTIVE = 'active',
  LAPSED = 'lapsed',
  PROSPECT = 'prospect',
  MAJOR_DONOR = 'major_donor',
  INACTIVE = 'inactive'
}

export enum EngagementLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none'
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  MAIL = 'mail',
  IN_PERSON = 'in_person',
  VIDEO_CALL = 'video_call'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CASH = 'cash',
  STOCK = 'stock',
  CRYPTOCURRENCY = 'cryptocurrency',
  SCROLLCOIN = 'scrollcoin'
}

export enum RecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually'
}

export enum RelationshipType {
  SPOUSE = 'spouse',
  FAMILY_MEMBER = 'family_member',
  BUSINESS_PARTNER = 'business_partner',
  BOARD_MEMBER = 'board_member',
  VOLUNTEER = 'volunteer',
  EMPLOYEE = 'employee'
}

// ============================================================================
// Donor Intelligence Types
// ============================================================================

export interface DonorIntelligence {
  donorId: string;
  givingCapacity: CapacityRange;
  estimatedCapacity: number;
  capacityConfidence: number;
  interests: DonorInterest[];
  engagementScore: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  optimalAskAmount: number;
  bestContactMethod: ContactMethod;
  bestContactTime: string;
  nextSteps: RecommendedAction[];
  riskFactors: string[];
  opportunities: string[];
  analysis: string;
  generatedAt: Date;
}

export interface CapacityRange {
  min: number;
  max: number;
  confidence: number;
}

export interface DonorInterest {
  category: string;
  subcategories: string[];
  strength: number;
  evidence: string[];
}

export interface RecommendedAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  timing: string;
  reasoning: string;
  expectedOutcome: string;
}

// ============================================================================
// Appeal Generation Types
// ============================================================================

export interface AppealRequest {
  donorId: string;
  campaignId?: string;
  askAmount?: number;
  designation?: string;
  urgency: 'high' | 'medium' | 'low';
  tone: 'formal' | 'casual' | 'personal';
  includeImpactStory: boolean;
  includeTestimonial: boolean;
}

export interface PersonalizedAppeal {
  donorId: string;
  subject: string;
  greeting: string;
  opening: string;
  body: string;
  impactStory?: ImpactStory;
  testimonial?: Testimonial;
  askStatement: string;
  suggestedAmount: number;
  alternativeAmounts: number[];
  callToAction: string;
  closing: string;
  signature: string;
  postscript?: string;
  confidence: number;
  reasoning: string;
  generatedAt: Date;
}

export interface ImpactStory {
  title: string;
  story: string;
  outcome: string;
  relevance: string;
  imageUrl?: string;
}

export interface Testimonial {
  author: string;
  role: string;
  quote: string;
  context: string;
  relevance: string;
}

// ============================================================================
// Relationship Management Types
// ============================================================================

export interface EngagementPlan {
  donorId: string;
  currentStatus: string;
  goals: string[];
  touchpoints: PlannedTouchpoint[];
  recognitionOpportunities: RecognitionOpportunity[];
  relationshipHealth: RelationshipHealth;
  nextReviewDate: Date;
  generatedAt: Date;
}

export interface PlannedTouchpoint {
  type: TouchpointType;
  timing: string;
  method: ContactMethod;
  purpose: string;
  suggestedContent: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedDate?: Date;
}

export interface RecognitionOpportunity {
  type: RecognitionType;
  occasion: string;
  timing: string;
  suggestedApproach: string;
  impact: string;
}

export interface RelationshipHealth {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

export enum TouchpointType {
  THANK_YOU = 'thank_you',
  UPDATE = 'update',
  INVITATION = 'invitation',
  RECOGNITION = 'recognition',
  STEWARDSHIP = 'stewardship',
  CULTIVATION = 'cultivation',
  SOLICITATION = 'solicitation'
}

export enum RecognitionType {
  MILESTONE = 'milestone',
  ANNIVERSARY = 'anniversary',
  BIRTHDAY = 'birthday',
  SPECIAL_EVENT = 'special_event',
  NAMING_OPPORTUNITY = 'naming_opportunity',
  HONOR_ROLL = 'honor_roll'
}

// ============================================================================
// Prospect Identification Types
// ============================================================================

export interface ProspectProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: ProspectSource;
  estimatedCapacity: number;
  capacityConfidence: number;
  affinityScore: number;
  readinessScore: number;
  overallScore: number;
  interests: string[];
  connections: string[];
  wealthIndicators: WealthIndicator[];
  engagementHistory: string[];
  recommendedStrategy: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  status: ProspectStatus;
  notes: string[];
  createdAt: Date;
}

export interface WealthIndicator {
  type: string;
  value: string;
  confidence: number;
  source: string;
}

export enum ProspectSource {
  ALUMNI = 'alumni',
  PARENT = 'parent',
  COMMUNITY = 'community',
  REFERRAL = 'referral',
  EVENT = 'event',
  RESEARCH = 'research'
}

export enum ProspectStatus {
  IDENTIFIED = 'identified',
  RESEARCHING = 'researching',
  CULTIVATING = 'cultivating',
  READY_TO_SOLICIT = 'ready_to_solicit',
  CONVERTED = 'converted',
  NOT_INTERESTED = 'not_interested'
}

// ============================================================================
// Impact Reporting Types
// ============================================================================

export interface ImpactReport {
  donorId: string;
  reportPeriod: ReportPeriod;
  totalImpact: number;
  specificOutcomes: Outcome[];
  studentStories: StudentStory[];
  metrics: ImpactMetric[];
  visualizations: Visualization[];
  thankYouMessage: string;
  futureOpportunities: string[];
  generatedAt: Date;
}

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface Outcome {
  category: string;
  description: string;
  impact: string;
  donorContribution: number;
  percentageOfTotal: number;
  evidence: string[];
}

export interface StudentStory {
  studentName: string;
  program: string;
  story: string;
  outcome: string;
  quote?: string;
  imageUrl?: string;
  relevanceToDonor: string;
}

export interface ImpactMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeDirection: 'up' | 'down' | 'stable';
  context: string;
}

export interface Visualization {
  type: 'chart' | 'graph' | 'infographic' | 'map';
  title: string;
  description: string;
  dataUrl: string;
  imageUrl?: string;
}

// ============================================================================
// Service Request/Response Types
// ============================================================================

export interface DonorAnalysisRequest {
  donorId: string;
  includeHistory?: boolean;
  includePredictions?: boolean;
}

export interface DonorAnalysisResponse {
  intelligence: DonorIntelligence;
  confidence: number;
  recommendations: string[];
}

export interface AppealGenerationResponse {
  appeal: PersonalizedAppeal;
  confidence: number;
  alternatives: PersonalizedAppeal[];
}

export interface EngagementPlanResponse {
  plan: EngagementPlan;
  confidence: number;
  implementationGuide: string[];
}

export interface ProspectListResponse {
  prospects: ProspectProfile[];
  totalCount: number;
  highPriorityCount: number;
  estimatedTotalCapacity: number;
}

export interface ImpactReportResponse {
  report: ImpactReport;
  confidence: number;
  deliveryRecommendations: string[];
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  description: string;
  goal: number;
  raised: number;
  startDate: Date;
  endDate: Date;
  status: CampaignStatus;
  targetAudience: string[];
  messaging: CampaignMessaging;
  metrics: CampaignMetrics;
}

export interface CampaignMessaging {
  theme: string;
  keyMessages: string[];
  impactStories: ImpactStory[];
  testimonials: Testimonial[];
}

export interface CampaignMetrics {
  donorCount: number;
  averageGift: number;
  conversionRate: number;
  retentionRate: number;
  costPerDollarRaised: number;
}

export enum CampaignStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
