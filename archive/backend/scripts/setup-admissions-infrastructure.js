#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionsInfrastructureSetup = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../src/utils/logger");
const redis_admissions_config_1 = require("../src/config/redis-admissions.config");
const prisma = new client_1.PrismaClient();
class AdmissionsInfrastructureSetup {
    constructor(options = {}) {
        this.options = options;
    }
    async setup() {
        logger_1.logger.info('Starting ScrollUniversity Admissions System Infrastructure Setup...');
        try {
            if (!this.options.skipMigration) {
                await this.runMigrations();
            }
            if (!this.options.skipSeed) {
                await this.seedInitialData();
            }
            if (!this.options.skipRedis) {
                await this.setupRedis();
            }
            if (!this.options.skipDocker) {
                await this.setupDockerEnvironment();
            }
            await this.validateSetup();
            logger_1.logger.info('✅ Admissions System Infrastructure Setup completed successfully!');
        }
        catch (error) {
            logger_1.logger.error('❌ Setup failed:', error);
            throw error;
        }
    }
    async runMigrations() {
        logger_1.logger.info('📊 Running database migrations...');
        try {
            const migrationPath = path_1.default.join(__dirname, '../prisma/migrations/20250206000002_add_admissions_system_infrastructure/migration.sql');
            if (!fs_1.default.existsSync(migrationPath)) {
                logger_1.logger.warn('Migration file not found, creating it...');
            }
            (0, child_process_1.execSync)('npx prisma migrate deploy', {
                cwd: path_1.default.join(__dirname, '..'),
                stdio: 'inherit'
            });
            logger_1.logger.info('✅ Database migrations completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Migration failed:', error);
            throw error;
        }
    }
    async seedInitialData() {
        logger_1.logger.info('🌱 Seeding initial admissions data...');
        try {
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
            const adminUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { role: client_1.UserRole.ADMIN },
                        { role: client_1.UserRole.CHANCELLOR }
                    ]
                }
            });
            if (adminUsers.length > 0) {
                logger_1.logger.info(`Found ${adminUsers.length} admin users to configure for admissions`);
            }
            else {
                logger_1.logger.warn('No admin users found for admissions committee assignment');
            }
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
            for (const config of statusConfigs) {
                await redis_admissions_config_1.admissionsRedis.cacheAdmissionsAnalytics(`status_config:${config.status}`, config, 86400);
            }
            logger_1.logger.info('✅ Initial data seeding completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Data seeding failed:', error);
            throw error;
        }
    }
    async setupRedis() {
        logger_1.logger.info('🔴 Setting up Redis for admissions system...');
        try {
            const isHealthy = await redis_admissions_config_1.admissionsRedis.healthCheck();
            if (!isHealthy) {
                throw new Error('Redis connection failed');
            }
            await redis_admissions_config_1.admissionsRedis.cacheAdmissionsAnalytics('system:setup', {
                setupDate: new Date().toISOString(),
                version: '1.0.0',
                status: 'initialized'
            });
            await redis_admissions_config_1.admissionsRedis.subscribeToGlobalAdmissionsUpdates((message) => {
                logger_1.logger.info('Global admissions update:', message);
            });
            logger_1.logger.info('✅ Redis setup completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Redis setup failed:', error);
            throw error;
        }
    }
    async setupDockerEnvironment() {
        logger_1.logger.info('🐳 Setting up Docker environment...');
        try {
            const directories = [
                'backend/docker/admissions',
                'backend/docker/admissions/init-scripts',
                'backend/logs',
                'backend/uploads',
                'backend/documents'
            ];
            for (const dir of directories) {
                const fullPath = path_1.default.join(__dirname, '../../', dir);
                if (!fs_1.default.existsSync(fullPath)) {
                    fs_1.default.mkdirSync(fullPath, { recursive: true });
                    logger_1.logger.info(`Created directory: ${dir}`);
                }
            }
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
            fs_1.default.writeFileSync(path_1.default.join(__dirname, '../docker/admissions/redis.conf'), redisConfig);
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
            const envPath = path_1.default.join(__dirname, '../docker/admissions/.env.example');
            if (!fs_1.default.existsSync(envPath)) {
                fs_1.default.writeFileSync(envPath, envTemplate);
            }
            logger_1.logger.info('✅ Docker environment setup completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Docker environment setup failed:', error);
            throw error;
        }
    }
    async validateSetup() {
        logger_1.logger.info('🔍 Validating admissions system setup...');
        try {
            await prisma.$queryRaw `SELECT 1`;
            logger_1.logger.info('✅ Database connection validated');
            const redisHealthy = await redis_admissions_config_1.admissionsRedis.healthCheck();
            if (redisHealthy) {
                logger_1.logger.info('✅ Redis connection validated');
            }
            else {
                logger_1.logger.warn('⚠️ Redis connection validation failed');
            }
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
                    logger_1.logger.info(`✅ Table ${table} exists and accessible`);
                }
                catch (error) {
                    logger_1.logger.error(`❌ Table ${table} validation failed:`, error);
                    throw error;
                }
            }
            const paths = [
                'backend/logs',
                'backend/uploads',
                'backend/documents'
            ];
            for (const dirPath of paths) {
                const fullPath = path_1.default.join(__dirname, '../../', dirPath);
                try {
                    fs_1.default.accessSync(fullPath, fs_1.default.constants.W_OK);
                    logger_1.logger.info(`✅ Directory ${dirPath} is writable`);
                }
                catch (error) {
                    logger_1.logger.error(`❌ Directory ${dirPath} is not writable:`, error);
                    throw error;
                }
            }
            logger_1.logger.info('✅ All validations passed');
        }
        catch (error) {
            logger_1.logger.error('❌ Validation failed:', error);
            throw error;
        }
    }
    async cleanup() {
        logger_1.logger.info('🧹 Cleaning up setup resources...');
        try {
            await prisma.$disconnect();
            await redis_admissions_config_1.admissionsRedis.disconnect();
            logger_1.logger.info('✅ Cleanup completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Cleanup failed:', error);
        }
    }
}
exports.AdmissionsInfrastructureSetup = AdmissionsInfrastructureSetup;
async function main() {
    const args = process.argv.slice(2);
    const options = {};
    if (args.includes('--skip-migration'))
        options.skipMigration = true;
    if (args.includes('--skip-seed'))
        options.skipSeed = true;
    if (args.includes('--skip-redis'))
        options.skipRedis = true;
    if (args.includes('--skip-docker'))
        options.skipDocker = true;
    const setup = new AdmissionsInfrastructureSetup(options);
    try {
        await setup.setup();
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Setup failed:', error);
        await setup.cleanup();
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
exports.default = AdmissionsInfrastructureSetup;
//# sourceMappingURL=setup-admissions-infrastructure.js.map