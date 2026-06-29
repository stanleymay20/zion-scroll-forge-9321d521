"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAccreditationAuthority = seedAccreditationAuthority;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function seedAccreditationAuthority() {
    console.log('🌱 Seeding ScrollAccreditation Authority data...');
    try {
        const adminPassword = await (0, bcryptjs_1.hash)('ScrollTruth2024!', 12);
        const scrollAccreditationAdmin = await prisma.user.upsert({
            where: { email: 'admin@scrollaccreditation.org' },
            update: {},
            create: {
                email: 'admin@scrollaccreditation.org',
                username: 'scroll_accreditation_admin',
                passwordHash: adminPassword,
                firstName: 'ScrollAccreditation',
                lastName: 'Authority',
                role: 'ADMIN',
                scrollCalling: 'Educational Validation and Global Recognition',
                spiritualGifts: ['Discernment', 'Administration', 'Teaching'],
                kingdomVision: 'Establishing truth-governed education that transforms nations',
                scrollAlignment: 100.0,
                enrollmentStatus: 'ACTIVE',
                academicLevel: 'SCROLL_DOCTORATE'
            }
        });
        const propheticValidators = [
            {
                email: 'prophet.daniel@scrollaccreditation.org',
                username: 'prophet_daniel_validator',
                firstName: 'Daniel',
                lastName: 'ScrollSeer',
                scrollCalling: 'Prophetic Educational Validation',
                spiritualGifts: ['Prophecy', 'Discernment', 'Wisdom', 'Revelation'],
                kingdomVision: 'Ensuring educational alignment with divine scrolls and kingdom principles'
            },
            {
                email: 'prophet.deborah@scrollaccreditation.org',
                username: 'prophet_deborah_validator',
                firstName: 'Deborah',
                lastName: 'ScrollJudge',
                scrollCalling: 'Spiritual Curriculum Assessment',
                spiritualGifts: ['Prophecy', 'Leadership', 'Justice', 'Teaching'],
                kingdomVision: 'Validating educational programs for spiritual integrity and kingdom impact'
            },
            {
                email: 'prophet.samuel@scrollaccreditation.org',
                username: 'prophet_samuel_validator',
                firstName: 'Samuel',
                lastName: 'ScrollWitness',
                scrollCalling: 'Prophetic Defense Evaluation',
                spiritualGifts: ['Prophecy', 'Intercession', 'Discernment'],
                kingdomVision: 'Assessing student spiritual development and prophetic understanding'
            }
        ];
        for (const validator of propheticValidators) {
            await prisma.user.upsert({
                where: { email: validator.email },
                update: {},
                create: {
                    ...validator,
                    passwordHash: adminPassword,
                    role: 'PROPHET',
                    scrollAlignment: 95.0,
                    enrollmentStatus: 'ACTIVE',
                    academicLevel: 'SCROLL_DOCTORATE'
                }
            });
        }
        const dataScienceValidators = [
            {
                email: 'dr.sarah.empirical@scrollaccreditation.org',
                username: 'dr_sarah_data_validator',
                firstName: 'Dr. Sarah',
                lastName: 'EmpiricalExcellence',
                scrollCalling: 'Data Science and Research Validation',
                spiritualGifts: ['Knowledge', 'Wisdom', 'Administration'],
                kingdomVision: 'Ensuring empirical excellence and reproducibility in educational research'
            },
            {
                email: 'dr.michael.statistics@scrollaccreditation.org',
                username: 'dr_michael_stats_validator',
                firstName: 'Dr. Michael',
                lastName: 'StatisticalRigor',
                scrollCalling: 'Statistical Analysis and Methodology Validation',
                spiritualGifts: ['Knowledge', 'Discernment', 'Teaching'],
                kingdomVision: 'Validating research methodology and statistical significance in education'
            },
            {
                email: 'dr.rachel.innovation@scrollaccreditation.org',
                username: 'dr_rachel_innovation_validator',
                firstName: 'Dr. Rachel',
                lastName: 'InnovationMetrics',
                scrollCalling: 'Innovation Scoring and Impact Measurement',
                spiritualGifts: ['Knowledge', 'Creativity', 'Leadership'],
                kingdomVision: 'Measuring and validating innovation impact in educational outcomes'
            }
        ];
        for (const validator of dataScienceValidators) {
            await prisma.user.upsert({
                where: { email: validator.email },
                update: {},
                create: {
                    ...validator,
                    passwordHash: adminPassword,
                    role: 'FACULTY',
                    scrollAlignment: 90.0,
                    enrollmentStatus: 'ACTIVE',
                    academicLevel: 'SCROLL_DOCTORATE'
                }
            });
        }
        const scrollUniversityAccreditation = await prisma.accreditationRecord.upsert({
            where: { id: 'scroll-university-founding-accreditation' },
            update: {},
            create: {
                id: 'scroll-university-founding-accreditation',
                institutionId: 'scroll-university-global',
                applicationDate: new Date('2024-01-01'),
                status: 'APPROVED',
                revelationAssessment: {
                    scriptureAlignment: 100,
                    propheticIntegration: 100,
                    kingdomPrinciples: 100,
                    spiritualObjectives: 100,
                    overallRevelationScore: 100,
                    recommendations: ['Continue excellence in divine scroll integration'],
                    validatorComments: 'Exemplary alignment with kingdom principles and divine revelation'
                },
                empiricalValidation: {
                    dataQuality: 100,
                    reproducibility: 100,
                    ethicalStandards: 100,
                    methodologicalRigor: 100,
                    overallEmpiricalScore: 100,
                    validationEvidence: ['Comprehensive research methodology', 'Peer-reviewed publications'],
                    reviewerNotes: 'Outstanding empirical excellence and research integrity'
                },
                impactAssessment: {
                    educationalImpact: 100,
                    communityTransformation: 100,
                    nationBuilding: 100,
                    globalInfluence: 100,
                    overallImpactScore: 100,
                    impactEvidence: ['Global student enrollment', 'Nation transformation initiatives'],
                    assessmentNotes: 'Demonstrable impact on global education and nation transformation'
                },
                scrollSealValidation: {
                    propheticApproval: true,
                    dataScienceApproval: true,
                    jointConsensus: true,
                    sealIssued: true,
                    sealDate: new Date('2024-01-01'),
                    validationNotes: 'Unanimous approval from both prophetic and data science validators'
                },
                propheticValidators: [
                    { id: 'prophet_daniel_validator', name: 'Daniel ScrollSeer', approvalDate: new Date('2024-01-01') },
                    { id: 'prophet_deborah_validator', name: 'Deborah ScrollJudge', approvalDate: new Date('2024-01-01') },
                    { id: 'prophet_samuel_validator', name: 'Samuel ScrollWitness', approvalDate: new Date('2024-01-01') }
                ],
                dataScienceValidators: [
                    { id: 'dr_sarah_data_validator', name: 'Dr. Sarah EmpiricalExcellence', approvalDate: new Date('2024-01-01') },
                    { id: 'dr_michael_stats_validator', name: 'Dr. Michael StatisticalRigor', approvalDate: new Date('2024-01-01') },
                    { id: 'dr_rachel_innovation_validator', name: 'Dr. Rachel InnovationMetrics', approvalDate: new Date('2024-01-01') }
                ],
                accreditationDecision: {
                    decision: 'APPROVED',
                    decisionDate: new Date('2024-01-01'),
                    validityPeriod: '10 years',
                    conditions: [],
                    recommendations: ['Continue excellence in all areas', 'Expand global reach'],
                    decisionRationale: 'ScrollUniversity demonstrates exceptional alignment with both divine revelation and empirical excellence'
                },
                certificateHash: 'scroll-university-founding-certificate-hash-2024',
                validityPeriod: {
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2034-01-01'),
                    renewalRequired: new Date('2033-01-01')
                },
                validationHistory: [
                    {
                        date: new Date('2024-01-01'),
                        action: 'Initial Application Submitted',
                        validator: 'ScrollAccreditation Authority',
                        notes: 'Comprehensive application with all required documentation'
                    },
                    {
                        date: new Date('2024-01-01'),
                        action: 'Prophetic Validation Completed',
                        validator: 'Prophetic Validation Team',
                        notes: 'Unanimous approval for spiritual alignment and kingdom principles'
                    },
                    {
                        date: new Date('2024-01-01'),
                        action: 'Data Science Validation Completed',
                        validator: 'Data Science Validation Team',
                        notes: 'Exceptional empirical excellence and research methodology'
                    },
                    {
                        date: new Date('2024-01-01'),
                        action: 'ScrollSeal Issued',
                        validator: 'Joint Validation Authority',
                        notes: 'Certificate of accreditation issued with full approval'
                    }
                ]
            }
        });
        const employerPartnerships = [
            {
                organizationName: 'United Nations Educational Initiative',
                partnershipType: 'MULTINATIONAL',
                industry: 'International Development',
                organizationSize: 'Large (10,000+ employees)',
                locations: [
                    { country: 'United States', city: 'New York', region: 'North America' },
                    { country: 'Switzerland', city: 'Geneva', region: 'Europe' },
                    { country: 'Kenya', city: 'Nairobi', region: 'Africa' }
                ],
                talentRequirements: [
                    { skill: 'Global Policy Development', level: 'Expert', priority: 'High' },
                    { skill: 'Cross-Cultural Communication', level: 'Advanced', priority: 'High' },
                    { skill: 'Educational Technology', level: 'Intermediate', priority: 'Medium' }
                ],
                researchAccess: {
                    level: 'Premium',
                    categories: ['Global Education', 'Policy Research', 'Cultural Studies'],
                    earlyAccess: true
                }
            },
            {
                organizationName: 'Kingdom Healthcare Innovations',
                partnershipType: 'STARTUP',
                industry: 'Healthcare Technology',
                organizationSize: 'Medium (100-1000 employees)',
                locations: [
                    { country: 'Nigeria', city: 'Lagos', region: 'West Africa' },
                    { country: 'Ghana', city: 'Accra', region: 'West Africa' }
                ],
                talentRequirements: [
                    { skill: 'AI in Healthcare', level: 'Expert', priority: 'High' },
                    { skill: 'Prophetic Healing Integration', level: 'Advanced', priority: 'High' },
                    { skill: 'Mobile Health Applications', level: 'Advanced', priority: 'Medium' }
                ],
                researchAccess: {
                    level: 'Standard',
                    categories: ['Healthcare AI', 'Prophetic Healing', 'Mobile Technology'],
                    earlyAccess: false
                }
            },
            {
                organizationName: 'Global Justice Reform Network',
                partnershipType: 'NGO',
                industry: 'Social Justice',
                organizationSize: 'Small (10-100 employees)',
                locations: [
                    { country: 'South Africa', city: 'Cape Town', region: 'Southern Africa' },
                    { country: 'Brazil', city: 'São Paulo', region: 'South America' }
                ],
                talentRequirements: [
                    { skill: 'Justice System Reform', level: 'Expert', priority: 'High' },
                    { skill: 'Community Organizing', level: 'Advanced', priority: 'High' },
                    { skill: 'Policy Analysis', level: 'Intermediate', priority: 'Medium' }
                ],
                researchAccess: {
                    level: 'Basic',
                    categories: ['Justice Reform', 'Community Development', 'Policy Research'],
                    earlyAccess: false
                }
            }
        ];
        for (const partnership of employerPartnerships) {
            await prisma.employerPartnership.create({
                data: {
                    ...partnership,
                    hiringSuccessMetrics: {
                        totalHires: 0,
                        retentionRate: 0,
                        performanceRating: 0,
                        graduateSatisfaction: 0
                    },
                    partnershipSatisfaction: {
                        overallRating: 0,
                        talentQuality: 0,
                        collaborationExperience: 0,
                        researchValue: 0
                    }
                }
            });
        }
        const researchProjects = [
            {
                teamId: 'scroll-ai-ethics-team',
                institutionId: 'scroll-university-global',
                accreditationId: scrollUniversityAccreditation.id,
                title: 'AI Ethics in Global Education: Integrating Prophetic Wisdom with Data Science',
                researchProblem: {
                    statement: 'How can AI systems in education be designed to honor both empirical excellence and divine wisdom?',
                    significance: 'Critical for ensuring AI serves kingdom purposes in education',
                    scope: 'Global educational AI systems',
                    methodology: 'Mixed methods with prophetic insight integration'
                },
                methodology: {
                    approach: 'Hybrid Prophetic-Empirical Research',
                    dataCollection: ['Surveys', 'Interviews', 'Prophetic Insights', 'Statistical Analysis'],
                    analysisFramework: 'Kingdom-Centered AI Ethics Framework'
                },
                realWorldDataSources: [
                    { source: 'UNESCO Education Statistics', type: 'Global Education Data' },
                    { source: 'AI Ethics Research Database', type: 'Academic Literature' },
                    { source: 'ScrollUniversity Student Data', type: 'Educational Outcomes' }
                ],
                propheticInsights: [
                    {
                        source: 'Prophetic Council',
                        insight: 'AI must serve to amplify divine wisdom, not replace it',
                        relevance: 'High',
                        applicationGuidance: 'Design AI systems with built-in spiritual discernment'
                    }
                ],
                status: 'ACTIVE'
            }
        ];
        for (const project of researchProjects) {
            await prisma.researchProject.create({
                data: project
            });
        }
        console.log('✅ ScrollAccreditation Authority seed data created successfully');
        console.log(`📊 Created:`);
        console.log(`   - 1 ScrollAccreditation Authority admin`);
        console.log(`   - 3 Prophetic validators`);
        console.log(`   - 3 Data science validators`);
        console.log(`   - 1 Founding accreditation record`);
        console.log(`   - ${employerPartnerships.length} Employer partnerships`);
        console.log(`   - ${researchProjects.length} Research projects`);
    }
    catch (error) {
        console.error('❌ Error seeding accreditation authority data:', error);
        throw error;
    }
}
async function main() {
    try {
        await seedAccreditationAuthority();
    }
    catch (error) {
        console.error('Seed script failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=accreditation-authority-seed.js.map