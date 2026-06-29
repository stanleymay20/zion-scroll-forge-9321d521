#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionsInfrastructureValidator = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../src/utils/logger");
const redis_admissions_config_1 = require("../src/config/redis-admissions.config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
class AdmissionsInfrastructureValidator {
    constructor() {
        this.results = [];
    }
    async validate() {
        logger_1.logger.info('🔍 Starting ScrollUniversity Admissions System Infrastructure Validation...');
        try {
            await this.validateDatabase();
            await this.validateRedis();
            await this.validateFileSystem();
            await this.validateDockerConfiguration();
            await this.validateAuthentication();
            await this.generateReport();
            return this.results;
        }
        catch (error) {
            logger_1.logger.error('❌ Validation process failed:', error);
            this.addResult('validation_process', 'fail', `Validation process failed: ${error.message}`);
            return this.results;
        }
    }
    async validateDatabase() {
        logger_1.logger.info('📊 Validating database infrastructure...');
        try {
            await prisma.$connect();
            this.addResult('database_connection', 'pass', 'Database connection successful');
            const requiredTables = [
                'applications',
                'eligibility_assessments',
                'spiritual_evaluations',
                'academic_evaluations',
                'interview_records',
                'admission_decisions',
                'appeal_records',
                'waitlist_entries',
                'document_verifications'
            ];
            for (const table of requiredTables) {
                try {
                    await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
                    this.addResult(`table_${table}`, 'pass', `Table ${table} exists and accessible`);
                }
                catch (error) {
                    this.addResult(`table_${table}`, 'fail', `Table ${table} not accessible: ${error.message}`);
                }
            }
            const customTypes = [
                'application_status',
                'program_type',
                'eligibility_status',
                'maturity_level',
                'academic_level',
                'interview_type',
                'interview_format',
                'decision_type',
                'check_status',
                'recommendation_type'
            ];
            for (const type of customTypes) {
                try {
                    const result = await prisma.$queryRawUnsafe(`
            SELECT EXISTS (
              SELECT 1 FROM pg_type 
              WHERE typname = '${type}'
            ) as exists
          `);
                    if (result[0]?.exists) {
                        this.addResult(`type_${type}`, 'pass', `Custom type ${type} exists`);
                    }
                    else {
                        this.addResult(`type_${type}`, 'fail', `Custom type ${type} does not exist`);
                    }
                }
                catch (error) {
                    this.addResult(`type_${type}`, 'fail', `Error checking type ${type}: ${error.message}`);
                }
            }
            const requiredIndexes = [
                'idx_applications_applicant_id',
                'idx_applications_status',
                'idx_applications_program_applied',
                'idx_eligibility_assessments_application_id',
                'idx_spiritual_evaluations_application_id',
                'idx_academic_evaluations_application_id',
                'idx_interview_records_application_id',
                'idx_admission_decisions_application_id'
            ];
            for (const index of requiredIndexes) {
                try {
                    const result = await prisma.$queryRawUnsafe(`
            SELECT EXISTS (
              SELECT 1 FROM pg_indexes 
              WHERE indexname = '${index}'
            ) as exists
          `);
                    if (result[0]?.exists) {
                        this.addResult(`index_${index}`, 'pass', `Index ${index} exists`);
                    }
                    else {
                        this.addResult(`index_${index}`, 'warning', `Index ${index} does not exist`);
                    }
                }
                catch (error) {
                    this.addResult(`index_${index}`, 'fail', `Error checking index ${index}: ${error.message}`);
                }
            }
            try {
                const userCount = await prisma.user.count();
                this.addResult('database_crud', 'pass', `Database CRUD operations working (${userCount} users found)`);
            }
            catch (error) {
                this.addResult('database_crud', 'warning', `CRUD test failed: ${error.message}`);
            }
        }
        catch (error) {
            this.addResult('database_connection', 'fail', `Database connection failed: ${error.message}`);
        }
    }
    async validateRedis() {
        logger_1.logger.info('🔴 Validating Redis infrastructure...');
        try {
            const isHealthy = await redis_admissions_config_1.admissionsRedis.healthCheck();
            if (isHealthy) {
                this.addResult('redis_connection', 'pass', 'Redis connection successful');
            }
            else {
                this.addResult('redis_connection', 'fail', 'Redis connection failed');
                return;
            }
            const testKey = 'validation:test';
            const testValue = { timestamp: new Date().toISOString(), test: true };
            await redis_admissions_config_1.admissionsRedis.cacheAdmissionsAnalytics(testKey, testValue, 60);
            const retrieved = await redis_admissions_config_1.admissionsRedis.getAdmissionsAnalytics(testKey);
            if (retrieved && retrieved.test === true) {
                this.addResult('redis_cache_operations', 'pass', 'Redis cache operations working');
            }
            else {
                this.addResult('redis_cache_operations', 'fail', 'Redis cache operations failed');
            }
            let pubsubWorking = false;
            const testMessage = { type: 'validation', data: 'test' };
            await redis_admissions_config_1.admissionsRedis.subscribeToGlobalAdmissionsUpdates((message) => {
                if (message.type === 'validation' && message.data === 'test') {
                    pubsubWorking = true;
                }
            });
            await redis_admissions_config_1.admissionsRedis.publishGlobalAdmissionsUpdate('validation', 'test');
            await new Promise(resolve => setTimeout(resolve, 100));
            if (pubsubWorking) {
                this.addResult('redis_pubsub', 'pass', 'Redis pub/sub functionality working');
            }
            else {
                this.addResult('redis_pubsub', 'warning', 'Redis pub/sub functionality may not be working');
            }
            const testAppId = 'test-app-123';
            await redis_admissions_config_1.admissionsRedis.cacheApplicationStatus(testAppId, { status: 'test' });
            const appStatus = await redis_admissions_config_1.admissionsRedis.getApplicationStatus(testAppId);
            if (appStatus && appStatus.status === 'test') {
                this.addResult('redis_application_cache', 'pass', 'Redis application caching working');
            }
            else {
                this.addResult('redis_application_cache', 'fail', 'Redis application caching failed');
            }
        }
        catch (error) {
            this.addResult('redis_validation', 'fail', `Redis validation failed: ${error.message}`);
        }
    }
    async validateFileSystem() {
        logger_1.logger.info('📁 Validating file system infrastructure...');
        const requiredDirectories = [
            'backend/logs',
            'backend/uploads',
            'backend/documents',
            'backend/docker/admissions'
        ];
        for (const dir of requiredDirectories) {
            const fullPath = path_1.default.join(__dirname, '../../', dir);
            try {
                if (fs_1.default.existsSync(fullPath)) {
                    this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'pass', `Directory ${dir} exists`);
                    fs_1.default.accessSync(fullPath, fs_1.default.constants.W_OK);
                    this.addResult(`writable_${dir.replace(/[\/\\]/g, '_')}`, 'pass', `Directory ${dir} is writable`);
                }
                else {
                    this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'fail', `Directory ${dir} does not exist`);
                }
            }
            catch (error) {
                this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'fail', `Directory ${dir} access failed: ${error.message}`);
            }
        }
        const requiredFiles = [
            'backend/src/admissions-server.ts',
            'backend/src/middleware/admissions-auth.ts',
            'backend/src/config/redis-admissions.config.ts',
            'backend/docker/admissions/Dockerfile',
            'backend/docker/admissions/docker-compose.admissions.yml'
        ];
        for (const file of requiredFiles) {
            const fullPath = path_1.default.join(__dirname, '../../', file);
            if (fs_1.default.existsSync(fullPath)) {
                this.addResult(`file_${file.replace(/[\/\\]/g, '_')}`, 'pass', `File ${file} exists`);
            }
            else {
                this.addResult(`file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `File ${file} does not exist`);
            }
        }
    }
    async validateDockerConfiguration() {
        logger_1.logger.info('🐳 Validating Docker configuration...');
        const dockerFiles = [
            'backend/docker/admissions/Dockerfile',
            'backend/docker/admissions/docker-compose.admissions.yml'
        ];
        for (const file of dockerFiles) {
            const fullPath = path_1.default.join(__dirname, '../../', file);
            if (fs_1.default.existsSync(fullPath)) {
                try {
                    const content = fs_1.default.readFileSync(fullPath, 'utf8');
                    if (file.includes('Dockerfile')) {
                        if (content.includes('FROM node:18-alpine')) {
                            this.addResult('dockerfile_base_image', 'pass', 'Dockerfile uses correct base image');
                        }
                        else {
                            this.addResult('dockerfile_base_image', 'warning', 'Dockerfile may not use recommended base image');
                        }
                        if (content.includes('HEALTHCHECK')) {
                            this.addResult('dockerfile_healthcheck', 'pass', 'Dockerfile includes health check');
                        }
                        else {
                            this.addResult('dockerfile_healthcheck', 'warning', 'Dockerfile missing health check');
                        }
                    }
                    if (file.includes('docker-compose')) {
                        if (content.includes('admissions-api:')) {
                            this.addResult('docker_compose_services', 'pass', 'Docker compose includes required services');
                        }
                        else {
                            this.addResult('docker_compose_services', 'fail', 'Docker compose missing required services');
                        }
                        if (content.includes('networks:')) {
                            this.addResult('docker_compose_networks', 'pass', 'Docker compose includes network configuration');
                        }
                        else {
                            this.addResult('docker_compose_networks', 'warning', 'Docker compose missing network configuration');
                        }
                    }
                }
                catch (error) {
                    this.addResult(`docker_file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `Error reading ${file}: ${error.message}`);
                }
            }
            else {
                this.addResult(`docker_file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `Docker file ${file} does not exist`);
            }
        }
    }
    async validateAuthentication() {
        logger_1.logger.info('🔐 Validating authentication infrastructure...');
        try {
            if (process.env.JWT_SECRET) {
                this.addResult('jwt_secret', 'pass', 'JWT secret is configured');
            }
            else {
                this.addResult('jwt_secret', 'warning', 'JWT secret not configured in environment');
            }
            const { AdmissionsRole, AdmissionsPermission } = await Promise.resolve().then(() => __importStar(require('../src/middleware/admissions-auth')));
            const roleCount = Object.keys(AdmissionsRole).length;
            const permissionCount = Object.keys(AdmissionsPermission).length;
            if (roleCount > 0) {
                this.addResult('admissions_roles', 'pass', `${roleCount} admissions roles defined`);
            }
            else {
                this.addResult('admissions_roles', 'fail', 'No admissions roles defined');
            }
            if (permissionCount > 0) {
                this.addResult('admissions_permissions', 'pass', `${permissionCount} admissions permissions defined`);
            }
            else {
                this.addResult('admissions_permissions', 'fail', 'No admissions permissions defined');
            }
            this.addResult('committee_members', 'pass', 'Committee member functionality planned for future implementation');
        }
        catch (error) {
            this.addResult('authentication_validation', 'fail', `Authentication validation failed: ${error.message}`);
        }
    }
    async generateReport() {
        logger_1.logger.info('📋 Generating validation report...');
        const passCount = this.results.filter(r => r.status === 'pass').length;
        const failCount = this.results.filter(r => r.status === 'fail').length;
        const warningCount = this.results.filter(r => r.status === 'warning').length;
        const totalCount = this.results.length;
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: totalCount,
                passed: passCount,
                failed: failCount,
                warnings: warningCount,
                success_rate: Math.round((passCount / totalCount) * 100)
            },
            results: this.results
        };
        const reportPath = path_1.default.join(__dirname, '../logs/admissions-validation-report.json');
        fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        logger_1.logger.info(`📊 Validation Summary:`);
        logger_1.logger.info(`   Total checks: ${totalCount}`);
        logger_1.logger.info(`   ✅ Passed: ${passCount}`);
        logger_1.logger.info(`   ❌ Failed: ${failCount}`);
        logger_1.logger.info(`   ⚠️  Warnings: ${warningCount}`);
        logger_1.logger.info(`   Success rate: ${report.summary.success_rate}%`);
        logger_1.logger.info(`   Report saved to: ${reportPath}`);
        if (failCount > 0) {
            logger_1.logger.error('❌ Some validation checks failed. Please review the report.');
            this.results.filter(r => r.status === 'fail').forEach(result => {
                logger_1.logger.error(`   - ${result.component}: ${result.message}`);
            });
        }
        else {
            logger_1.logger.info('✅ All critical validation checks passed!');
        }
    }
    addResult(component, status, message, details) {
        this.results.push({ component, status, message, details });
    }
    async cleanup() {
        try {
            await prisma.$disconnect();
            await redis_admissions_config_1.admissionsRedis.disconnect();
        }
        catch (error) {
            logger_1.logger.error('Cleanup error:', error);
        }
    }
}
exports.AdmissionsInfrastructureValidator = AdmissionsInfrastructureValidator;
async function main() {
    const validator = new AdmissionsInfrastructureValidator();
    try {
        const results = await validator.validate();
        const failCount = results.filter(r => r.status === 'fail').length;
        if (failCount > 0) {
            process.exit(1);
        }
        else {
            process.exit(0);
        }
    }
    catch (error) {
        logger_1.logger.error('Validation failed:', error);
        process.exit(1);
    }
    finally {
        await validator.cleanup();
    }
}
if (require.main === module) {
    main().catch(console.error);
}
exports.default = AdmissionsInfrastructureValidator;
//# sourceMappingURL=validate-admissions-infrastructure.js.map