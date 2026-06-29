/**
 * Setup Curriculum Grid Infrastructure
 * Initializes the database with the 12 Supreme Scroll Faculties and sample courses
 */

import { PrismaClient } from '@prisma/client';
import { MasterCourseCatalogService } from '../../src/services/MasterCourseCatalogService';
import { SupremeScrollFaculty, CourseLevel, CourseStatus } from '../../src/types/curriculum-grid';

const prisma = new PrismaClient();

async function setupCurriculumGrid() {
  console.log('🎓 Setting up ScrollUniversity Curriculum Grid Infrastructure...\n');

  try {
    // Initialize the catalog service
    const catalogService = new MasterCourseCatalogService(prisma);

    // Initialize database faculties
    console.log('1. Initializing 12 Supreme Scroll Faculties...');
    await catalogService.initializeDatabaseFaculties();
    console.log('✅ Faculties initialized\n');

    // Create sample courses for each faculty
    console.log('2. Creating sample courses...');
    
    const sampleCourses = [
      {
        title: 'Introduction to Prophetic AI',
        description: 'Foundational course integrating AI principles with prophetic wisdom and kingdom ethics',
        faculty: SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE,
        level: CourseLevel.UNDERGRADUATE,
        estimatedHours: 40,
        xpReward: 100,
        scrollCoinCost: 50,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'ScrollCoin Economics and Digital Currency',
        description: 'Biblical economic principles applied to modern digital currency systems',
        faculty: SupremeScrollFaculty.SCROLL_ECONOMY_FINANCE,
        level: CourseLevel.GRADUATE,
        estimatedHours: 60,
        xpReward: 150,
        scrollCoinCost: 75,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Constitutional Design for Kingdom Nations',
        description: 'Divine law principles for designing constitutions that honor God and serve people',
        faculty: SupremeScrollFaculty.PROPHETIC_LAW_GOVERNANCE,
        level: CourseLevel.GRADUATE,
        estimatedHours: 80,
        xpReward: 200,
        scrollCoinCost: 100,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Advanced Biblical Hermeneutics',
        description: 'Deep study of biblical interpretation with prophetic insight and divine revelation',
        faculty: SupremeScrollFaculty.SCROLL_THEOLOGY_BIBLE,
        level: CourseLevel.DOCTORAL,
        estimatedHours: 120,
        xpReward: 300,
        scrollCoinCost: 150,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Quantum Healing and Light Therapy',
        description: 'Pre-flood science principles applied to modern healing and restoration',
        faculty: SupremeScrollFaculty.EDENIC_SCIENCE_BIOTECH,
        level: CourseLevel.GRADUATE,
        estimatedHours: 100,
        xpReward: 250,
        scrollCoinCost: 125,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Prophetic Geography and End-Time Mapping',
        description: 'Understanding earth\'s prophetic significance and end-time geographical events',
        faculty: SupremeScrollFaculty.GEOPROPHETIC_INTELLIGENCE,
        level: CourseLevel.GRADUATE,
        estimatedHours: 70,
        xpReward: 175,
        scrollCoinCost: 90,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Kingdom Entrepreneurship Fundamentals',
        description: 'Sacred labor principles for building businesses that advance God\'s kingdom',
        faculty: SupremeScrollFaculty.SACRED_LABOR_ENTREPRENEURSHIP,
        level: CourseLevel.UNDERGRADUATE,
        estimatedHours: 50,
        xpReward: 125,
        scrollCoinCost: 60,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Digital Evangelism and AI Discipleship',
        description: 'Using technology and AI for effective evangelism and discipleship worldwide',
        faculty: SupremeScrollFaculty.GLOBAL_MISSIONS_EVANGELISM,
        level: CourseLevel.UNDERGRADUATE,
        estimatedHours: 45,
        xpReward: 110,
        scrollCoinCost: 55,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Trauma Healing and Soul Restoration',
        description: 'Divine psychology principles for healing trauma and restoring broken souls',
        faculty: SupremeScrollFaculty.DIVINE_PSYCHOLOGY_RESTORATION,
        level: CourseLevel.GRADUATE,
        estimatedHours: 90,
        xpReward: 225,
        scrollCoinCost: 110,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'Prophetic Music and Worship Technology',
        description: 'Creating prophetic music and worship experiences using modern technology',
        faculty: SupremeScrollFaculty.SCROLL_ARTS_STORYTELLING,
        level: CourseLevel.UNDERGRADUATE,
        estimatedHours: 55,
        xpReward: 140,
        scrollCoinCost: 70,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'ScrollAnatomy and Divine Healing',
        description: 'Understanding human anatomy from a divine perspective for supernatural healing',
        faculty: SupremeScrollFaculty.SCROLL_MEDICINE_HEALING,
        level: CourseLevel.GRADUATE,
        estimatedHours: 110,
        xpReward: 275,
        scrollCoinCost: 140,
        status: CourseStatus.PUBLISHED
      },
      {
        title: 'AI Tutor Development for Kingdom Education',
        description: 'Building AI tutoring systems that integrate biblical wisdom with educational excellence',
        faculty: SupremeScrollFaculty.EDUCATION_CURRICULUM,
        level: CourseLevel.GRADUATE,
        estimatedHours: 85,
        xpReward: 210,
        scrollCoinCost: 105,
        status: CourseStatus.PUBLISHED
      }
    ];

    for (const courseData of sampleCourses) {
      try {
        const course = await catalogService.addCourse(courseData);
        console.log(`   ✅ Created: ${course.title} (${course.faculty})`);
      } catch (error) {
        console.log(`   ❌ Failed to create: ${courseData.title} - ${error.message}`);
      }
    }

    console.log('\n3. Generating catalog statistics...');
    const stats = await catalogService.getCatalogStatistics();
    console.log(`   📊 Total Courses: ${stats.totalCourses}`);
    console.log(`   🎯 Target: ${stats.targetTotal}`);
    console.log(`   📈 Progress: ${stats.progress.toFixed(2)}%`);
    
    console.log('\n   Faculty Distribution:');
    stats.facultyStats.forEach(faculty => {
      console.log(`     ${faculty.faculty}: ${faculty.currentCount}/${faculty.targetCount} (${faculty.progress.toFixed(1)}%)`);
    });

    console.log('\n4. Testing search functionality...');
    const searchResults = await catalogService.searchCourses({
      query: 'AI',
      faculty: [SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE]
    });
    console.log(`   🔍 Found ${searchResults.courses.length} AI courses`);
    console.log(`   📋 Facets: ${searchResults.facets.faculties.length} faculties, ${searchResults.facets.levels.length} levels`);

    console.log('\n🎉 Curriculum Grid Infrastructure Setup Complete!');
    console.log('The Master Course Catalog is ready to support 10,000+ courses across 12 Supreme Scroll Faculties.');

    // Cleanup
    await catalogService.disconnect();

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupCurriculumGrid()
    .then(() => {
      console.log('\n✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupCurriculumGrid };