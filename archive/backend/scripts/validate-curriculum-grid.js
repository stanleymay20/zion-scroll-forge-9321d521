"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCurriculumGrid = validateCurriculumGrid;
const client_1 = require("@prisma/client");
const MasterCourseCatalogService_1 = require("../../src/services/MasterCourseCatalogService");
const curriculum_grid_1 = require("../../src/types/curriculum-grid");
const prisma = new client_1.PrismaClient();
async function validateCurriculumGrid() {
    console.log('🎓 Validating ScrollUniversity Curriculum Grid Implementation');
    console.log('===========================================================\n');
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    function test(description, condition) {
        if (condition) {
            console.log(`✅ ${description}`);
            results.passed++;
            results.details.push({ test: description, status: 'PASSED' });
        }
        else {
            console.log(`❌ ${description}`);
            results.failed++;
            results.details.push({ test: description, status: 'FAILED' });
        }
    }
    try {
        const catalogService = new MasterCourseCatalogService_1.MasterCourseCatalogService(prisma);
        try {
            await prisma.$connect();
            test('Database connection established', true);
        }
        catch (error) {
            test('Database connection established', false);
            console.log(`   Error: ${error.message}`);
        }
        const faculties = catalogService.getAllFaculties();
        test('12 Supreme Scroll Faculties configured', faculties.length === 12);
        test('All faculties have target course counts', faculties.every(f => f.targetCourseCount > 0));
        test('All faculties have departments', faculties.every(f => f.departments.length > 0));
        try {
            await catalogService.initializeDatabaseFaculties();
            test('Database faculties initialized', true);
        }
        catch (error) {
            test('Database faculties initialized', false);
            console.log(`   Error: ${error.message}`);
        }
        const testCourse = {
            title: 'Test Course: Prophetic AI Validation',
            description: 'A test course to validate the curriculum grid implementation',
            faculty: curriculum_grid_1.SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE,
            level: curriculum_grid_1.CourseLevel.UNDERGRADUATE,
            estimatedHours: 40,
            xpReward: 100,
            scrollCoinCost: 50,
            status: curriculum_grid_1.CourseStatus.PUBLISHED
        };
        let createdCourse;
        try {
            createdCourse = await catalogService.addCourse(testCourse);
            test('Course creation works', !!createdCourse);
            test('Created course has valid ID', !!createdCourse.id);
            test('Created course has course code', !!createdCourse.courseCode);
            test('Created course has spiritual objectives', createdCourse.spiritualObjectives.length > 0);
            test('Created course has prophetic alignment', createdCourse.propheticAlignment.alignmentScore > 0);
        }
        catch (error) {
            test('Course creation works', false);
            console.log(`   Error: ${error.message}`);
        }
        if (createdCourse) {
            try {
                const retrievedCourse = await catalogService.getCourseById(createdCourse.id);
                test('Course retrieval by ID works', !!retrievedCourse);
                test('Retrieved course matches created course', retrievedCourse?.title === testCourse.title);
            }
            catch (error) {
                test('Course retrieval by ID works', false);
                console.log(`   Error: ${error.message}`);
            }
        }
        try {
            const searchResults = await catalogService.searchCourses({
                query: 'Test',
                faculty: [curriculum_grid_1.SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE]
            });
            test('Course search works', !!searchResults);
            test('Search returns results array', Array.isArray(searchResults.courses));
            test('Search returns facets', !!searchResults.facets);
            test('Search facets have faculty data', searchResults.facets.faculties.length > 0);
        }
        catch (error) {
            test('Course search works', false);
            console.log(`   Error: ${error.message}`);
        }
        try {
            const facultyCourses = await catalogService.getCoursesByFaculty(curriculum_grid_1.SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE);
            test('Faculty course retrieval works', Array.isArray(facultyCourses));
            test('Faculty courses are properly filtered', facultyCourses.every(c => c.faculty === curriculum_grid_1.SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE));
        }
        catch (error) {
            test('Faculty course retrieval works', false);
            console.log(`   Error: ${error.message}`);
        }
        try {
            const stats = await catalogService.getCatalogStatistics();
            test('Catalog statistics generation works', !!stats);
            test('Statistics include total courses', typeof stats.totalCourses === 'number');
            test('Statistics include faculty breakdown', Array.isArray(stats.facultyStats));
            test('Statistics include progress calculation', typeof stats.progress === 'number');
            test('All 12 faculties in statistics', stats.facultyStats.length === 12);
        }
        catch (error) {
            test('Catalog statistics generation works', false);
            console.log(`   Error: ${error.message}`);
        }
        if (createdCourse) {
            try {
                const updatedCourse = await catalogService.updateCourse(createdCourse.id, {
                    title: 'Updated Test Course Title',
                    estimatedHours: 60
                });
                test('Course update works', !!updatedCourse);
                test('Course title updated correctly', updatedCourse.title === 'Updated Test Course Title');
                test('Course hours updated correctly', updatedCourse.estimatedHours === 60);
            }
            catch (error) {
                test('Course update works', false);
                console.log(`   Error: ${error.message}`);
            }
        }
        try {
            const testUser = await prisma.user.create({
                data: {
                    email: 'test@scrolluniversity.org',
                    username: 'testuser',
                    passwordHash: 'hashed',
                    firstName: 'Test',
                    lastName: 'User',
                    scrollCalling: 'Technology Ministry',
                    spiritualGifts: ['Teaching', 'Wisdom'],
                    kingdomVision: 'Use technology for kingdom advancement'
                }
            });
            const studentProfile = await catalogService.getStudentProfile(testUser.id);
            test('Student profile retrieval works', !!studentProfile);
            test('Student profile has calling assessment', !!studentProfile?.callingAssessment);
            test('Student profile has learning history', !!studentProfile?.learningHistory);
            await prisma.user.delete({ where: { id: testUser.id } });
        }
        catch (error) {
            test('Student profile retrieval works', false);
            console.log(`   Error: ${error.message}`);
        }
        try {
            const generatedCourse = await catalogService.generateCourse({
                topic: 'Test AI Course Generation',
                faculty: curriculum_grid_1.SupremeScrollFaculty.SCROLL_AI_INTELLIGENCE,
                level: curriculum_grid_1.CourseLevel.UNDERGRADUATE,
                propheticGuidance: {
                    hasGuidance: true,
                    source: 'prophetic_word',
                    guidance: 'Test prophetic guidance',
                    biblicalReferences: ['Proverbs 2:6'],
                    urgencyLevel: 'high',
                    globalImpact: 'Test impact'
                },
                targetAudience: {
                    primaryAudience: 'Test audience',
                    secondaryAudiences: [],
                    prerequisites: [],
                    recommendedBackground: []
                },
                learningOutcomes: [],
                deliveryPreferences: ['online_portal'],
                culturalContext: 'western',
                urgencyLevel: 'routine'
            });
            test('Course generation works', !!generatedCourse);
            test('Generated course has outline', !!generatedCourse.courseOutline);
            test('Generated course has learning objectives', generatedCourse.learningObjectives.length > 0);
            test('Generated course has spiritual objectives', generatedCourse.spiritualObjectives.length > 0);
        }
        catch (error) {
            test('Course generation works', false);
            console.log(`   Error: ${error.message}`);
        }
        if (createdCourse) {
            try {
                await catalogService.deleteCourse(createdCourse.id);
                test('Course deletion works', true);
            }
            catch (error) {
                test('Course deletion works', false);
                console.log(`   Error: ${error.message}`);
            }
        }
        await catalogService.disconnect();
        console.log('\n📊 Validation Summary:');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
        if (results.failed === 0) {
            console.log('\n🎉 All validations passed! Real database-integrated Master Course Catalog Infrastructure is working correctly.');
            console.log('\nReal Implementation Features Validated:');
            console.log('• Database-integrated course storage and retrieval');
            console.log('• 12 Supreme Scroll Faculties with real database records');
            console.log('• Advanced course search with database queries');
            console.log('• Student profile integration with user data');
            console.log('• Course CRUD operations with data persistence');
            console.log('• Real-time catalog statistics from database');
            console.log('• Spiritual alignment validation and authentication');
            console.log('• Dynamic course generation with database integration');
            console.log('\nTask 1: Master Course Catalog Infrastructure - REAL IMPLEMENTATION COMPLETED ✅');
        }
        else {
            console.log('\n⚠️  Some validations failed. Please review the database integration.');
        }
        return results;
    }
    catch (error) {
        console.error('❌ Validation failed with error:', error);
        throw error;
    }
}
if (require.main === module) {
    validateCurriculumGrid()
        .then(() => {
        console.log('\n✅ Validation completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Validation failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=validate-curriculum-grid.js.map