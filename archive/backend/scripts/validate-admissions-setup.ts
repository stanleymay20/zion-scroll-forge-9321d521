#!/usr/bin/env ts-node

/**
 * ScrollUniversity Admissions System Validation Script
 * Validates the admissions system setup without requiring database connection
 */

import { existsSync } from 'fs';
import path from 'path';

function validateAdmissionsSetup() {
  console.log('🎓 Validating ScrollUniversity Admissions System Setup...');
  console.log('📖 "Many are called, but few are chosen" - Matthew 22:14\n');

  let allValid = true;
  const issues: string[] = [];

  // Check 1: Database Schema Files
  console.log('🗄️  Checking database schema files...');
  const schemaFiles = [
    'backend/prisma/schema.prisma',
    'backend/prisma/migrations/20250129000001_add_scroll_admissions_system/migration.sql'
  ];

  for (const file of schemaFiles) {
    if (existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      issues.push(`Missing schema file: ${file}`);
      allValid = false;
    }
  }

  // Check 2: Admissions Service Files
  console.log('\n🚀 Checking admissions service files...');
  const serviceFiles = [
    'backend/src/admissions-server.ts',
    'backend/src/middleware/admissions-auth.ts',
    'backend/src/config/redis.config.ts',
    'backend/Dockerfile.admissions'
  ];

  for (const file of serviceFiles) {
    if (existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      issues.push(`Missing service file: ${file}`);
      allValid = false;
    }
  }

  // Check 3: Seed Files
  console.log('\n🌱 Checking seed files...');
  const seedFiles = [
    'backend/prisma/seeds/admissions-system-seed.ts',
    'backend/scripts/setup-admissions-system.ts'
  ];

  for (const file of seedFiles) {
    if (existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      issues.push(`Missing seed file: ${file}`);
      allValid = false;
    }
  }

  // Check 4: Docker Configuration
  console.log('\n🐳 Checking Docker configuration...');
  const dockerFiles = [
    'docker-compose.yml'
  ];

  for (const file of dockerFiles) {
    if (existsSync(file)) {
      console.log(`   ✅ ${file}`);
      
      // Check if admissions service is configured
      try {
        const dockerContent = require('fs').readFileSync(file, 'utf8');
        if (dockerContent.includes('admissions-service')) {
          console.log(`   ✅ Admissions service configured in docker-compose.yml`);
        } else {
          console.log(`   ❌ Admissions service not found in docker-compose.yml`);
          issues.push('Admissions service not configured in Docker Compose');
          allValid = false;
        }
      } catch (error) {
        console.log(`   ⚠️  Could not validate Docker configuration: ${error}`);
      }
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      issues.push(`Missing Docker file: ${file}`);
      allValid = false;
    }
  }

  // Check 5: Package.json Scripts
  console.log('\n📦 Checking package.json scripts...');
  try {
    const packageJson = JSON.parse(require('fs').readFileSync('backend/package.json', 'utf8'));
    const requiredScripts = [
      'admissions:setup',
      'admissions:dev',
      'admissions:build',
      'admissions:start'
    ];

    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`   ✅ ${script}`);
      } else {
        console.log(`   ❌ ${script} - MISSING`);
        issues.push(`Missing npm script: ${script}`);
        allValid = false;
      }
    }
  } catch (error) {
    console.log(`   ❌ Could not read backend/package.json: ${error}`);
    issues.push('Could not validate package.json scripts');
    allValid = false;
  }

  // Check 6: TypeScript Compilation
  console.log('\n🔧 Checking TypeScript compilation...');
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit --project backend/tsconfig.json', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log('   ✅ TypeScript compilation successful');
  } catch (error) {
    console.log('   ⚠️  TypeScript compilation issues detected');
    console.log(`   Details: ${error.message}`);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (allValid) {
    console.log('🎉 VALIDATION SUCCESSFUL!');
    console.log('✅ All admissions system components are properly set up');
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Start Docker services: docker-compose up -d');
    console.log('   2. Run database migration: npm run migrate');
    console.log('   3. Seed admissions data: npm run seed');
    console.log('   4. Start admissions service: npm run admissions:dev');
  } else {
    console.log('❌ VALIDATION FAILED!');
    console.log(`Found ${issues.length} issues:`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('\n🔧 Please fix these issues before proceeding.');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return allValid;
}

// Run validation if this file is executed directly
if (require.main === module) {
  const isValid = validateAdmissionsSetup();
  process.exit(isValid ? 0 : 1);
}

export { validateAdmissionsSetup };