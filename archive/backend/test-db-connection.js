/**
 * Database Connection Test Script
 * Tests PostgreSQL and Prisma connectivity
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Connecting to database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to database\n');

    // Test 2: Query test
    console.log('Test 2: Running test query...');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Query successful:', result);
    console.log('');

    // Test 3: Check tables
    console.log('Test 3: Checking database tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `;
    console.log(`✅ Found ${tables.length} tables (showing first 10):`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log('');

    // Test 4: Check User table
    console.log('Test 4: Checking User table...');
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible. Count: ${userCount}\n`);

    // Test 5: Check Course table
    console.log('Test 5: Checking Course table...');
    const courseCount = await prisma.course.count();
    console.log(`✅ Course table accessible. Count: ${courseCount}\n`);

    console.log('🎉 All database tests passed!\n');
    console.log('Database is properly connected and ready to use.');

  } catch (error) {
    console.error('❌ Database connection test failed:\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Fix: Check your DATABASE_URL in .env file');
      console.error('   Make sure username, password, host, and database name are correct');
    } else if (error.message.includes('Connection refused')) {
      console.error('\n💡 Fix: Make sure PostgreSQL is running');
      console.error('   Run: pg_ctl status (or check your PostgreSQL service)');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Fix: Run database migrations');
      console.error('   Run: npm run migrate');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
