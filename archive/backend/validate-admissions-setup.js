#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating ScrollUniversity Admissions System Setup...\n');

let passCount = 0;
let failCount = 0;
let warningCount = 0;

function checkResult(component, status, message) {
  const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${statusIcon} ${component}: ${message}`);
  
  if (status === 'pass') passCount++;
  else if (status === 'fail') failCount++;
  else warningCount++;
}

// Check Prisma schema
console.log('📊 Validating Prisma schema...');
const schemaPath = path.join(__dirname, 'prisma/schema.prisma');

if (fs.existsSync(schemaPath)) {
  checkResult('prisma_schema', 'pass', 'Prisma schema file exists');
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Check for required admissions models
  const requiredModels = [
    'Application',
    'EligibilityAssessment', 
    'SpiritualEvaluation',
    'AcademicEvaluation',
    'InterviewRecord',
    'AdmissionDecision'
  ];
  
  requiredModels.forEach(model => {
    if (schemaContent.includes(`model ${model}`)) {
      checkResult(`model_${model}`, 'pass', `Model ${model} found in schema`);
    } else {
      checkResult(`model_${model}`, 'fail', `Model ${model} not found in schema`);
    }
  });
  
  // Check for required enums
  const requiredEnums = [
    'ApplicationStatus',
    'ProgramType', 
    'AdmissionDecisionType',
    'EligibilityStatus'
  ];
  
  requiredEnums.forEach(enumType => {
    if (schemaContent.includes(`enum ${enumType}`)) {
      checkResult(`enum_${enumType}`, 'pass', `Enum ${enumType} found in schema`);
    } else {
      checkResult(`enum_${enumType}`, 'fail', `Enum ${enumType} not found in schema`);
    }
  });
  
} else {
  checkResult('prisma_schema', 'fail', 'Prisma schema file not found');
}

// Check infrastructure files
console.log('\n🏗️ Validating infrastructure files...');
const requiredFiles = [
  {
    path: 'src/admissions-server.ts',
    name: 'Admissions Server'
  },
  {
    path: 'src/middleware/admissions-auth.ts', 
    name: 'Admissions Authentication'
  },
  {
    path: 'src/config/redis-admissions.config.ts',
    name: 'Redis Configuration'
  },
  {
    path: 'docker/admissions/Dockerfile',
    name: 'Admissions Dockerfile'
  },
  {
    path: 'docker/admissions/docker-compose.admissions.yml',
    name: 'Docker Compose Configuration'
  }
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  
  if (fs.existsSync(fullPath)) {
    checkResult(`file_${file.name.replace(/\s+/g, '_').toLowerCase()}`, 'pass', `${file.name} file exists`);
  } else {
    checkResult(`file_${file.name.replace(/\s+/g, '_').toLowerCase()}`, 'fail', `${file.name} file not found`);
  }
});

// Check package.json
console.log('\n📦 Validating package.json...');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredScripts = [
    'admissions:infrastructure',
    'admissions:validate',
    'admissions:dev',
    'admissions:start'
  ];
  
  let scriptsFound = 0;
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      scriptsFound++;
    }
  });
  
  if (scriptsFound === requiredScripts.length) {
    checkResult('package_scripts', 'pass', 'All required npm scripts found');
  } else {
    checkResult('package_scripts', 'warning', `${scriptsFound}/${requiredScripts.length} required scripts found`);
  }
  
  // Check dependencies
  const requiredDeps = ['ioredis', 'compression'];
  let depsFound = 0;
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      depsFound++;
    }
  });
  
  if (depsFound === requiredDeps.length) {
    checkResult('package_dependencies', 'pass', 'All required dependencies found');
  } else {
    checkResult('package_dependencies', 'warning', `${depsFound}/${requiredDeps.length} required dependencies found`);
  }
}

// Check migration files
console.log('\n📁 Validating migration files...');
const migrationDir = path.join(__dirname, 'prisma/migrations');

if (fs.existsSync(migrationDir)) {
  const migrationFiles = fs.readdirSync(migrationDir);
  const admissionsMigrations = migrationFiles.filter(file => 
    file.includes('admissions') || file.includes('add_admissions_system')
  );
  
  if (admissionsMigrations.length > 0) {
    checkResult('admissions_migrations', 'pass', `Found ${admissionsMigrations.length} admissions migration(s)`);
  } else {
    checkResult('admissions_migrations', 'warning', 'No admissions migrations found');
  }
} else {
  checkResult('migration_directory', 'warning', 'Migration directory not found');
}

// Generate summary
const totalCount = passCount + failCount + warningCount;
const successRate = Math.round((passCount / totalCount) * 100);

console.log('\n📊 Validation Summary:');
console.log(`   Total checks: ${totalCount}`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   ⚠️  Warnings: ${warningCount}`);
console.log(`   Success rate: ${successRate}%`);

if (failCount > 0) {
  console.log('\n❌ Some validation checks failed. Please review the issues above.');
  process.exit(1);
} else {
  console.log('\n✅ All critical validation checks passed!');
  console.log('\n🎉 ScrollUniversity Admissions System infrastructure setup is complete!');
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Start your database server (PostgreSQL)');
  console.log('   2. Start Redis server');
  console.log('   3. Run: npm run migrate');
  console.log('   4. Run: npm run admissions:dev');
  
  process.exit(0);
}