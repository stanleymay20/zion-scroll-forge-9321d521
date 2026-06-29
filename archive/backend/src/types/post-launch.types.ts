/**
 * Post-Launch Monitoring and Optimization Types
 * Comprehensive types for monitoring, feedback, A/B testing, and continuous improvement
 */

// ============================================================================
// Monitoring Dashboard Types
// ============================================================================

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'log';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: WidgetConfig;
  dataSource: string;
}

export interface WidgetConfig {
  metricName?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
  timeRange?: TimeRange;
  filters?: Record<string, any>;
  thresholds?: Threshold[];
  refreshRate?: number;
}

export interface Threshold {
  level: 'info' | 'warning' | 'critical';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  color: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
}

export interface RealTimeMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

// ============================================================================
// User Feedback Types
// ============================================================================

export interface UserFeedback {
  id: string;
  userId: string;
  type: 'bug' | 'feature_request' | 'improvement' | 'praise' | 'complaint';
  category: FeedbackCategory;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  priority?: number;
  status: FeedbackStatus;
  attachments?: FeedbackAttachment[];
  metadata: FeedbackMetadata;
  votes: number;
  comments: FeedbackComment[];
  assignedTo?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackCategory =
  | 'authentication'
  | 'courses'
  | 'ai_tutor'
  | 'community'
  | 'payments'
  | 'spiritual_formation'
  | 'performance'
  | 'ui_ux'
  | 'mobile'
  | 'other';

export type FeedbackStatus =
  | 'submitted'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'duplicate';

export interface FeedbackAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'log';
  url: string;
  filename: string;
  size: number;
}

export interface FeedbackMetadata {
  userAgent: string;
  platform: string;
  screenResolution: string;
  url: string;
  sessionId: string;
  browserInfo: BrowserInfo;
  deviceInfo: DeviceInfo;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  osVersion: string;
}

export interface FeedbackComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface FeedbackSurvey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  targetAudience: SurveyAudience;
  schedule: SurveySchedule;
  active: boolean;
  responses: number;
  createdAt: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'checkbox' | 'nps';
  question: string;
  required: boolean;
  options?: string[];
  scale?: { min: number; max: number; labels?: string[] };
}

export interface SurveyAudience {
  userRoles?: string[];
  courseIds?: string[];
  enrollmentStatus?: string[];
  random?: boolean;
  percentage?: number;
}

export interface SurveySchedule {
  trigger: 'on_login' | 'after_course' | 'periodic' | 'manual';
  frequency?: 'daily' | 'weekly' | 'monthly';
  delay?: number; // milliseconds
}

// ============================================================================
// A/B Testing Types
// ============================================================================

export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  feature: string;
  variants: ABVariant[];
  targetAudience: TestAudience;
  metrics: TestMetric[];
  status: ABTestStatus;
  startDate: Date;
  endDate?: Date;
  results?: ABTestResults;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ABTestStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  trafficAllocation: number; // percentage 0-100
  config: Record<string, any>;
  isControl: boolean;
}

export interface TestAudience {
  userRoles?: string[];
  courseIds?: string[];
  geographies?: string[];
  platforms?: ('web' | 'mobile')[];
  percentage?: number;
  customRules?: AudienceRule[];
}

export interface AudienceRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface TestMetric {
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'custom';
  goal: 'increase' | 'decrease';
  primaryMetric: boolean;
  baseline?: number;
  target?: number;
}

export interface ABTestResults {
  totalParticipants: number;
  variantResults: VariantResults[];
  winner?: string;
  confidence: number; // 0-100
  statisticalSignificance: boolean;
  insights: string[];
  recommendation: 'deploy_winner' | 'continue_testing' | 'inconclusive';
}

export interface VariantResults {
  variantId: string;
  participants: number;
  metrics: Record<string, MetricResult>;
  conversionRate?: number;
  averageValue?: number;
}

export interface MetricResult {
  value: number;
  change: number; // percentage change from control
  pValue: number;
  confidenceInterval: [number, number];
}

export interface UserVariantAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: Date;
  exposedAt?: Date;
  converted?: boolean;
  conversionValue?: number;
}

// ============================================================================
// Performance Reporting Types
// ============================================================================

export interface PerformanceReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: { start: Date; end: Date };
  sections: ReportSection[];
  summary: ReportSummary;
  generatedAt: Date;
  generatedBy?: string;
}

export interface ReportSection {
  title: string;
  metrics: ReportMetric[];
  charts?: ChartData[];
  insights: string[];
  recommendations: string[];
}

export interface ReportMetric {
  name: string;
  value: number;
  unit: string;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  target?: number;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxis: string;
  yAxis: string;
}

export interface ReportSummary {
  highlights: string[];
  concerns: string[];
  actionItems: ActionItem[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  description: string;
  assignedTo?: string;
  dueDate?: Date;
}

export interface AutomatedReportSchedule {
  id: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'html' | 'json';
  active: boolean;
  lastRun?: Date;
  nextRun: Date;
}

// ============================================================================
// Bug Tracking Types
// ============================================================================

export interface Bug {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  category: string;
  affectedFeature: string;
  reproducible: boolean;
  stepsToReproduce?: string[];
  expectedBehavior: string;
  actualBehavior: string;
  environment: BugEnvironment;
  attachments?: FeedbackAttachment[];
  reportedBy: string;
  assignedTo?: string;
  relatedBugs?: string[];
  duplicateOf?: string;
  fixedInVersion?: string;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  verifiedAt?: Date;
}

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugPriority = 'p0' | 'p1' | 'p2' | 'p3' | 'p4';
export type BugStatus =
  | 'new'
  | 'confirmed'
  | 'in_progress'
  | 'fixed'
  | 'verified'
  | 'closed'
  | 'wont_fix'
  | 'duplicate';

export interface BugEnvironment {
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  appVersion: string;
  userAgent: string;
}

export interface BugPrioritizationCriteria {
  severity: number; // weight
  userImpact: number; // weight
  frequency: number; // weight
  businessImpact: number; // weight
}

export interface BugAnalytics {
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  averageResolutionTime: number; // hours
  bugsBySeverity: Record<BugSeverity, number>;
  bugsByCategory: Record<string, number>;
  topReporters: { userId: string; count: number }[];
  trendData: { date: Date; count: number }[];
}

// ============================================================================
// Feature Request Types
// ============================================================================

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  requestedBy: string;
  votes: number;
  voters: string[];
  priority: FeaturePriority;
  status: FeatureStatus;
  effort: FeatureEffort;
  impact: FeatureImpact;
  businessValue: number; // 0-100
  technicalComplexity: number; // 0-100
  dependencies?: string[];
  relatedFeatures?: string[];
  assignedTo?: string;
  targetRelease?: string;
  estimatedHours?: number;
  actualHours?: number;
  comments: FeedbackComment[];
  attachments?: FeedbackAttachment[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';
export type FeatureStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'planned'
  | 'in_development'
  | 'in_testing'
  | 'deployed'
  | 'rejected';
export type FeatureEffort = 'small' | 'medium' | 'large' | 'xlarge';
export type FeatureImpact = 'low' | 'medium' | 'high' | 'critical';

export interface FeatureRoadmap {
  id: string;
  name: string;
  description: string;
  quarters: RoadmapQuarter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoadmapQuarter {
  quarter: string; // e.g., "Q1 2024"
  themes: string[];
  features: FeatureRequest[];
  goals: string[];
}

export interface FeaturePrioritizationScore {
  featureId: string;
  score: number;
  breakdown: {
    votes: number;
    businessValue: number;
    impact: number;
    effort: number;
    strategicAlignment: number;
  };
}

// ============================================================================
// Continuous Improvement Types
// ============================================================================

export interface ImprovementInitiative {
  id: string;
  title: string;
  description: string;
  type: 'performance' | 'quality' | 'user_experience' | 'technical_debt' | 'security';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  owner: string;
  team: string[];
  goals: ImprovementGoal[];
  metrics: ImprovementMetric[];
  milestones: Milestone[];
  budget?: number;
  startDate: Date;
  targetDate: Date;
  completedDate?: Date;
  results?: ImprovementResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImprovementGoal {
  description: string;
  measurable: boolean;
  target: number;
  unit: string;
  achieved?: boolean;
}

export interface ImprovementMetric {
  name: string;
  baseline: number;
  current: number;
  target: number;
  unit: string;
  trend: 'improving' | 'declining' | 'stable';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedDate?: Date;
  deliverables: string[];
}

export interface ImprovementResults {
  goalsAchieved: number;
  totalGoals: number;
  metricsImproved: string[];
  lessonsLearned: string[];
  recommendations: string[];
  roi?: number;
}

export interface ContinuousImprovementCycle {
  id: string;
  phase: 'plan' | 'do' | 'check' | 'act';
  initiatives: ImprovementInitiative[];
  startDate: Date;
  endDate: Date;
  retrospective?: Retrospective;
}

export interface Retrospective {
  id: string;
  date: Date;
  participants: string[];
  wentWell: string[];
  needsImprovement: string[];
  actionItems: ActionItem[];
  insights: string[];
}

// ============================================================================
// Alert and Notification Types
// ============================================================================

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'business' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  notificationsSent: string[];
  createdAt: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  notificationChannels: string[];
  enabled: boolean;
  cooldownPeriod: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number; // seconds - how long condition must be true
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

// ============================================================================
// Service Request/Response Types
// ============================================================================

export interface CreateFeedbackRequest {
  type: UserFeedback['type'];
  category: FeedbackCategory;
  title: string;
  description: string;
  severity?: UserFeedback['severity'];
  attachments?: File[];
  metadata: FeedbackMetadata;
}

export interface CreateABTestRequest {
  name: string;
  description: string;
  hypothesis: string;
  feature: string;
  variants: Omit<ABVariant, 'id'>[];
  targetAudience: TestAudience;
  metrics: TestMetric[];
  startDate: Date;
  endDate?: Date;
}

export interface CreateBugRequest {
  title: string;
  description: string;
  severity: BugSeverity;
  category: string;
  affectedFeature: string;
  stepsToReproduce?: string[];
  expectedBehavior: string;
  actualBehavior: string;
  environment: BugEnvironment;
  attachments?: File[];
}

export interface CreateFeatureRequestRequest {
  title: string;
  description: string;
  category: string;
  businessValue?: number;
  attachments?: File[];
}

export interface GenerateReportRequest {
  type: PerformanceReport['type'];
  period: { start: Date; end: Date };
  sections?: string[];
  format?: 'pdf' | 'html' | 'json';
}
