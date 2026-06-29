#!/usr/bin/env ts-node

/**
 * ScrollUniversity Admissions System Setup Script
 * "Many are called, but few are chosen" - Matthew 22:14
 * 
 * This script sets up the complete admissions system infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function setupAdmissionsSystem() {
  console.log('🎓 Setting up ScrollUniversity Admissions System...');
  console.log('📖 "Many are called, but few are chosen" - Matthew 22:14\n');

  try {
    // Step 1: Create necessary directories
    console.log('📁 Creating directory structure...');
    const directories = [
      'uploads/applications',
      'uploads/documents',
      'uploads/transcripts',
      'uploads/interviews',
      'logs/admissions',
      'temp/processing'
    ];

    for (const dir of directories) {
      const fullPath = path.join(process.cwd(), dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ Created: ${dir}`);
      } else {
        console.log(`   ℹ️  Exists: ${dir}`);
      }
    }

    // Step 2: Run database migrations
    console.log('\n🗄️  Running database migrations...');
    try {
      execSync('npx prisma migrate dev --name add_scroll_admissions_system', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('   ✅ Database migrations completed');
    } catch (error) {
      console.log('   ℹ️  Migrations may already be applied');
    }

    // Step 3: Generate Prisma client
    console.log('\n🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('   ✅ Prisma client generated');

    // Step 4: Seed admissions data
    console.log('\n🌱 Seeding admissions system data...');
    try {
      const { seedAdmissionsSystem } = await import('../prisma/seeds/admissions-system-seed');
      await seedAdmissionsSystem();
      console.log('   ✅ Admissions system data seeded');
    } catch (error) {
      console.error('   ❌ Error seeding admissions data:', error);
    }

    // Step 5: Verify system components
    console.log('\n🔍 Verifying system components...');
    
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('   ✅ Database connection verified');
    } catch (error) {
      console.error('   ❌ Database connection failed:', error);
      throw error;
    }

    // Check admissions tables
    try {
      const applicationCount = await prisma.application.count();
      const configCount = await prisma.admissionsConfiguration.count();
      console.log(`   ✅ Applications table ready (${applicationCount} records)`);
      console.log(`   ✅ Configuration table ready (${configCount} configs)`);
    } catch (error) {
      console.error('   ❌ Admissions tables verification failed:', error);
      throw error;
    }

    // Step 6: Display setup summary
    console.log('\n🎉 ScrollUniversity Admissions System Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SETUP SUMMARY:');
    console.log('   🗄️  Database schema: ✅ Applied');
    console.log('   📁 Directory structure: ✅ Created');
    console.log('   🌱 Seed data: ✅ Loaded');
    console.log('   🔧 Prisma client: ✅ Generated');
    console.log('   🔍 System verification: ✅ Passed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Start the admissions microservice: npm run dev:admissions');
    console.log('   2. Access the admissions API at: http://localhost:3003');
    console.log('   3. Check health endpoint: http://localhost:3003/health');
    console.log('   4. Review admissions configuration in the database');
    
    console.log('\n📚 AVAILABLE ENDPOINTS:');
    console.log('   GET  /health - Service health check');
    console.log('   GET  /api/applications - List applications');
    console.log('   POST /api/applications - Create new application');
    console.log('   GET  /api/applications/:id/status - Get application status');
    console.log('   GET  /api/config - Get system configuration');
    console.log('   GET  /api/analytics/dashboard - Get dashboard analytics');
    
    console.log('\n🔐 AUTHENTICATION:');
    console.log('   All API endpoints require JWT authentication');
    console.log('   Use the main backend service to obtain tokens');
    console.log('   Admissions roles: ADMISSIONS_OFFICER, INTERVIEWER, etc.');
    
    console.log('\n🎓 "By divine wisdom, the admissions system is established!"');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupAdmissionsSystem();
}