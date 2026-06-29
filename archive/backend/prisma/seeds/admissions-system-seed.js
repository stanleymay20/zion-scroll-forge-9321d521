"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmissionsSystem = seedAdmissionsSystem;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seedAdmissionsSystem() {
    console.log('🎓 Seeding ScrollUniversity Admissions System...');
    try {
        const admissionsConfigs = [
            {
                configKey: 'application_deadline_days',
                configValue: { value: 30 },
                description: 'Number of days before program start that applications close',
                category: client_1.ConfigCategory.APPLICATION_SETTINGS
            },
            {
                configKey: 'max_applications_per_user',
                configValue: { value: 3 },
                description: 'Maximum number of applications a user can submit per year',
                category: client_1.ConfigCategory.APPLICATION_SETTINGS
            },
            {
                configKey: 'required_documents',
                configValue: {
                    SCROLL_OPEN: ['personal_statement', 'spiritual_testimony'],
                    SCROLL_STARTER: ['personal_statement', 'spiritual_testimony', 'academic_transcript'],
                    SCROLL_DEGREE: ['personal_statement', 'spiritual_testimony', 'academic_transcript', 'character_references'],
                    SCROLL_DOCTORATE: ['personal_statement', 'spiritual_testimony', 'academic_transcript', 'character_references', 'research_proposal'],
                    SCROLL_SCHOLARSHIP: ['personal_statement', 'spiritual_testimony', 'academic_transcript', 'character_references', 'financial_need_statement']
                },
                description: 'Required documents for each program type',
                category: client_1.ConfigCategory.APPLICATION_SETTINGS
            },
            {
                configKey: 'spiritual_evaluation_weights',
                configValue: {
                    authenticity: 0.25,
                    clarity: 0.20,
                    depth: 0.20,
                    transformation: 0.20,
                    kingdom_focus: 0.15
                },
                description: 'Weights for spiritual evaluation scoring components',
                category: client_1.ConfigCategory.ASSESSMENT_CRITERIA
            },
            {
                configKey: 'academic_evaluation_weights',
                configValue: {
                    academic_readiness: 0.40,
                    skill_proficiency: 0.30,
                    learning_potential: 0.30
                },
                description: 'Weights for academic evaluation scoring components',
                category: client_1.ConfigCategory.ASSESSMENT_CRITERIA
            },
            {
                configKey: 'minimum_scores',
                configValue: {
                    spiritual_evaluation: 70.0,
                    academic_evaluation: 65.0,
                    interview_overall: 70.0
                },
                description: 'Minimum scores required for admission consideration',
                category: client_1.ConfigCategory.ASSESSMENT_CRITERIA
            },
            {
                configKey: 'interview_types_by_program',
                configValue: {
                    SCROLL_OPEN: ['INITIAL_SCREENING'],
                    SCROLL_STARTER: ['INITIAL_SCREENING', 'SPIRITUAL_EVALUATION'],
                    SCROLL_DEGREE: ['INITIAL_SCREENING', 'SPIRITUAL_EVALUATION', 'ACADEMIC_ASSESSMENT'],
                    SCROLL_DOCTORATE: ['INITIAL_SCREENING', 'SPIRITUAL_EVALUATION', 'ACADEMIC_ASSESSMENT', 'COMMITTEE_INTERVIEW'],
                    SCROLL_SCHOLARSHIP: ['INITIAL_SCREENING', 'SPIRITUAL_EVALUATION', 'ACADEMIC_ASSESSMENT', 'FINAL_INTERVIEW']
                },
                description: 'Required interview types for each program',
                category: client_1.ConfigCategory.INTERVIEW_CONFIGURATION
            },
            {
                configKey: 'interview_duration_minutes',
                configValue: {
                    INITIAL_SCREENING: 30,
                    SPIRITUAL_EVALUATION: 45,
                    ACADEMIC_ASSESSMENT: 60,
                    CHARACTER_INTERVIEW: 30,
                    FINAL_INTERVIEW: 45,
                    COMMITTEE_INTERVIEW: 90
                },
                description: 'Standard duration for each interview type',
                category: client_1.ConfigCategory.INTERVIEW_CONFIGURATION
            },
            {
                configKey: 'admission_decision_weights',
                configValue: {
                    spiritual_evaluation: 0.35,
                    academic_evaluation: 0.30,
                    interview_results: 0.25,
                    character_assessment: 0.10
                },
                description: 'Weights for final admission decision calculation',
                category: client_1.ConfigCategory.DECISION_PARAMETERS
            },
            {
                configKey: 'enrollment_capacity',
                configValue: {
                    SCROLL_OPEN: 1000,
                    SCROLL_STARTER: 500,
                    SCROLL_DEGREE: 200,
                    SCROLL_DOCTORATE: 50,
                    SCROLL_SCHOLARSHIP: 100
                },
                description: 'Maximum enrollment capacity for each program',
                category: client_1.ConfigCategory.DECISION_PARAMETERS
            },
            {
                configKey: 'waitlist_capacity_percentage',
                configValue: { value: 150 },
                description: 'Waitlist capacity as percentage of enrollment capacity',
                category: client_1.ConfigCategory.DECISION_PARAMETERS
            },
            {
                configKey: 'notification_templates',
                configValue: {
                    application_received: {
                        subject: 'Application Received - ScrollUniversity',
                        template: 'application_received'
                    },
                    assessment_complete: {
                        subject: 'Assessment Complete - Next Steps',
                        template: 'assessment_complete'
                    },
                    interview_scheduled: {
                        subject: 'Interview Scheduled - ScrollUniversity Admissions',
                        template: 'interview_scheduled'
                    },
                    decision_accepted: {
                        subject: 'Congratulations! Admission Offer - ScrollUniversity',
                        template: 'decision_accepted'
                    },
                    decision_rejected: {
                        subject: 'Admission Decision - ScrollUniversity',
                        template: 'decision_rejected'
                    },
                    decision_waitlisted: {
                        subject: 'Waitlist Status - ScrollUniversity',
                        template: 'decision_waitlisted'
                    }
                },
                description: 'Email notification templates for admissions process',
                category: client_1.ConfigCategory.NOTIFICATION_SETTINGS
            },
            {
                configKey: 'notification_timing',
                configValue: {
                    application_received: 'immediate',
                    assessment_reminder: '7_days',
                    interview_reminder: '24_hours',
                    decision_notification: 'immediate',
                    enrollment_deadline_reminder: '7_days'
                },
                description: 'Timing for automated notifications',
                category: client_1.ConfigCategory.NOTIFICATION_SETTINGS
            },
            {
                configKey: 'ai_assessment_models',
                configValue: {
                    spiritual_evaluation: 'gpt-4o',
                    academic_evaluation: 'gpt-4o',
                    document_verification: 'claude-3-sonnet',
                    fraud_detection: 'gpt-4o'
                },
                description: 'AI models used for different assessment types',
                category: client_1.ConfigCategory.SYSTEM_PARAMETERS
            },
            {
                configKey: 'document_storage_settings',
                configValue: {
                    max_file_size_mb: 10,
                    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'png'],
                    retention_period_years: 7,
                    encryption_enabled: true
                },
                description: 'Document storage and security settings',
                category: client_1.ConfigCategory.SYSTEM_PARAMETERS
            },
            {
                configKey: 'cache_settings',
                configValue: {
                    application_status_ttl: 3600,
                    assessment_results_ttl: 86400,
                    interview_schedule_ttl: 7200,
                    analytics_ttl: 21600
                },
                description: 'Redis cache TTL settings in seconds',
                category: client_1.ConfigCategory.SYSTEM_PARAMETERS
            }
        ];
        for (const config of admissionsConfigs) {
            await prisma.admissionsConfiguration.upsert({
                where: { configKey: config.configKey },
                update: {
                    configValue: config.configValue,
                    description: config.description,
                    category: config.category,
                    updatedAt: new Date()
                },
                create: config
            });
        }
        console.log(`✅ Created ${admissionsConfigs.length} admissions configuration entries`);
        const sampleAnalytics = {
            reportType: 'DAILY_SUMMARY',
            totalApplications: 0,
            acceptanceRate: 0.0,
            yieldRate: 0.0,
            demographicBreakdown: {
                age_groups: {
                    '18-25': 0,
                    '26-35': 0,
                    '36-45': 0,
                    '46+': 0
                },
                gender: {
                    male: 0,
                    female: 0,
                    other: 0
                }
            },
            geographicDistribution: {
                continents: {
                    'North America': 0,
                    'South America': 0,
                    'Europe': 0,
                    'Asia': 0,
                    'Africa': 0,
                    'Oceania': 0
                }
            },
            averageScores: {
                spiritual_evaluation: 0.0,
                academic_evaluation: 0.0,
                interview_overall: 0.0
            },
            assessmentTrends: {
                weekly_applications: [],
                monthly_decisions: []
            },
            processEfficiency: {
                average_processing_time_days: 0,
                bottlenecks: []
            },
            reportData: {
                generated_at: new Date().toISOString(),
                data_source: 'admissions_system',
                version: '1.0.0'
            }
        };
        await prisma.admissionsAnalytics.create({
            data: sampleAnalytics
        });
        console.log('✅ Created initial analytics report');
        console.log('🎓 Admissions system seeding completed successfully!');
    }
    catch (error) {
        console.error('❌ Error seeding admissions system:', error);
        throw error;
    }
}
if (require.main === module) {
    seedAdmissionsSystem()
        .catch((e) => {
        console.error(e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
//# sourceMappingURL=admissions-system-seed.js.map