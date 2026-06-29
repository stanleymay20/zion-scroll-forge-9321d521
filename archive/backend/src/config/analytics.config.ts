/**
 * Analytics Configuration
 * "The wise store up knowledge" - Proverbs 10:14
 * 
 * Configuration for analytics dashboard, reports, and data aggregation
 */

export const analyticsConfig = {
  // Real-time metrics refresh interval (seconds)
  realTimeRefreshInterval: parseInt(process.env.ANALYTICS_REFRESH_INTERVAL || '30'),

  // Data aggregation settings
  aggregation: {
    enabled: process.env.ANALYTICS_AGGREGATION_ENABLED !== 'false',
    hourlyJobsEnabled: true,
    dailyJobsEnabled: true,
    weeklyJobsEnabled: true,
    monthlyJobsEnabled: true,
  },

  // Report generation settings
  reports: {
    outputDir: process.env.REPORTS_DIR || './reports',
    maxReportAge: 30, // days
    defaultFormat: 'PDF' as const,
    emailEnabled: process.env.REPORT_EMAIL_ENABLED === 'true',
    emailFrom: process.env.REPORT_EMAIL_FROM || 'reports@scrolluniversity.edu',
  },

  // Data export settings
  exports: {
    outputDir: process.env.EXPORTS_DIR || './exports',
    maxExportAge: 7, // days
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFormats: ['JSON', 'CSV', 'EXCEL'] as const,
  },

  // Predictive analytics settings
  predictions: {
    enabled: process.env.PREDICTIVE_ANALYTICS_ENABLED !== 'false',
    minDataPoints: 10, // Minimum data points required for predictions
    confidenceThreshold: 0.7, // Minimum confidence level
    cacheEnabled: true,
    cacheTTL: 3600, // seconds (1 hour)
  },

  // Dashboard settings
  dashboard: {
    maxWidgets: 20,
    defaultRefreshInterval: 60, // seconds
    maxCustomDashboards: 10,
  },

  // Performance settings
  performance: {
    maxConcurrentQueries: 5,
    queryTimeout: 30000, // milliseconds
    cacheEnabled: true,
    cacheTTL: 300, // seconds (5 minutes)
  },

  // Security settings
  security: {
    requireAuthentication: true,
    adminOnlyReports: ['financial_summary', 'system_health'],
    dataExportRoles: ['ADMIN', 'FACULTY'],
    sensitiveFields: ['password', 'ssn', 'creditCard'],
  },
};

export default analyticsConfig;
