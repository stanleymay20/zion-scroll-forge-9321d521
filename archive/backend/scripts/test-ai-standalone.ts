#!/usr/bin/env ts-node
/**
 * Standalone AI Content Generation Test
 * Tests AI integration without database dependencies
 */

import { AIGatewayService } from '../src/services/AIGatewayService';
import logger from '../src/utils/logger';

async function testStandaloneAI(): Promise<void> {
  console.log('🤖 Testing Standalone AI Integration...\n');

  try {
    const aiGateway = new AIGatewayService();
    
    console.log('📝 Testing AI Completion Generation...');
    
    const testPrompt = `
Generate a comprehensive university-level lecture introduction for a course on "Introduction to Biblical Theology".

The lecture should cover "The Nature and Attributes of God" and include:
1. A compelling hook that engages students
2. Clear learning objectives
3. An overview of what will be covered
4. Connection to real-world applications

Keep it academic but accessible, around 200-300 words.
    `.trim();

    const startTime = Date.now();
    
    const response = await aiGateway.generateCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator for a Christian university. Create engaging, academically rigorous content that integrates faith and learning.'
        },
        {
          role: 'user',
          content: testPrompt
        }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    const duration = Date.now() - startTime;

    console.log('✅ AI Response Generated Successfully!\n');
    console.log('📊 Response Details:');
    console.log(`   Model: ${response.model}`);
    console.log(`   Tokens Used: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.cost.totalCost.toFixed(4)}`);
    console.log(`   Processing Time: ${duration}ms`);
    console.log(`   Finish Reason: ${response.finishReason}\n`);
    
    console.log('📝 Generated Content:');
    console.log('─'.repeat(80));
    console.log(response.content);
    console.log('─'.repeat(80));
    
    console.log('\n🎯 Quality Assessment:');
    console.log(`   Content Length: ${response.content.length} characters`);
    console.log(`   Academic Tone: ${response.content.includes('learning') ? '✅' : '❌'}`);
    console.log(`   Engaging Hook: ${response.content.length > 100 ? '✅' : '❌'}`);
    console.log(`   Theological Focus: ${response.content.toLowerCase().includes('god') ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ AI Integration Test Failed:');
    
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      
      // Check for specific error types
      if (error.message.includes('API key')) {
        console.error('\n💡 Solution: Add a real OpenAI API key to backend/.env:');
        console.error('   OPENAI_API_KEY="sk-your-actual-api-key-here"');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.error('\n💡 Solution: Check your internet connection and try again');
      } else {
        console.error(`\n🔍 Stack Trace:\n${error.stack}`);
      }
    } else {
      console.error(`   Unknown Error: ${String(error)}`);
    }
    
    console.error('\n📋 Next Steps:');
    console.error('   1. Ensure you have a valid OpenAI API key');
    console.error('   2. Update backend/.env with: OPENAI_API_KEY="sk-your-key"');
    console.error('   3. Check your internet connection');
    console.error('   4. Verify OpenAI service status');
  }
}

// Run test if executed directly
if (require.main === module) {
  testStandaloneAI().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default testStandaloneAI;