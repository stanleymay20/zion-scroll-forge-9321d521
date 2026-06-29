/**
 * Analytics Types
 * Comprehensive analytics and reporting system types
 */

// ============================================================================
// Core Analytics Types
// ============================================================================

export interface AnalyticsMetric {
  name: string;
  value: number;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  unit: string;
  timestamp: Date;
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsQuery {
  timeRange: TimeRange;
  metrics?: string[];
  groupBy?: 'day' | 'week' | 'month' | 'year';
  filters?: Record<string, any>;
}

// ============================================================================
// Dashboard Configuration
// ============================================================================

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'list';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: WidgetConfig;
  refreshInterval?: number; // seconds
}

export interface WidgetConfig {
  metricName?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  dataSource: string;
  filters?: Record<string, any>;
  displayOptions?: Record<string, any>;
}

export interface DashboardConfiguration {
  id: string;
  userId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Real-time Metrics
// ============================================================================

export interface RealTimeMetrics {
  timestamp: Date;
  activeUsers: number;
  activeSessions: number;
  currentEnrollments: number;
  ongoingAssessments: number;
  systemLoad: {
    cpu: number;
    memory: number;
    database: number;
  };
  apiMetrics: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

// ============================================================================
// Student Analytics
// ============================================================================

export interface StudentAnalytics {
  studentId: string;
  enrollmentMetrics: {
    totalCourses: number;
    activeCourses: number;
    completedCourses: number;
    averageProgress: number;
  };
  performanceMetrics: {
    overallGPA: number;
    averageGrade: number;
    assignmentsCompleted: number;
    assignmentsOnTime: number;
    lateSubmissionRate: number;
  };
  engagementMetrics: {
    loginFrequency: number;
    averageSessionDuration: number;
    forumParticipation: number;
    videoWatchTime: number;
    lastActive: Date;
  };
  learningPatterns: {
    preferredStudyTime: string;
    averageStudyDuration: number;
    strongSubjects: string[];
    strugglingSubjects: string[];
    learningStyle: string;
  };
  predictions: {
    riskLevel: 'low' | 'medium' | 'high';
    completionProbability: number;
    recommendedInterventions: string[];
  };
}

// ============================================================================
// Course Analytics
// ============================================================================

export interface CourseAnalytics {
  courseId: string;
  enrollmentMetrics: {
    totalEnrollments: number;
    activeStudents: number;
    completionRate: number;
    dropoutRate: number;
    averageCompletionTime: number;
  };
  performanceMetrics: {
    averageGrade: number;
    passRate: number;
    averageAssignmentScore: number;
    averageQuizScore: number;
  };
  engagementMetrics: {
    averageVideoWatchTime: number;
    videoCompletionRate: number;
    forumActivity: number;
    resourceDownloads: number;
    averageTimeSpent: number;
  };
  contentMetrics: {
    mostViewedLectures: Array<{ lectureId: string; views: number }>;
    leastEngagingContent: Array<{ contentId: string; engagementScore: number }>;
    dropOffPoints: Array<{ moduleId: string; dropOffRate: number }>;
  };
  satisfactionMetrics: {
    averageRating: number;
    totalReviews: number;
    npsScore: number;
    studentFeedback: Array<{ rating: number; comment: string; date: Date }>;
  };
}

// ============================================================================
// Financial Analytics
// ============================================================================

export interface FinancialAnalytics {
  timeRange: TimeRange;
  revenueMetrics: {
    totalRevenue: number;
    revenueBySource: Record<string, number>;
    revenueGrowth: number;
    averageTransactionValue: number;
  };
  enrollmentRevenue: {
    courseEnrollments: number;
    subscriptionRevenue: number;
    oneTimePayments: number;
  };
  scrollCoinMetrics: {
    totalMinted: number;
    totalBurned: number;
    circulatingSupply: number;
    averageBalance: number;
    transactionVolume: number;
  };
  scholarshipMetrics: {
    totalAwarded: number;
    totalDisbursed: number;
    remainingBudget: number;
    utilizationRate: number;
  };
  projections: {
    nextMonthRevenue: number;
    nextQuarterRevenue: number;
    confidence: number;
  };
}

// ============================================================================
// Spiritual Formation Analytics
// ============================================================================

export interface SpiritualFormationAnalytics {
  timeRange: TimeRange;
  devotionMetrics: {
    totalCompletions: number;
    averageStreak: number;
    completionRate: number;
    mostPopularDevotions: Array<{ id: string; completions: number }>;
  };
  prayerMetrics: {
    totalPrayers: number;
    answeredPrayers: number;
    prayerPartners: number;
    averagePrayersPerUser: number;
  };
  scriptureMemoryMetrics: {
    totalVerses: number;
    averageMasteryLevel: number;
    completionRate: number;
    mostMemorizedVerses: Array<{ reference: string; count: number }>;
  };
  growthMetrics: {
    averageGrowthScore: number;
    usersShowingGrowth: number;
    commonGrowthAreas: string[];
    areasNeedingSupport: string[];
  };
}

// ============================================================================
// System Analytics
// ============================================================================

export interface SystemAnalytics {
  timeRange: TimeRange;
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: number;
    userRetentionRate: number;
  };
  contentMetrics: {
    totalCourses: number;
    totalLectures: number;
    totalAssignments: number;
    contentGrowthRate: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    apiCallVolume: number;
  };
  storageMetrics: {
    totalStorage: number;
    usedStorage: number;
    videoStorage: number;
    documentStorage: number;
  };
}

// ============================================================================
// Report Types
// ============================================================================

export type ReportType =
  | 'student_performance'
  | 'course_effectiveness'
  | 'financial_summary'
  | 'enrollment_trends'
  | 'engagement_analysis'
  | 'spiritual_growth'
  | 'system_health'
  | 'custom';

export type ReportFormat = 'PDF' | 'CSV' | 'EXCEL' | 'JSON';

export interface ReportConfiguration {
  type: ReportType;
  title: string;
  description?: string;
  timeRange: TimeRange;
  filters?: Record<string, any>;
  sections: ReportSection[];
  format: ReportFormat;
  schedule?: ReportSchedule;
}

export interface ReportSection {
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'text';
  data: any;
  config?: Record<string, any>;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  recipients: string[]; // email addresses
  enabled: boolean;
}

export interface GeneratedReport {
  id: string;
  configuration: ReportConfiguration;
  generatedAt: Date;
  fileUrl?: string;
  data: any;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

// ============================================================================
// Data Export
// ============================================================================

export interface DataExportRequest {
  dataType: 'students' | 'courses' | 'enrollments' | 'assignments' | 'payments' | 'analytics';
  format: ReportFormat;
  timeRange?: TimeRange;
  filters?: Record<string, any>;
  includeFields?: string[];
  excludeFields?: string[];
}

export interface DataExportResult {
  id: string;
  request: DataExportRequest;
  status: 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  recordCount?: number;
  createdAt: Date;
  expiresAt: Date;
  error?: string;
}

// ============================================================================
// Predictive Analytics
// ============================================================================

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'student_success' | 'course_completion' | 'revenue_forecast' | 'enrollment_prediction';
  version: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
}

export interface Prediction {
  modelId: string;
  targetId: string; // student ID, course ID, etc.
  prediction: any;
  confidence: number;
  factors: Array<{ factor: string; impact: number }>;
  recommendations: string[];
  timestamp: Date;
}

export interface StudentSuccessPrediction extends Prediction {
  prediction: {
    completionProbability: number;
    expectedGPA: number;
    riskLevel: 'low' | 'medium' | 'high';
    timeToCompletion: number; // days
  };
}

export interface RevenueForecast extends Prediction {
  prediction: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    breakdown: Record<string, number>;
  };
}

// ============================================================================
// Aggregation Jobs
// ============================================================================

export interface AggregationJob {
  id: string;
  name: string;
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataSource: string;
  aggregations: AggregationConfig[];
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'failed';
  enabled: boolean;
}

export interface AggregationConfig {
  metric: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string[];
  filters?: Record<string, any>;
}

export interface AggregationResult {
  jobId: string;
  timestamp: Date;
  results: Array<{
    metric: string;
    value: number;
    dimensions?: Record<string, any>;
  }>;
  duration: number; // milliseconds
  recordsProcessed: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface GetMetricsRequest {
  metrics: string[];
  timeRange: TimeRange;
  groupBy?: 'day' | 'week' | 'month';
  filters?: Record<string, any>;
}

export interface GetMetricsResponse {
  success: boolean;
  metrics: AnalyticsMetric[];
  error?: string;
}

export interface GetDashboardRequest {
  dashboardId?: string;
  userId: string;
}

export interface GetDashboardResponse {
  success: boolean;
  dashboard?: DashboardConfiguration;
  error?: string;
}

export interface CreateDashboardRequest {
  userId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface GenerateReportRequest {
  configuration: ReportConfiguration;
  userId: string;
}

export interface GenerateReportResponse {
  success: boolean;
  report?: GeneratedReport;
  error?: string;
}

export interface ExportDataRequest extends DataExportRequest {
  userId: string;
}

export interface ExportDataResponse {
  success: boolean;
  export?: DataExportResult;
  error?: string;
}

export interface GetPredictionRequest {
  modelType: PredictiveModel['type'];
  targetId: string;
}

export interface GetPredictionResponse {
  success: boolean;
  prediction?: Prediction;
  error?: string;
}

export interface ScheduleReportRequest {
  configuration: ReportConfiguration;
  userId: string;
}

export interface ScheduleReportResponse {
  success: boolean;
  scheduleId?: string;
  nextRun?: Date;
  error?: string;
}
