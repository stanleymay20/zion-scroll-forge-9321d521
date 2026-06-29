"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStudentIntegration = validateStudentIntegration;
const client_1 = require("@prisma/client");
const StudentProfileIntegrationService_1 = require("../src/services/admissions/StudentProfileIntegrationService");
const EnrollmentCoordinationService_1 = require("../src/services/admissions/EnrollmentCoordinationService");
const AcademicRecordTransferService_1 = require("../src/services/admissions/AcademicRecordTransferService");
const prisma = new client_1.PrismaClient();
async function validateStudentIntegration() {
    console.log('🎓 Starting ScrollUniversity Student Integration Validation...\n');
    try {
        const studentProfileService = new StudentProfileIntegrationService_1.StudentProfileIntegrationService(prisma);
        const enrollmentService = new EnrollmentCoordinationService_1.EnrollmentCoordinationService(prisma);
        const transferService = new AcademicRecordTransferService_1.AcademicRecordTransferService(prisma);
        console.log('📝 Test 1: Creating test user and application...');
        const testUser = await prisma.user.create({
            data: {
                email: 'test.student@scrolluniversity.edu',
                username: 'teststudent',
                passwordHash: 'hashed_password',
                firstName: 'Test',
                lastName: 'Student',
                location: 'Test City',
                phoneNumber: '+1234567890',
                role: client_1.UserRole.STUDENT,
                academicLevel: client_1.AcademicLevel.SCROLL_OPEN,
                scrollCoinBalance: 0.0,
                workTradeCredits: 0.0
            }
        });
        const testApplication = await prisma.application.create({
            data: {
                applicantId: testUser.id,
                status: client_1.ApplicationStatus.ACCEPTED,
                programApplied: client_1.ProgramType.SCROLL_DEGREE,
                intendedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                personalStatement: 'I am called to serve in scroll-aligned education',
                academicHistory: [
                    {
                        institutionName: 'Previous University',
                        degree: 'Bachelor of Arts',
                        fieldOfStudy: 'Education',
                        startDate: '2020-09-01',
                        endDate: '2024-05-15',
                        gpa: 3.7,
                        creditsEarned: 120,
                        transcriptVerified: true,
                        documents: ['transcript.pdf']
                    }
                ],
                spiritualTestimony: 'My testimony of faith and calling to education ministry',
                characterReferences: [
                    {
                        name: 'Pastor John Smith',
                        relationship: 'Pastor',
                        contact: 'pastor@church.org',
                        recommendation: 'Strong character and spiritual maturity'
                    }
                ],
                documents: ['transcript.pdf', 'recommendation.pdf'],
                applicationTimeline: [
                    {
                        event: 'APPLICATION_SUBMITTED',
                        timestamp: new Date().toISOString(),
                        details: { programType: client_1.ProgramType.SCROLL_DEGREE }
                    }
                ]
            }
        });
        console.log(`✅ Created test user: ${testUser.id}`);
        console.log(`✅ Created test application: ${testApplication.id}\n`);
        console.log('📊 Test 2: Creating academic evaluation...');
        const academicEvaluation = await prisma.academicEvaluation.create({
            data: {
                applicationId: testApplication.id,
                evaluatorId: testUser.id,
                previousEducation: testApplication.academicHistory,
                academicPerformance: {
                    gpa: 3.7,
                    creditsEarned: 120,
                    transcriptVerified: true
                },
                coreSkills: [
                    { skill: 'Critical Thinking', level: 'Advanced', score: 0.9 },
                    { skill: 'Communication', level: 'Intermediate', score: 0.8 },
                    { skill: 'Research', level: 'Intermediate', score: 0.75 }
                ],
                learningPotential: 0.85,
                intellectualCapacity: {
                    analyticalThinking: 0.9,
                    creativeProblemSolving: 0.8,
                    academicWriting: 0.85
                },
                recommendedLevel: client_1.AcademicLevel.SCROLL_DEGREE,
                supportNeeds: [],
                remedialRequirements: [],
                academicReadiness: 0.85,
                skillProficiency: {
                    mathematics: 0.8,
                    writing: 0.9,
                    research: 0.75,
                    criticalThinking: 0.9
                },
                potentialScore: 0.85
            }
        });
        console.log(`✅ Created academic evaluation: ${academicEvaluation.id}\n`);
        console.log('🙏 Test 3: Creating spiritual evaluation...');
        const spiritualEvaluation = await prisma.spiritualEvaluation.create({
            data: {
                applicationId: testApplication.id,
                evaluatorId: testUser.id,
                personalTestimony: {
                    authenticity: 0.9,
                    clarity: 0.85,
                    depth: 0.8,
                    transformation: 0.9,
                    kingdomFocus: 0.85
                },
                spiritualMaturity: 'GROWING',
                characterTraits: [
                    { trait: 'Humility', score: 0.9 },
                    { trait: 'Integrity', score: 0.95 },
                    { trait: 'Compassion', score: 0.85 }
                ],
                ministryExperience: [
                    {
                        role: 'Sunday School Teacher',
                        duration: '2 years',
                        responsibilities: 'Teaching children ages 8-12',
                        impact: 'Helped 20+ children grow in faith'
                    }
                ],
                callingClarity: {
                    clarity: 0.8,
                    confidence: 0.85,
                    alignment: 0.9
                },
                scrollAlignment: 0.85,
                kingdomVision: 'To advance God\'s kingdom through education and discipleship',
                spiritualRecommendations: [
                    'Continue in spiritual formation courses',
                    'Engage in regular mentorship',
                    'Participate in ministry opportunities'
                ],
                authenticityScore: 0.9,
                clarityScore: 0.85,
                depthScore: 0.8,
                transformationScore: 0.9,
                kingdomFocusScore: 0.85,
                overallScore: 0.86
            }
        });
        console.log(`✅ Created spiritual evaluation: ${spiritualEvaluation.id}\n`);
        console.log('✅ Test 4: Creating admission decision...');
        const admissionDecision = await prisma.admissionDecision.create({
            data: {
                applicationId: testApplication.id,
                decision: 'ACCEPTED',
                decisionMakers: [
                    { name: 'Dr. Sarah Johnson', role: 'Academic Director' },
                    { name: 'Elder Michael Brown', role: 'Spiritual Advisor' }
                ],
                strengths: [
                    'Strong academic background',
                    'Clear spiritual calling',
                    'Excellent character references',
                    'Ministry experience'
                ],
                concerns: [],
                recommendations: [
                    'Enroll in foundational courses',
                    'Connect with academic mentor',
                    'Participate in spiritual formation program'
                ],
                overallAssessment: 'Excellent candidate with strong academic and spiritual foundation',
                futureConsiderations: [
                    'Consider leadership development track',
                    'Potential for advanced degree program'
                ],
                admissionConditions: [],
                enrollmentDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                appealEligible: false,
                nextSteps: [
                    'Complete enrollment process',
                    'Attend orientation',
                    'Begin foundational courses'
                ]
            }
        });
        console.log(`✅ Created admission decision: ${admissionDecision.id}\n`);
        console.log('👤 Test 5: Testing student profile creation...');
        const profileData = {
            firstName: 'Test',
            lastName: 'Student',
            email: 'test.student@scrolluniversity.edu',
            phoneNumber: '+1234567890',
            location: 'Test City',
            academicLevel: client_1.AcademicLevel.SCROLL_DEGREE,
            intendedProgram: 'SCROLL_DEGREE',
            scrollCalling: 'Education ministry and discipleship',
            spiritualGifts: ['Teaching', 'Wisdom', 'Encouragement'],
            kingdomVision: 'To advance God\'s kingdom through education',
            scrollAlignment: 0.85,
            preferredLanguage: 'en',
            timeZone: 'UTC',
            bio: 'Called to serve in scroll-aligned education'
        };
        const updatedUser = await studentProfileService.createStudentProfile(testApplication.id, profileData);
        console.log(`✅ Student profile created successfully`);
        console.log(`   - User ID: ${updatedUser.id}`);
        console.log(`   - Role: ${updatedUser.role}`);
        console.log(`   - Academic Level: ${updatedUser.academicLevel}`);
        console.log(`   - Scroll Calling: ${updatedUser.scrollCalling}`);
        console.log(`   - ScrollCoin Balance: ${updatedUser.scrollCoinBalance}\n`);
        console.log('📚 Test 6: Testing enrollment initialization...');
        const enrollmentData = {
            programType: 'SCROLL_DEGREE',
            startDate: new Date(),
            academicLevel: client_1.AcademicLevel.SCROLL_DEGREE,
            mentorAssignment: testUser.id,
            specialAccommodations: [],
            enrollmentConditions: []
        };
        const enrollment = await studentProfileService.initializeEnrollment(testApplication.id, enrollmentData);
        console.log(`✅ Enrollment initialized successfully`);
        console.log(`   - Enrollment ID: ${enrollment.id}`);
        console.log(`   - Course ID: ${enrollment.courseId}`);
        console.log(`   - Status: ${enrollment.status}`);
        console.log(`   - Progress: ${enrollment.progress}%\n`);
        console.log('📜 Test 7: Testing academic record transfer...');
        const transcript = await studentProfileService.transferAcademicRecords(testApplication.id, testUser.id);
        console.log(`✅ Academic records transferred successfully`);
        console.log(`   - Transcript ID: ${transcript.id}`);
        console.log(`   - Student ID: ${transcript.studentId}`);
        console.log(`   - Institution ID: ${transcript.institutionId}`);
        console.log(`   - ScrollXP: ${transcript.scrollXP}\n`);
        console.log('🎯 Test 8: Testing course registration coordination...');
        const courseEnrollments = await studentProfileService.coordinateCourseRegistration(testUser.id, testApplication.id);
        console.log(`✅ Course registration coordinated successfully`);
        console.log(`   - Number of courses enrolled: ${courseEnrollments.length}`);
        courseEnrollments.forEach((enrollment, index) => {
            console.log(`   - Course ${index + 1}: ${enrollment.courseId} (Status: ${enrollment.status})`);
        });
        console.log();
        console.log('📊 Test 9: Testing integration status...');
        const integrationStatus = await studentProfileService.getIntegrationStatus(testApplication.id);
        console.log(`✅ Integration status retrieved successfully`);
        console.log(`   - Profile Created: ${integrationStatus.profileCreated}`);
        console.log(`   - Enrollment Initialized: ${integrationStatus.enrollmentInitialized}`);
        console.log(`   - Academic Records Transferred: ${integrationStatus.academicRecordsTransferred}`);
        console.log(`   - Courses Registered: ${integrationStatus.coursesRegistered}`);
        console.log(`   - Integration Complete: ${integrationStatus.integrationComplete}\n`);
        console.log('🎓 Test 10: Testing enrollment coordination service...');
        const coordinationData = {
            applicationId: testApplication.id,
            userId: testUser.id,
            programType: 'SCROLL_DEGREE',
            academicLevel: 'SCROLL_DEGREE',
            startDate: new Date(),
            courseSelections: [
                {
                    courseId: 'scroll-foundations-101',
                    enrollmentType: 'REQUIRED',
                    priority: 1,
                    prerequisites: [],
                    accommodations: [],
                    personalizedSettings: {}
                }
            ],
            mentorPreference: testUser.id,
            learningPreferences: {
                style: 'visual',
                pace: 'self-paced'
            },
            specialNeeds: []
        };
        const validationResults = await enrollmentService.validateEnrollmentEligibility(coordinationData);
        console.log(`✅ Enrollment eligibility validated`);
        console.log(`   - Is Valid: ${validationResults.isValid}`);
        console.log(`   - Errors: ${validationResults.errors.length}`);
        console.log(`   - Warnings: ${validationResults.warnings.length}`);
        console.log(`   - Recommendations: ${validationResults.recommendations.length}\n`);
        console.log('📚 Test 11: Testing academic record transfer service...');
        const transferData = {
            applicationId: testApplication.id,
            userId: testUser.id,
            previousEducation: [
                {
                    institutionName: 'Previous University',
                    degree: 'Bachelor of Arts',
                    fieldOfStudy: 'Education',
                    startDate: new Date('2020-09-01'),
                    endDate: new Date('2024-05-15'),
                    gpa: 3.7,
                    creditsEarned: 120,
                    transcriptVerified: true,
                    documents: ['transcript.pdf']
                }
            ],
            academicEvaluations: [academicEvaluation],
            spiritualEvaluations: [spiritualEvaluation],
            transcriptData: {}
        };
        const transferResult = await transferService.transferAcademicRecords(transferData);
        console.log(`✅ Academic records transfer completed`);
        console.log(`   - Transcript ID: ${transferResult.transcriptId}`);
        console.log(`   - Credits Transferred: ${transferResult.creditsTransferred}`);
        console.log(`   - Academic Level: ${transferResult.academicLevel}`);
        console.log(`   - Support Needs: ${transferResult.supportNeeds.length}`);
        console.log(`   - Recommendations: ${transferResult.recommendations.length}\n`);
        console.log('🎯 Test 12: Testing complete integration process...');
        const newTestUser = await prisma.user.create({
            data: {
                email: 'complete.test@scrolluniversity.edu',
                username: 'completetest',
                passwordHash: 'hashed_password',
                firstName: 'Complete',
                lastName: 'Test',
                role: client_1.UserRole.STUDENT,
                academicLevel: client_1.AcademicLevel.SCROLL_OPEN,
                scrollCoinBalance: 0.0,
                workTradeCredits: 0.0
            }
        });
        const newTestApplication = await prisma.application.create({
            data: {
                applicantId: newTestUser.id,
                status: client_1.ApplicationStatus.ACCEPTED,
                programApplied: client_1.ProgramType.SCROLL_DEGREE,
                intendedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                personalStatement: 'Complete integration test',
                academicHistory: [],
                spiritualTestimony: 'Test testimony',
                characterReferences: [],
                documents: [],
                applicationTimeline: []
            }
        });
        const completeIntegrationData = {
            profileData: {
                firstName: 'Complete',
                lastName: 'Test',
                email: 'complete.test@scrolluniversity.edu',
                academicLevel: client_1.AcademicLevel.SCROLL_DEGREE,
                intendedProgram: 'SCROLL_DEGREE',
                scrollCalling: 'Complete integration test',
                spiritualGifts: ['Testing'],
                kingdomVision: 'Test kingdom vision',
                scrollAlignment: 0.8
            },
            enrollmentData: {
                programType: 'SCROLL_DEGREE',
                startDate: new Date(),
                academicLevel: client_1.AcademicLevel.SCROLL_DEGREE,
                mentorAssignment: testUser.id,
                specialAccommodations: [],
                enrollmentConditions: []
            },
            coursePreferences: ['scroll-foundations-101']
        };
        const completeResult = await studentProfileService.completeStudentIntegration(newTestApplication.id, completeIntegrationData);
        console.log(`✅ Complete integration process successful`);
        console.log(`   - User Role: ${completeResult.user.role}`);
        console.log(`   - Enrollment ID: ${completeResult.enrollment.id}`);
        console.log(`   - Transcript ID: ${completeResult.transcript.id}`);
        console.log(`   - Course Enrollments: ${completeResult.courseEnrollments.length}\n`);
        console.log('🎉 All Student Integration Tests Passed Successfully!\n');
        console.log('🧹 Cleaning up test data...');
        await prisma.admissionDecision.deleteMany({
            where: { applicationId: { in: [testApplication.id, newTestApplication.id] } }
        });
        await prisma.spiritualEvaluation.deleteMany({
            where: { applicationId: { in: [testApplication.id, newTestApplication.id] } }
        });
        await prisma.academicEvaluation.deleteMany({
            where: { applicationId: { in: [testApplication.id, newTestApplication.id] } }
        });
        await prisma.scrollTranscript.deleteMany({
            where: { studentId: { in: [testUser.id, newTestUser.id] } }
        });
        await prisma.enrollment.deleteMany({
            where: { userId: { in: [testUser.id, newTestUser.id] } }
        });
        await prisma.mentorship.deleteMany({
            where: { menteeId: { in: [testUser.id, newTestUser.id] } }
        });
        await prisma.application.deleteMany({
            where: { id: { in: [testApplication.id, newTestApplication.id] } }
        });
        await prisma.user.deleteMany({
            where: { id: { in: [testUser.id, newTestUser.id] } }
        });
        console.log('✅ Test data cleaned up successfully\n');
    }
    catch (error) {
        console.error('❌ Student Integration Validation Failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    validateStudentIntegration()
        .then(() => {
        console.log('✅ Student Integration Validation Completed Successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Student Integration Validation Failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=validate-student-integration.js.map