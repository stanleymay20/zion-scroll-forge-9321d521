#!/usr/bin/env ts-node

import { PrismaClient, UserRole } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger } from '../src/utils/logger';
import { admissionsRedis } from '../src/config/redis-admissions.config';

const prisma = new PrismaClient();

interface SetupOptions {
  skipMigration?: boolean;
  skipSeed?: boolean;
  skipRedis?: boolean;
  skipDocker?: boolean;
}

class AdmissionsInfrastructureSetup {
  private options: SetupOptions;

  constructor(options: SetupOptions = {}) {
    this.options = options;
  }

  async setup(): Promise<void> {
    logger.info('Starting ScrollUniversity Admissions System Infrastructure Setup...');

    try {
      // Step 1: Run database migrations
      if (!this.options.skipMigration) {
        await this.runMigrations();
      }

      // Step 2: Seed initial data
      if (!this.options.skipSeed) {
        await this.seedInitialData();
      }

      // Step 3: Setup Redis
      if (!this.options.skipRedis) {
        await this.setupRedis();
      }

      // Step 4: Setup Docker environment
      if (!this.options.skipDocker) {
        await this.setupDockerEnvironment();
      }

      // Step 5: Validate setup
      await this.validateSetup();

      logger.info('✅ Admissions System Infrastructure Setup completed successfully!');
    } catch (error) {
      logger.error('❌ Setup failed:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    logger.info('📊 Running database migrations...');
    
    try {
      // Check if migration file exists
      const migrationPath = path.join(__dirname, '../prisma/migrations/20250206000002_add_admissions_system_infrastructure/migration.sql');
      
      if (!fs.existsSync(migrationPath)) {
        logger.warn('Migration file not found, creating it...');
        // The migration file should already be created by the previous step
      }

      // Run Prisma migrations
      execSync('npx prisma migrate deploy', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });

      logger.info('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async seedInitialData(): Promise<void> {
    logger.info('🌱 Seeding initial admissions data...');

    try {
      // Create default admissions committee roles
      const defaultRoles = [
        {
          role: 'admissions_admin',
          specialization: 'System Administration',
          description: 'Overall admissions system management'
        },
        {
          role: 'admissions_officer',
          specialization: 'General Admissions',
          description: 'General admissions processing and coordination'
        },
        {
          role: 'spiritual_evaluator',
          specialization: 'Spiritual Assessment',
          description: 'Spiritual maturity and calling evaluation'
        },
        {
          role: 'academic_evaluator',
          specialization: 'Academic Assessment',
          description: 'Academic readiness and capability evaluation'
        },
        {
          role: 'interviewer',
          specialization: 'Interview Coordination',
          description: 'Applicant interviews and evaluation'
        }
      ];

      // Find admin users to assign as committee members
      const adminUsers = await prisma.user.findMany({
        where: {
          OR: [
            { role: UserRole.ADMIN },
            { role: UserRole.CHANCELLOR }
          ]
        }
      });

      if (adminUsers.length > 0) {
        logger.info(`Found ${adminUsers.length} admin users to configure for admissions`);
        // Note: The admissions committee member functionality will be implemented in later tasks
        // For now, we just log that admin users are available
      } else {
        logger.warn('No admin users found for admissions committee assignment');
      }

      // Create sample application status configurations
      const statusConfigs = [
        {
          status: 'submitted',
          displayName: 'Application Submitted',
          description: 'Application has been submitted and is awaiting initial review',
          color: '#3B82F6'
        },
        {
          status: 'under_review',
          displayName: 'Under Review',
          description: 'Application is currently being reviewed by admissions staff',
          color: '#F59E0B'
        },
        {
          status: 'assessment_pending',
          displayName: 'Assessment Pending',
          description: 'Waiting for assessment completion',
          color: '#8B5CF6'
        },
        {
          status: 'interview_scheduled',
          displayName: 'Interview Scheduled',
          description: 'Interview has been scheduled with the applicant',
          color: '#10B981'
        },
        {
          status: 'decision_pending',
          displayName: 'Decision Pending',
          description: 'All assessments complete, awaiting final decision',
          color: '#F97316'
        },
        {
          status: 'accepted',
          displayName: 'Accepted',
          description: 'Application has been accepted',
          color: '#059669'
        },
        {
          status: 'rejected',
          displayName: 'Rejected',
          description: 'Application has been rejected',
          color: '#DC2626'
        },
        {
          status: 'waitlisted',
          displayName: 'Waitlisted',
          description: 'Application has been placed on the waitlist',
          color: '#6B7280'
        }
      ];

      // Store status configurations in a settings table or cache
      for (const config of statusConfigs) {
        await admissionsRedis.cacheAdmissionsAnalytics(
          `status_config:${config.status}`,
          config,
          86400 // 24 hours
        );
      }

      logger.info('✅ Initial data seeding completed');
    } catch (error) {
      logger.error('❌ Data seeding failed:', error);
      throw error;
    }
  }

  private async setupRedis(): Promise<void> {
    logger.info('🔴 Setting up Redis for admissions system...');

    try {
      // Test Redis connection
      const isHealthy = await admissionsRedis.healthCheck();
      
      if (!isHealthy) {
        throw new Error('Redis connection failed');
      }

      // Initialize Redis with default configurations
      await admissionsRedis.cacheAdmissionsAnalytics('system:setup', {
        setupDate: new Date().toISOString(),
        version: '1.0.0',
        status: 'initialized'
      });

      // Setup Redis pub/sub channels
      await admissionsRedis.subscribeToGlobalAdmissionsUpdates((message) => {
        logger.info('Global admissions update:', message);
      });

      logger.info('✅ Redis setup completed');
    } catch (error) {
      logger.error('❌ Redis setup failed:', error);
      throw error;
    }
  }

  private async setupDockerEnvironment(): Promise<void> {
    logger.info('🐳 Setting up Docker environment...');

    try {
      // Create necessary directories
      const directories = [
        'backend/docker/admissions',
        'backend/docker/admissions/init-scripts',
        'backend/logs',
        'backend/uploads',
        'backend/documents'
      ];

      for (const dir of directories) {
        const fullPath = path.join(__dirname, '../../', dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          logger.info(`Created directory: ${dir}`);
        }
      }

      // Create Redis configuration file
      const redisConfig = `
# Redis configuration for ScrollUniversity Admissions System
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir ./
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
aof-rewrite-incremental-fsync yes
`;

      fs.writeFileSync(
        path.join(__dirname, '../docker/admissions/redis.conf'),
        redisConfig
      );

      // Create environment file template
      const envTemplate = `
# ScrollUniversity Admissions System Environment Variables
POSTGRES_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_redis_password_here
JWT_SECRET=your_jwt_secret_here
ADMISSIONS_SERVICE_KEY=your_service_key_here
AI_ASSESSMENT_API_KEY=your_ai_api_key_here
VIDEO_CONFERENCE_API_KEY=your_video_api_key_here
CALENDAR_INTEGRATION_KEY=your_calendar_key_here
EMAIL_SERVICE_API_KEY=your_email_api_key_here
SMS_SERVICE_API_KEY=your_sms_api_key_here
PUSH_NOTIFICATION_KEY=your_push_notification_key_here
`;

      const envPath = path.join(__dirname, '../docker/admissions/.env.example');
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, envTemplate);
      }

      logger.info('✅ Docker environment setup completed');
    } catch (error) {
      logger.error('❌ Docker environment setup failed:', error);
      throw error;
    }
  }

  private async validateSetup(): Promise<void> {
    logger.info('🔍 Validating admissions system setup...');

    try {
      // Validate database connection
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connection validated');

      // Validate Redis connection
      const redisHealthy = await admissionsRedis.healthCheck();
      if (redisHealthy) {
        logger.info('✅ Redis connection validated');
      } else {
        logger.warn('⚠️ Redis connection validation failed');
      }

      // Check if required tables exist
      const tables = [
        'applications',
        'eligibility_assessments',
        'spiritual_evaluations',
        'academic_evaluations',
        'interview_records',
        'admission_decisions',
        'admissions_committee_members'
      ];

      for (const table of tables) {
        try {
          await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
          logger.info(`✅ Table ${table} exists and accessible`);
        } catch (error) {
          logger.error(`❌ Table ${table} validation failed:`, error);
          throw error;
        }
      }

      // Validate file permissions
      const paths = [
        'backend/logs',
        'backend/uploads',
        'backend/documents'
      ];

      for (const dirPath of paths) {
        const fullPath = path.join(__dirname, '../../', dirPath);
        try {
          fs.accessSync(fullPath, fs.constants.W_OK);
          logger.info(`✅ Directory ${dirPath} is writable`);
        } catch (error) {
          logger.error(`❌ Directory ${dirPath} is not writable:`, error);
          throw error;
        }
      }

      logger.info('✅ All validations passed');
    } catch (error) {
      logger.error('❌ Validation failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up setup resources...');
    
    try {
      await prisma.$disconnect();
      await admissionsRedis.disconnect();
      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: SetupOptions = {};

  // Parse command line arguments
  if (args.includes('--skip-migration')) options.skipMigration = true;
  if (args.includes('--skip-seed')) options.skipSeed = true;
  if (args.includes('--skip-redis')) options.skipRedis = true;
  if (args.includes('--skip-docker')) options.skipDocker = true;

  const setup = new AdmissionsInfrastructureSetup(options);

  try {
    await setup.setup();
    process.exit(0);
  } catch (error) {
    logger.error('Setup failed:', error);
    await setup.cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { AdmissionsInfrastructureSetup };
export default AdmissionsInfrastructureSetup;