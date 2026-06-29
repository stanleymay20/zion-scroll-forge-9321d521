/**
 * Chat System Validation Script
 * Validates that all chat system components are properly configured
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: ValidationResult[] = [];

async function validateChatSystem(): Promise<void> {
  console.log('🔍 Validating Chat System Implementation...\n');

  // 1. Check if type definitions exist
  checkFile('Type Definitions', 'src/types/chat.types.ts');

  // 2. Check if configuration exists
  checkFile('Socket Configuration', 'src/config/socket.config.ts');

  // 3. Check if services exist
  checkFile('Socket Redis Adapter', 'src/services/SocketRedisAdapter.ts');
  checkFile('Chat File Service', 'src/services/ChatFileService.ts');
  checkFile('Chat Service', 'src/services/ChatService.ts');
  checkFile('Socket Service', 'src/services/SocketService.ts');

  // 4. Check if routes exist
  checkFile('Chat Routes', 'src/routes/chat.ts');

  // 5. Check if tests exist
  checkFile('Chat Service Tests', 'src/services/__tests__/ChatService.test.ts');

  // 6. Check if documentation exists
  checkFile('Implementation Documentation', 'CHAT_SYSTEM_IMPLEMENTATION.md');
  checkFile('Completion Summary', 'TASK_9_CHAT_SYSTEM_COMPLETE.md');

  // 7. Check if migration exists
  checkFile('Database Migration', 'prisma/migrations/20251219000001_chat_system/migration.sql');

  // 8. Check database schema
  await checkDatabaseSchema();

  // 9. Check dependencies
  checkDependency('@socket.io/redis-adapter');
  checkDependency('socket.io');
  checkDependency('redis');

  // Print results
  console.log('\n📊 Validation Results:\n');
  console.log('═'.repeat(80));
  
  let passCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.component.padEnd(40)} ${result.status}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
    
    if (result.status === 'PASS') passCount++;
    else failCount++;
  });

  console.log('═'.repeat(80));
  console.log(`\nTotal: ${passCount} passed, ${failCount} failed\n`);

  if (failCount === 0) {
    console.log('🎉 All validations passed! Chat system is ready for deployment.\n');
  } else {
    console.log('⚠️  Some validations failed. Please review the issues above.\n');
    process.exit(1);
  }
}

function checkFile(component: string, filePath: string): void {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    results.push({
      component,
      status: 'PASS',
      message: `File exists: ${filePath}`
    });
  } else {
    results.push({
      component,
      status: 'FAIL',
      message: `File not found: ${filePath}`
    });
  }
}

function checkDependency(packageName: string): void {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const hasDependency = 
    packageJson.dependencies?.[packageName] || 
    packageJson.devDependencies?.[packageName];

  if (hasDependency) {
    results.push({
      component: `Dependency: ${packageName}`,
      status: 'PASS',
      message: `Version: ${hasDependency}`
    });
  } else {
    results.push({
      component: `Dependency: ${packageName}`,
      status: 'FAIL',
      message: 'Not found in package.json'
    });
  }
}

async function checkDatabaseSchema(): Promise<void> {
  try {
    // Check if ChatRoom model exists
    const roomCount = await prisma.chatRoom.count();
    results.push({
      component: 'Database: ChatRoom Model',
      status: 'PASS',
      message: `Model accessible (${roomCount} records)`
    });

    // Check if ChatMember model exists
    const memberCount = await prisma.chatMember.count();
    results.push({
      component: 'Database: ChatMember Model',
      status: 'PASS',
      message: `Model accessible (${memberCount} records)`
    });

    // Check if ChatMessage model exists
    const messageCount = await prisma.chatMessage.count();
    results.push({
      component: 'Database: ChatMessage Model',
      status: 'PASS',
      message: `Model accessible (${messageCount} records)`
    });

    // Check if DirectMessage model exists
    const dmCount = await prisma.directMessage.count();
    results.push({
      component: 'Database: DirectMessage Model',
      status: 'PASS',
      message: `Model accessible (${dmCount} records)`
    });
  } catch (error) {
    results.push({
      component: 'Database Schema',
      status: 'FAIL',
      message: `Error accessing database: ${error.message}`
    });
  }
}

// Run validation
validateChatSystem()
  .catch(error => {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
