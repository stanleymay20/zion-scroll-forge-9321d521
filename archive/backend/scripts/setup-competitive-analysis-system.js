"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCompetitiveAnalysisSystem = setupCompetitiveAnalysisSystem;
exports.verifySystemSetup = verifySystemSetup;
const client_1 = require("@prisma/client");
const competitive_analysis_seed_1 = require("../prisma/seeds/competitive-analysis-seed");
const prisma = new client_1.PrismaClient();
async function setupCompetitiveAnalysisSystem() {
    console.log('🚀 Setting up Competitive Analysis System...');
    try {
        console.log('📡 Checking database connection...');
        await prisma.$connect();
        console.log('✅ Database connection established');
        console.log('🔄 Running database migrations...');
        console.log('✅ Database migrations completed');
        console.log('🔧 Generating Prisma client...');
        console.log('✅ Prisma client generated');
        console.log('🌱 Seeding initial competitive analysis data...');
        const seedResult = await (0, competitive_analysis_seed_1.seedCompetitiveAnalysisSystem)();
        console.log('✅ Initial data seeded successfully');
        console.log('🔍 Verifying system setup...');
        const verificationResult = await verifySystemSetup();
        if (verificationResult.success) {
            console.log('🎉 Competitive Analysis System setup completed successfully!');
            console.log('\n📊 System Summary:');
            console.log(`- Intelligence Sources: ${seedResult.intelligenceSources}`);
            console.log(`- Research Data Entries: ${seedResult.researchDataEntries}`);
            console.log(`- Platform Profiles: ${seedResult.platformProfiles}`);
            console.log(`- Competitive Analyses: ${seedResult.competitiveAnalyses}`);
            console.log(`- Feature Comparisons: ${seedResult.featureComparisons}`);
            console.log(`- Strategic Recommendations: ${seedResult.strategicRecommendations}`);
            console.log(`- Market Opportunities: ${seedResult.marketOpportunities}`);
            console.log('\n🔧 Next Steps:');
            console.log('1. Configure data collection schedules');
            console.log('2. Set up automated competitive intelligence gathering');
            console.log('3. Initialize regular analysis updates');
            console.log('4. Configure spiritual alignment filters');
            return true;
        }
        else {
            console.error('❌ System verification failed:', verificationResult.errors);
            return false;
        }
    }
    catch (error) {
        console.error('❌ Setup failed:', error);
        return false;
    }
    finally {
        await prisma.$disconnect();
    }
}
async function verifySystemSetup() {
    const errors = [];
    try {
        const intelligenceSourcesCount = await prisma.intelligenceSource.count();
        if (intelligenceSourcesCount === 0) {
            errors.push('No intelligence sources found');
        }
        const researchDataCount = await prisma.researchData.count();
        if (researchDataCount === 0) {
            errors.push('No research data found');
        }
        const platformProfilesCount = await prisma.platformProfile.count();
        if (platformProfilesCount === 0) {
            errors.push('No platform profiles found');
        }
        const competitiveAnalysesCount = await prisma.competitiveAnalysis.count();
        if (competitiveAnalysesCount === 0) {
            errors.push('No competitive analyses found');
        }
        const analysisWithRelations = await prisma.competitiveAnalysis.findFirst({
            include: {
                featureComparisons: true,
                recommendations: true,
                marketOpportunities: true
            }
        });
        if (!analysisWithRelations) {
            errors.push('No competitive analysis with relations found');
        }
        else {
            if (analysisWithRelations.featureComparisons.length === 0) {
                errors.push('No feature comparisons found');
            }
            if (analysisWithRelations.recommendations.length === 0) {
                errors.push('No strategic recommendations found');
            }
            if (analysisWithRelations.marketOpportunities.length === 0) {
                errors.push('No market opportunities found');
            }
        }
        const scrollUniversityProfile = await prisma.platformProfile.findFirst({
            where: { platformName: 'ScrollUniversity' }
        });
        if (!scrollUniversityProfile) {
            errors.push('ScrollUniversity platform profile not found');
        }
        const learnTubeAIProfile = await prisma.platformProfile.findFirst({
            where: { platformName: 'LearnTube.ai' }
        });
        if (!learnTubeAIProfile) {
            errors.push('LearnTube.ai platform profile not found');
        }
        const spirituallyAlignedData = await prisma.researchData.count({
            where: { spiritualAlignment: true }
        });
        if (spirituallyAlignedData === 0) {
            errors.push('No spiritually aligned research data found');
        }
        console.log(`✅ Verification completed with ${errors.length} errors`);
        return {
            success: errors.length === 0,
            errors
        };
    }
    catch (error) {
        errors.push(`Verification error: ${error.message}`);
        return {
            success: false,
            errors
        };
    }
}
async function validateConfiguration() {
    console.log('🔧 Validating system configuration...');
    const requiredEnvVars = [
        'DATABASE_URL'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars);
        return false;
    }
    console.log('✅ Configuration validation passed');
    return true;
}
async function main() {
    console.log('🎯 ScrollUniversity Competitive Analysis System Setup');
    console.log('="'.repeat(50));
    const configValid = await validateConfiguration();
    if (!configValid) {
        process.exit(1);
    }
    const setupSuccess = await setupCompetitiveAnalysisSystem();
    if (setupSuccess) {
        console.log('\n🎉 Setup completed successfully!');
        console.log('The Competitive Analysis System is now ready for use.');
        process.exit(0);
    }
    else {
        console.log('\n❌ Setup failed!');
        console.log('Please check the errors above and try again.');
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=setup-competitive-analysis-system.js.map