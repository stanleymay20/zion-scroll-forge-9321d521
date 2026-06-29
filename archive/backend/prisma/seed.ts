import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { seedAccreditationAuthority } from './seeds/accreditation-authority-seed';
import { seedAdmissionsSystem } from './seeds/admissions-system-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ScrollUniversity database seeding...');

  try {
    // Seed basic data first
    await seedBasicData();
    
    // Seed ScrollAccreditation Authority data
    await seedAccreditationAuthority();
    
    // Seed ScrollAdmissions System data
    await seedAdmissionsSystem();
    
    console.log('✅ All seed data created successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function seedBasicData() {
  console.log('🌱 Seeding basic ScrollUniversity data...');

  // Create admin user
  const adminPassword = await hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scrolluniversity.com' },
    update: {},
    create: {
      email: 'admin@scrolluniversity.com',
      username: 'scroll_admin',
      passwordHash: adminPassword,
      firstName: 'Scroll',
      lastName: 'Administrator',
      role: 'ADMIN',
      scrollCalling: 'Platform Administration',
      spiritualGifts: ['Administration', 'Leadership'],
      kingdomVision: 'Facilitating global transformation through education',
      scrollAlignment: 95.0,
    },
  });

  // Create sample faculty
  const faculty = await prisma.faculty.upsert({
    where: { id: 'scroll-ai-faculty' },
    update: {},
    create: {
      id: 'scroll-ai-faculty',
      name: 'ScrollAI & Technology',
      description: 'Artificial Intelligence, Technology, and Digital Innovation',
      icon: '🤖',
      isActive: true,
    },
  });

  // Create sample course
  const course = await prisma.course.upsert({
    where: { id: 'intro-to-scroll-ai' },
    update: {},
    create: {
      id: 'intro-to-scroll-ai',
      title: 'Introduction to ScrollAI',
      description: 'Learn the fundamentals of AI in the context of kingdom principles',
      syllabus: 'Comprehensive introduction to AI ethics, development, and kingdom applications',
      difficulty: 'BEGINNER',
      duration: 40,
      scrollXPReward: 100,
      scrollCoinCost: 0.0,
      facultyId: faculty.id,
      isActive: true,
      publishedAt: new Date(),
    },
  });

  console.log('✅ Basic seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });