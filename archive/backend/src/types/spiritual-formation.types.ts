/**
 * Spiritual Formation AI Types
 * Types for spiritual formation tracking and analysis
 */

export interface SpiritualCheckIn {
  id: string;
  userId: string;
  timestamp: Date;
  responses: CheckInResponse[];
  mood?: string;
  spiritualTemperature?: number; // 1-10 scale
}

export interface CheckInResponse {
  question: string;
  answer: string;
  category: 'prayer' | 'scripture' | 'worship' | 'service' | 'fellowship' | 'general';
}

export interface SpiritualAnalysis {
  checkInId: string;
  userId: string;
  growthAreas: GrowthArea[];
  struggles: Struggle[];
  breakthroughs: Breakthrough[];
  insights: string[];
  recommendedScripture: BibleVerse[];
  suggestedResources: Resource[];
  advisorAlert: boolean;
  alertReason?: string;
  confidence: number;
  timestamp: Date;
}

export interface GrowthArea {
  area: string;
  description: string;
  evidence: string[];
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface Struggle {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: 'new' | 'ongoing' | 'chronic';
  supportNeeded: string[];
}

export interface Breakthrough {
  area: string;
  description: string;
  significance: 'minor' | 'moderate' | 'major';
  celebration: string;
}

export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
  relevance: string;
}

export interface Resource {
  type: 'book' | 'article' | 'video' | 'course' | 'devotional' | 'mentor';
  title: string;
  author?: string;
  url?: string;
  description: string;
  relevance: string;
}

export interface PrayerRequest {
  id: string;
  userId: string;
  request: string;
  category?: string;
  isPrivate: boolean;
  timestamp: Date;
  status: 'active' | 'answered' | 'ongoing';
  answeredDate?: Date;
  testimony?: string;
}

export interface PrayerCategories {
  requestId: string;
  categories: PrayerCategory[];
  themes: string[];
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  suggestedScripture: BibleVerse[];
  recommendedResources: Resource[];
  prayerPartners?: string[];
}

export interface PrayerCategory {
  name: string;
  confidence: number;
  subcategories: string[];
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  isPrivate: boolean;
  mood?: string;
}

export interface JournalInsights {
  entryId: string;
  userId: string;
  spiritualInsights: Insight[];
  questionsAndDoubts: QuestionOrDoubt[];
  growthOpportunities: GrowthOpportunity[];
  emotionalState: EmotionalState;
  theologicalThemes: string[];
  privacyMaintained: boolean;
  confidence: number;
  timestamp: Date;
}

export interface Insight {
  type: 'revelation' | 'understanding' | 'conviction' | 'calling' | 'wisdom';
  description: string;
  significance: 'minor' | 'moderate' | 'major';
  relatedScripture?: BibleVerse[];
}

export interface QuestionOrDoubt {
  question: string;
  category: 'theological' | 'practical' | 'personal' | 'doctrinal';
  severity: 'curiosity' | 'concern' | 'crisis';
  suggestedResources: Resource[];
  requiresAdvisor: boolean;
}

export interface GrowthOpportunity {
  area: string;
  description: string;
  actionSteps: string[];
  resources: Resource[];
  mentorshipNeeded: boolean;
}

export interface EmotionalState {
  primary: string;
  secondary?: string[];
  intensity: number; // 1-10
  trend: 'improving' | 'stable' | 'declining';
}

export interface SpiritualProfile {
  userId: string;
  strengths: string[];
  growthAreas: string[];
  spiritualGifts: string[];
  callingIndicators: string[];
  disciplinePreferences: string[];
  mentorshipNeeds: string[];
  lastUpdated: Date;
}

export interface SpiritualPractice {
  type: 'prayer' | 'scripture' | 'fasting' | 'worship' | 'service' | 'solitude' | 'meditation' | 'fellowship';
  name: string;
  description: string;
  frequency: string;
  duration: string;
  resources: Resource[];
  scriptureSupport: BibleVerse[];
  personalizedReason: string;
}

export interface SpiritualPracticeRecommendations {
  userId: string;
  profile: SpiritualProfile;
  practices: SpiritualPractice[];
  devotionalMaterials: Resource[];
  mentorConnections: MentorConnection[];
  scriptureReadingPlan: ScriptureReadingPlan;
  confidence: number;
  timestamp: Date;
}

export interface MentorConnection {
  mentorId?: string;
  mentorType: string;
  reason: string;
  areas: string[];
  suggestedFrequency: string;
}

export interface ScriptureReadingPlan {
  name: string;
  description: string;
  duration: string;
  schedule: ReadingSchedule[];
  focus: string[];
}

export interface ReadingSchedule {
  day: number;
  passages: BibleVerse[];
  reflectionPrompts: string[];
}

export interface CrisisDetection {
  userId: string;
  crisisType: 'spiritual' | 'emotional' | 'theological' | 'relational' | 'mental-health';
  severity: 'concern' | 'urgent' | 'critical';
  indicators: string[];
  patterns: CrisisPattern[];
  immediateActions: string[];
  advisorsToAlert: string[];
  supportResources: Resource[];
  emergencyContacts?: EmergencyContact[];
  timestamp: Date;
}

export interface CrisisPattern {
  pattern: string;
  frequency: string;
  duration: string;
  escalation: boolean;
}

export interface EmergencyContact {
  type: 'counselor' | 'pastor' | 'crisis-line' | 'emergency-services';
  name: string;
  phone: string;
  available: string;
}

export interface SpiritualFormationRequest {
  userId: string;
  type: 'check-in' | 'prayer' | 'journal' | 'practice-recommendation' | 'crisis-check';
  data: any;
  context?: SpiritualContext;
}

export interface SpiritualContext {
  recentCheckIns?: SpiritualCheckIn[];
  prayerHistory?: PrayerRequest[];
  journalEntries?: JournalEntry[];
  profile?: SpiritualProfile;
  courseProgress?: any;
}

export interface SpiritualFormationResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence: number;
  humanReviewRequired: boolean;
  advisorAlertSent: boolean;
}
