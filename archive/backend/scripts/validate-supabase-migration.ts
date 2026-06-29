#!/usr/bin/env ts-node

/**
 * Supabase Migration Validation Script
 * Validates that the Supabase schema migration was successful
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: ValidationResult[] = [];

function logResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ category, test, status, message });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${test}: ${message}`);
}

async function validateTables() {
  console.log('\n📋 Validating Tables...');
  
  const requiredTables = [
    'user_profiles',
    'faculties',
    'courses',
    'enrollments',
    'assignments',
    'submissions',
    'payments',
    'scrollcoin_transactions',
    'research_papers',
    'certifications',
    'scrollbadges',
    'badge_verifications',
    'public_badge_profiles',
    'applications',
    'ai_tutor_sessions',
    'messages',
    'audit_logs'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logResult('Tables', table, 'FAIL', `Table query failed: ${error.message}`);
      } else {
        logResult('Tables', table, 'PASS', 'Table exists and is accessible');
      }
    } catch (err) {
      logResult('Tables', table, 'FAIL', `Unexpected error: ${err}`);
    }
  }
}

async function validateRLS() {
  console.log('\n🔒 Validating Row Level Security...');
  
  try {
    const { data, error } = await supabase.rpc('test_migration_rollback');
    
    if (error) {
      logResult('RLS', 'RLS Verification', 'WARN', `Could not run RLS test: ${error.message}`);
    } else {
      const rlsTest = data?.find((r: any) => r.test_name === 'Verify RLS Enabled');
      if (rlsTest && rlsTest.status === 'PASS') {
        logResult('RLS', 'RLS Enabled', 'PASS', 'RLS is enabled on core tables');
      } else {
        logResult('RLS', 'RLS Enabled', 'FAIL', 'RLS verification failed');
      }
    }
  } catch (err) {
    logResult('RLS', 'RLS Verification', 'WARN', `RLS test not available: ${err}`);
  }
}

async function validateFunctions() {
  console.log('\n⚙️ Validating Database Functions...');
  
  const functions = [
    'enroll_in_course',
    'grade_submission',
    'complete_course',
    'process_payment',
    'get_course_progress',
    'search_courses',
    'get_leaderboard',
    'award_daily_streak_bonus'
  ];
  
  try {
    const { data, error } = await supabase.rpc('test_migration_rollback');
    
    if (error) {
      logResult('Functions', 'Function Verification', 'WARN', `Could not run function test: ${error.message}`);
    } else {
      const funcTest = data?.find((r: any) => r.test_name === 'Verify Functions');
      if (funcTest && funcTest.status === 'PASS') {
        logResult('Functions', 'Database Functions', 'PASS', 'Core database functions exist');
      } else {
        logResult('Functions', 'Database Functions', 'FAIL', 'Function verification failed');
      }
    }
  } catch (err) {
    logResult('Functions', 'Function Verification', 'WARN', `Function test not available: ${err}`);
  }
}

async function validateStorage() {
  console.log('\n💾 Validating Storage Buckets...');
  
  const requiredBuckets = [
    'course-materials',
    'user-avatars',
    'assignment-submissions',
    'badge-images',
    'research-papers'
  ];
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logResult('Storage', 'List Buckets', 'FAIL', `Failed to list buckets: ${error.message}`);
      return;
    }
    
    for (const bucketName of requiredBuckets) {
      const exists = buckets?.some(b => b.id === bucketName);
      if (exists) {
        logResult('Storage', bucketName, 'PASS', 'Bucket exists');
      } else {
        logResult('Storage', bucketName, 'FAIL', 'Bucket not found');
      }
    }
  } catch (err) {
    logResult('Storage', 'Storage Validation', 'FAIL', `Unexpected error: ${err}`);
  }
}

async function validateViews() {
  console.log('\n👁️ Validating Database Views...');
  
  const views = [
    'user_dashboard_stats',
    'course_stats'
  ];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        logResult('Views', view, 'FAIL', `View query failed: ${error.message}`);
      } else {
        logResult('Views', view, 'PASS', 'View exists and is accessible');
      }
    } catch (err) {
      logResult('Views', view, 'FAIL', `Unexpected error: ${err}`);
    }
  }
}

async function validateIndexes() {
  console.log('\n📊 Validating Performance Indexes...');
  
  // This would require direct database access to check indexes
  // For now, we'll just log a warning
  logResult('Indexes', 'Index Verification', 'WARN', 'Index verification requires direct database access');
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  
  const successRate = ((passed / total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ MIGRATION VALIDATION FAILED');
    console.log('Please review the failed tests above and fix the issues.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  MIGRATION VALIDATION COMPLETED WITH WARNINGS');
    console.log('Some tests could not be fully validated. Review warnings above.');
    process.exit(0);
  } else {
    console.log('\n✅ MIGRATION VALIDATION SUCCESSFUL');
    console.log('All tests passed! The Supabase schema is properly configured.');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 Starting Supabase Migration Validation...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log('');
  
  try {
    await validateTables();
    await validateRLS();
    await validateFunctions();
    await validateStorage();
    await validateViews();
    await validateIndexes();
    await printSummary();
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  }
}

main();
