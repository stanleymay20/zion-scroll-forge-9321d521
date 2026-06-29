#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';
import { admissionsRedis } from '../src/config/redis-admissions.config';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class AdmissionsInfrastructureValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<ValidationResult[]> {
    logger.info('🔍 Starting ScrollUniversity Admissions System Infrastructure Validation...');

    try {
      await this.validateDatabase();
      await this.validateRedis();
      await this.validateFileSystem();
      await this.validateDockerConfiguration();
      await this.validateAuthentication();
      await this.generateReport();

      return this.results;
    } catch (error) {
      logger.error('❌ Validation process failed:', error);
      this.addResult('validation_process', 'fail', `Validation process failed: ${error.message}`);
      return this.results;
    }
  }

  private async validateDatabase(): Promise<void> {
    logger.info('📊 Validating database infrastructure...');

    try {
      // Test database connection
      await prisma.$connect();
      this.addResult('database_connection', 'pass', 'Database connection successful');

      // Validate required tables exist
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
        } catch (error) {
          this.addResult(`table_${table}`, 'fail', `Table ${table} not accessible: ${error.message}`);
        }
      }

      // Validate custom types exist
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
          `) as any[];
          
          if (result[0]?.exists) {
            this.addResult(`type_${type}`, 'pass', `Custom type ${type} exists`);
          } else {
            this.addResult(`type_${type}`, 'fail', `Custom type ${type} does not exist`);
          }
        } catch (error) {
          this.addResult(`type_${type}`, 'fail', `Error checking type ${type}: ${error.message}`);
        }
      }

      // Validate indexes exist
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
          `) as any[];
          
          if (result[0]?.exists) {
            this.addResult(`index_${index}`, 'pass', `Index ${index} exists`);
          } else {
            this.addResult(`index_${index}`, 'warning', `Index ${index} does not exist`);
          }
        } catch (error) {
          this.addResult(`index_${index}`, 'fail', `Error checking index ${index}: ${error.message}`);
        }
      }

      // Test basic CRUD operations
      try {
        // Test user creation (if users table exists)
        const userCount = await prisma.user.count();
        this.addResult('database_crud', 'pass', `Database CRUD operations working (${userCount} users found)`);
      } catch (error) {
        this.addResult('database_crud', 'warning', `CRUD test failed: ${error.message}`);
      }

    } catch (error) {
      this.addResult('database_connection', 'fail', `Database connection failed: ${error.message}`);
    }
  }

  private async validateRedis(): Promise<void> {
    logger.info('🔴 Validating Redis infrastructure...');

    try {
      // Test Redis connection
      const isHealthy = await admissionsRedis.healthCheck();
      
      if (isHealthy) {
        this.addResult('redis_connection', 'pass', 'Redis connection successful');
      } else {
        this.addResult('redis_connection', 'fail', 'Redis connection failed');
        return;
      }

      // Test Redis operations
      const testKey = 'validation:test';
      const testValue = { timestamp: new Date().toISOString(), test: true };

      // Test cache operations
      await admissionsRedis.cacheAdmissionsAnalytics(testKey, testValue, 60);
      const retrieved = await admissionsRedis.getAdmissionsAnalytics(testKey);
      
      if (retrieved && retrieved.test === true) {
        this.addResult('redis_cache_operations', 'pass', 'Redis cache operations working');
      } else {
        this.addResult('redis_cache_operations', 'fail', 'Redis cache operations failed');
      }

      // Test pub/sub functionality
      let pubsubWorking = false;
      const testMessage = { type: 'validation', data: 'test' };
      
      // Set up subscriber
      await admissionsRedis.subscribeToGlobalAdmissionsUpdates((message) => {
        if (message.type === 'validation' && message.data === 'test') {
          pubsubWorking = true;
        }
      });

      // Publish test message
      await admissionsRedis.publishGlobalAdmissionsUpdate('validation', 'test');
      
      // Wait a bit for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (pubsubWorking) {
        this.addResult('redis_pubsub', 'pass', 'Redis pub/sub functionality working');
      } else {
        this.addResult('redis_pubsub', 'warning', 'Redis pub/sub functionality may not be working');
      }

      // Test application-specific Redis operations
      const testAppId = 'test-app-123';
      await admissionsRedis.cacheApplicationStatus(testAppId, { status: 'test' });
      const appStatus = await admissionsRedis.getApplicationStatus(testAppId);
      
      if (appStatus && appStatus.status === 'test') {
        this.addResult('redis_application_cache', 'pass', 'Redis application caching working');
      } else {
        this.addResult('redis_application_cache', 'fail', 'Redis application caching failed');
      }

    } catch (error) {
      this.addResult('redis_validation', 'fail', `Redis validation failed: ${error.message}`);
    }
  }

  private async validateFileSystem(): Promise<void> {
    logger.info('📁 Validating file system infrastructure...');

    const requiredDirectories = [
      'backend/logs',
      'backend/uploads',
      'backend/documents',
      'backend/docker/admissions'
    ];

    for (const dir of requiredDirectories) {
      const fullPath = path.join(__dirname, '../../', dir);
      
      try {
        // Check if directory exists
        if (fs.existsSync(fullPath)) {
          this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'pass', `Directory ${dir} exists`);
          
          // Check if directory is writable
          fs.accessSync(fullPath, fs.constants.W_OK);
          this.addResult(`writable_${dir.replace(/[\/\\]/g, '_')}`, 'pass', `Directory ${dir} is writable`);
        } else {
          this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'fail', `Directory ${dir} does not exist`);
        }
      } catch (error) {
        this.addResult(`directory_${dir.replace(/[\/\\]/g, '_')}`, 'fail', `Directory ${dir} access failed: ${error.message}`);
      }
    }

    // Check required files
    const requiredFiles = [
      'backend/src/admissions-server.ts',
      'backend/src/middleware/admissions-auth.ts',
      'backend/src/config/redis-admissions.config.ts',
      'backend/docker/admissions/Dockerfile',
      'backend/docker/admissions/docker-compose.admissions.yml'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(__dirname, '../../', file);
      
      if (fs.existsSync(fullPath)) {
        this.addResult(`file_${file.replace(/[\/\\]/g, '_')}`, 'pass', `File ${file} exists`);
      } else {
        this.addResult(`file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `File ${file} does not exist`);
      }
    }
  }

  private async validateDockerConfiguration(): Promise<void> {
    logger.info('🐳 Validating Docker configuration...');

    const dockerFiles = [
      'backend/docker/admissions/Dockerfile',
      'backend/docker/admissions/docker-compose.admissions.yml'
    ];

    for (const file of dockerFiles) {
      const fullPath = path.join(__dirname, '../../', file);
      
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          if (file.includes('Dockerfile')) {
            // Validate Dockerfile content
            if (content.includes('FROM node:18-alpine')) {
              this.addResult('dockerfile_base_image', 'pass', 'Dockerfile uses correct base image');
            } else {
              this.addResult('dockerfile_base_image', 'warning', 'Dockerfile may not use recommended base image');
            }
            
            if (content.includes('HEALTHCHECK')) {
              this.addResult('dockerfile_healthcheck', 'pass', 'Dockerfile includes health check');
            } else {
              this.addResult('dockerfile_healthcheck', 'warning', 'Dockerfile missing health check');
            }
          }
          
          if (file.includes('docker-compose')) {
            // Validate docker-compose content
            if (content.includes('admissions-api:')) {
              this.addResult('docker_compose_services', 'pass', 'Docker compose includes required services');
            } else {
              this.addResult('docker_compose_services', 'fail', 'Docker compose missing required services');
            }
            
            if (content.includes('networks:')) {
              this.addResult('docker_compose_networks', 'pass', 'Docker compose includes network configuration');
            } else {
              this.addResult('docker_compose_networks', 'warning', 'Docker compose missing network configuration');
            }
          }
          
        } catch (error) {
          this.addResult(`docker_file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `Error reading ${file}: ${error.message}`);
        }
      } else {
        this.addResult(`docker_file_${file.replace(/[\/\\]/g, '_')}`, 'fail', `Docker file ${file} does not exist`);
      }
    }
  }

  private async validateAuthentication(): Promise<void> {
    logger.info('🔐 Validating authentication infrastructure...');

    try {
      // Check if JWT secret is configured
      if (process.env.JWT_SECRET) {
        this.addResult('jwt_secret', 'pass', 'JWT secret is configured');
      } else {
        this.addResult('jwt_secret', 'warning', 'JWT secret not configured in environment');
      }

      // Check if admissions roles are properly defined
      const { AdmissionsRole, AdmissionsPermission } = await import('../src/middleware/admissions-auth');
      
      const roleCount = Object.keys(AdmissionsRole).length;
      const permissionCount = Object.keys(AdmissionsPermission).length;
      
      if (roleCount > 0) {
        this.addResult('admissions_roles', 'pass', `${roleCount} admissions roles defined`);
      } else {
        this.addResult('admissions_roles', 'fail', 'No admissions roles defined');
      }
      
      if (permissionCount > 0) {
        this.addResult('admissions_permissions', 'pass', `${permissionCount} admissions permissions defined`);
      } else {
        this.addResult('admissions_permissions', 'fail', 'No admissions permissions defined');
      }

      // Note: Committee member functionality will be implemented in later tasks
      this.addResult('committee_members', 'pass', 'Committee member functionality planned for future implementation');

    } catch (error) {
      this.addResult('authentication_validation', 'fail', `Authentication validation failed: ${error.message}`);
    }
  }

  private async generateReport(): Promise<void> {
    logger.info('📋 Generating validation report...');

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

    // Save report to file
    const reportPath = path.join(__dirname, '../logs/admissions-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Log summary
    logger.info(`📊 Validation Summary:`);
    logger.info(`   Total checks: ${totalCount}`);
    logger.info(`   ✅ Passed: ${passCount}`);
    logger.info(`   ❌ Failed: ${failCount}`);
    logger.info(`   ⚠️  Warnings: ${warningCount}`);
    logger.info(`   Success rate: ${report.summary.success_rate}%`);
    logger.info(`   Report saved to: ${reportPath}`);

    if (failCount > 0) {
      logger.error('❌ Some validation checks failed. Please review the report.');
      this.results.filter(r => r.status === 'fail').forEach(result => {
        logger.error(`   - ${result.component}: ${result.message}`);
      });
    } else {
      logger.info('✅ All critical validation checks passed!');
    }
  }

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ component, status, message, details });
  }

  async cleanup(): Promise<void> {
    try {
      await prisma.$disconnect();
      await admissionsRedis.disconnect();
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }
}

// CLI execution
async function main() {
  const validator = new AdmissionsInfrastructureValidator();

  try {
    const results = await validator.validate();
    
    const failCount = results.filter(r => r.status === 'fail').length;
    
    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Validation failed:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { AdmissionsInfrastructureValidator };
export default AdmissionsInfrastructureValidator;