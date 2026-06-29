/**
 * ScrollUniversity Production Server
 * "In the beginning was the Word" - John 1:1
 * Production-ready server with comprehensive security, monitoring, and error handling
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import cluster from 'cluster';
import os from 'os';
import gracefulShutdown from 'http-graceful-shutdown';

// Production middleware
import {
  securityHeaders,
  corsConfig,
  compressionConfig,
  generalRateLimit,
  authRateLimit,
  admissionsRateLimit,
  requestLogger,
  productionErrorHandler,
  sanitizeInput
} from './middleware/productionSecurity';

import { logger } from './utils/productionLogger';
import { cacheService } from './services/CacheService';
import { healthCheckService } from './services/HealthCheckService';
import { monitoringService } from './services/MonitoringService';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import scrollcoinRoutes from './routes/scrollcoin';
import tuitionRoutes from './routes/tuition';
import researchRoutes from './routes/research';
import aiRoutes from './routes/ai';
import aiUnifiedRoutes from './routes/ai-unified';
import aiTutorRoutes from './routes/ai-tutor';
import analyticsRoutes from './routes/analytics';
import securityRoutes from './routes/security';
import communityRoutes from './routes/community';
import assessmentRoutes from './routes/assessment';
import xrRoutes from './routes/xr';
import multilingualRoutes from './routes/multilingual';
import scrollbadgesRoutes from './routes/scrollbadges';
import spiritualFormationRoutes from './routes/spiritual-formation';
import partnerIntegrationRoutes from './routes/partner-integration';
import criticalThinkingRoutes from './routes/critical-thinking';
import launchRoutes from './routes/launch';
import curriculumGridRoutes from './routes/curriculum-grid';
import architectureComparisonRoutes from './routes/architecture-comparison';
import contentCreationRoutes from './routes/content-creation';
import courseRecommendationRoutes from './routes/course-recommendation';
import facultySupportRoutes from './routes/faculty-support';
import translationRoutes from './routes/translation';
import fundraisingRoutes from './routes/fundraising';
import careerServicesRoutes from './routes/career-services';
import moderationRoutes from './routes/moderation';
import accessibilityRoutes from './routes/accessibility';
import aiMonitoringRoutes from './routes/ai-monitoring';
import videoStreamingRoutes from './routes/video-streaming';
import assignmentsRoutes from './routes/assignments';
import chatRoutes from './routes/chat';
import studyGroupsRoutes from './routes/study-groups';
import paymentsRoutes from './routes/payments';
import scholarshipsRoutes from './routes/scholarships';
import devotionsRoutes from './routes/devotions';
import prayerRoutes from './routes/prayer';
import scriptureMemoryRoutes from './routes/scripture-memory';
import enrollmentRoutes from './routes/enrollment';
import profileRoutes from './routes/profile';
import performanceRoutes from './routes/performance';
import productionLaunchRoutes from './routes/production-launch';
import postLaunchRoutes from './routes/post-launch';

// Socket.io service
import SocketService from './services/SocketService';

// Admissions routes
import admissionsRoutes from './routes/admissions';
import admissionsApplicationsRoutes from './routes/admissions/applications';
import admissionsAnalyticsRoutes from './routes/admissions/analytics';
import admissionsPredictiveAnalyticsRoutes from './routes/admissions/predictive-analytics';
import admissionsStudentIntegrationRoutes from './routes/admissions/student-integration';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3001');
const CLUSTER_WORKERS = parseInt(process.env.CLUSTER_WORKERS || os.cpus().length.toString());

// Enable clustering in production
if (isProduction && cluster.isPrimary && process.env.DISABLE_CLUSTERING !== 'true') {
  logger.info(`Starting ${CLUSTER_WORKERS} workers`);
  
  // Fork workers
  for (let i = 0; i < CLUSTER_WORKERS; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });
  
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });
} else {
  startServer();
}

async function startServer() {
  const app = express();
  const prisma = new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty'
  });

  // Trust proxy in production (for load balancers)
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // Security middleware (must be first)
  app.use(securityHeaders);
  app.use(corsConfig);
  app.use(compressionConfig);
  app.use(requestLogger);
  app.use(sanitizeInput);

  // Body parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook verification
      (req as any).rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use('/api/auth', authRateLimit);
  app.use('/api/admissions', admissionsRateLimit);
  app.use('/api', generalRateLimit);

  // Health check endpoint (no auth required)
  app.get('/health', async (req, res) => {
    try {
      const health = await healthCheckService.performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check endpoint failed', { error: error.message });
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint (for monitoring systems)
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = monitoringService.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics endpoint failed', { error: error.message });
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  });

  // API routes with monitoring
  const routeWithMonitoring = (path: string, router: any) => {
    app.use(path, (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const success = res.statusCode < 400;
        
        monitoringService.recordMetric({
          name: 'http.requests',
          value: 1,
          unit: 'count',
          tags: { 
            method: req.method,
            path: path,
            status: res.statusCode.toString(),
            success: success.toString()
          }
        });
        
        monitoringService.recordMetric({
          name: 'http.response_time',
          value: duration,
          unit: 'ms',
          tags: { 
            method: req.method,
            path: path
          }
        });
        
        if (!success) {
          monitoringService.recordMetric({
            name: 'http.errors',
            value: 1,
            unit: 'count',
            tags: { 
              method: req.method,
              path: path,
              status: res.statusCode.toString()
            }
          });
        }
      });
      
      next();
    }, router);
  };

  // Core API routes
  routeWithMonitoring('/api/auth', authRoutes);
  routeWithMonitoring('/api/users', userRoutes);
  routeWithMonitoring('/api/courses', courseRoutes);
  routeWithMonitoring('/api/scrollcoin', scrollcoinRoutes);
  routeWithMonitoring('/api/tuition', tuitionRoutes);
  routeWithMonitoring('/api/research', researchRoutes);
  routeWithMonitoring('/api/ai', aiRoutes);
  routeWithMonitoring('/api/ai-unified', aiUnifiedRoutes);
  routeWithMonitoring('/api/ai-tutor', aiTutorRoutes);
  routeWithMonitoring('/api/analytics', analyticsRoutes);
  routeWithMonitoring('/api/security', securityRoutes);
  routeWithMonitoring('/api/community', communityRoutes);
  routeWithMonitoring('/api/assessment', assessmentRoutes);
  routeWithMonitoring('/api/xr', xrRoutes);
  routeWithMonitoring('/api/multilingual', multilingualRoutes);
  routeWithMonitoring('/api/scrollbadges', scrollbadgesRoutes);
  routeWithMonitoring('/api/spiritual-formation', spiritualFormationRoutes);
  routeWithMonitoring('/api/partner-integration', partnerIntegrationRoutes);
  routeWithMonitoring('/api/critical-thinking', criticalThinkingRoutes);
  routeWithMonitoring('/api/launch', launchRoutes);
  routeWithMonitoring('/api/curriculum-grid', curriculumGridRoutes);
  routeWithMonitoring('/api/architecture-comparison', architectureComparisonRoutes);
  routeWithMonitoring('/api/content-creation', contentCreationRoutes);
  routeWithMonitoring('/api/course-recommendation', courseRecommendationRoutes);
  routeWithMonitoring('/api/faculty-support', facultySupportRoutes);
  routeWithMonitoring('/api/translation', translationRoutes);
  routeWithMonitoring('/api/fundraising', fundraisingRoutes);
  routeWithMonitoring('/api/career-services', careerServicesRoutes);
  routeWithMonitoring('/api/profile', profileRoutes);
  routeWithMonitoring('/api/moderation', moderationRoutes);
  routeWithMonitoring('/api/accessibility', accessibilityRoutes);
  routeWithMonitoring('/api/admissions', admissionsRoutes);
  routeWithMonitoring('/api/ai-monitoring', aiMonitoringRoutes);
  routeWithMonitoring('/api/video-streaming', videoStreamingRoutes);
  routeWithMonitoring('/api/assignments', assignmentsRoutes);
  routeWithMonitoring('/api/chat', chatRoutes);
  routeWithMonitoring('/api/study-groups', studyGroupsRoutes);
  routeWithMonitoring('/api/payments', paymentsRoutes);
  routeWithMonitoring('/api/scholarships', scholarshipsRoutes);
  routeWithMonitoring('/api/devotions', devotionsRoutes);
  routeWithMonitoring('/api/prayer', prayerRoutes);
  routeWithMonitoring('/api/scripture-memory', scriptureMemoryRoutes);
  routeWithMonitoring('/api/enrollment', enrollmentRoutes);
  routeWithMonitoring('/api/performance', performanceRoutes);
  routeWithMonitoring('/api/production-launch', productionLaunchRoutes);
  routeWithMonitoring('/api/post-launch', postLaunchRoutes);

  // Admissions API routes
  routeWithMonitoring('/api/admissions/applications', admissionsApplicationsRoutes);
  routeWithMonitoring('/api/admissions/analytics', admissionsAnalyticsRoutes);
  routeWithMonitoring('/api/admissions/predictive-analytics', admissionsPredictiveAnalyticsRoutes);
  routeWithMonitoring('/api/admissions/student-integration', admissionsStudentIntegrationRoutes);

  // API documentation endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'ScrollUniversity API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Scroll-aligned education platform API',
      documentation: '/api/docs',
      health: '/health',
      metrics: '/metrics',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        courses: '/api/courses',
        admissions: '/api/admissions',
        scrollcoin: '/api/scrollcoin',
        analytics: '/api/analytics'
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    logger.warn('404 Not Found', { 
      url: req.originalUrl, 
      method: req.method,
      ip: req.ip 
    });
    
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl
    });
  });

  // Global error handler (must be last)
  app.use(productionErrorHandler);

  // Database connection test
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    process.exit(1);
  }

  // Cache connection test
  try {
    const cacheHealthy = await cacheService.healthCheck();
    if (cacheHealthy) {
      logger.info('Cache connected successfully');
    } else {
      logger.warn('Cache connection failed, continuing without cache');
    }
  } catch (error) {
    logger.warn('Cache initialization failed', { error: error.message });
  }

  // Start server
  const server = app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`ScrollUniversity server started`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    });
    
    // Initialize Socket.io for real-time chat
    try {
      await SocketService.initialize(server);
      logger.info('Socket.io initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Socket.io', { error: error.message });
    }
    
    // Record server start metric
    monitoringService.recordEvent('server.started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid
    });
  });

  // Graceful shutdown
  gracefulShutdown(server, {
    signals: 'SIGINT SIGTERM',
    timeout: 30000, // 30 seconds
    development: !isProduction,
    onShutdown: async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        // Close database connections
        await prisma.$disconnect();
        logger.info('Database disconnected');
        
        // Close cache connections
        await cacheService.close();
        logger.info('Cache disconnected');
        
        // Close health check service
        await healthCheckService.close();
        logger.info('Health check service closed');
        
        // Shutdown Socket.io
        await SocketService.shutdown();
        logger.info('Socket.io shutdown');
        
        // Shutdown monitoring
        monitoringService.shutdown();
        logger.info('Monitoring service shutdown');
        
        // Record shutdown event
        monitoringService.recordEvent('server.shutdown', { signal });
        
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
      }
    },
    finally: () => {
      logger.info('Server shutdown complete');
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { 
      error: error.message, 
      stack: error.stack 
    });
    
    monitoringService.recordError(error, { type: 'uncaughtException' });
    
    // Give time for logging then exit
    setTimeout(() => process.exit(1), 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { 
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    });
    
    if (reason instanceof Error) {
      monitoringService.recordError(reason, { type: 'unhandledRejection' });
    }
  });

  return app;
}

export default startServer;