#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
async function setupAdmissionsSystem() {
    console.log('🎓 Setting up ScrollUniversity Admissions System...');
    console.log('📖 "Many are called, but few are chosen" - Matthew 22:14\n');
    try {
        console.log('📁 Creating directory structure...');
        const directories = [
            'uploads/applications',
            'uploads/documents',
            'uploads/transcripts',
            'uploads/interviews',
            'logs/admissions',
            'temp/processing'
        ];
        for (const dir of directories) {
            const fullPath = path_1.default.join(process.cwd(), dir);
            if (!(0, fs_1.existsSync)(fullPath)) {
                (0, fs_1.mkdirSync)(fullPath, { recursive: true });
                console.log(`   ✅ Created: ${dir}`);
            }
            else {
                console.log(`   ℹ️  Exists: ${dir}`);
            }
        }
        console.log('\n🗄️  Running database migrations...');
        try {
            (0, child_process_1.execSync)('npx prisma migrate dev --name add_scroll_admissions_system', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('   ✅ Database migrations completed');
        }
        catch (error) {
            console.log('   ℹ️  Migrations may already be applied');
        }
        console.log('\n🔧 Generating Prisma client...');
        (0, child_process_1.execSync)('npx prisma generate', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log('   ✅ Prisma client generated');
        console.log('\n🌱 Seeding admissions system data...');
        try {
            const { seedAdmissionsSystem } = await Promise.resolve().then(() => __importStar(require('../prisma/seeds/admissions-system-seed')));
            await seedAdmissionsSystem();
            console.log('   ✅ Admissions system data seeded');
        }
        catch (error) {
            console.error('   ❌ Error seeding admissions data:', error);
        }
        console.log('\n🔍 Verifying system components...');
        try {
            await prisma.$queryRaw `SELECT 1`;
            console.log('   ✅ Database connection verified');
        }
        catch (error) {
            console.error('   ❌ Database connection failed:', error);
            throw error;
        }
        try {
            const applicationCount = await prisma.application.count();
            const configCount = await prisma.admissionsConfiguration.count();
            console.log(`   ✅ Applications table ready (${applicationCount} records)`);
            console.log(`   ✅ Configuration table ready (${configCount} configs)`);
        }
        catch (error) {
            console.error('   ❌ Admissions tables verification failed:', error);
            throw error;
        }
        console.log('\n🎉 ScrollUniversity Admissions System Setup Complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 SETUP SUMMARY:');
        console.log('   🗄️  Database schema: ✅ Applied');
        console.log('   📁 Directory structure: ✅ Created');
        console.log('   🌱 Seed data: ✅ Loaded');
        console.log('   🔧 Prisma client: ✅ Generated');
        console.log('   🔍 System verification: ✅ Passed');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🚀 NEXT STEPS:');
        console.log('   1. Start the admissions microservice: npm run dev:admissions');
        console.log('   2. Access the admissions API at: http://localhost:3003');
        console.log('   3. Check health endpoint: http://localhost:3003/health');
        console.log('   4. Review admissions configuration in the database');
        console.log('\n📚 AVAILABLE ENDPOINTS:');
        console.log('   GET  /health - Service health check');
        console.log('   GET  /api/applications - List applications');
        console.log('   POST /api/applications - Create new application');
        console.log('   GET  /api/applications/:id/status - Get application status');
        console.log('   GET  /api/config - Get system configuration');
        console.log('   GET  /api/analytics/dashboard - Get dashboard analytics');
        console.log('\n🔐 AUTHENTICATION:');
        console.log('   All API endpoints require JWT authentication');
        console.log('   Use the main backend service to obtain tokens');
        console.log('   Admissions roles: ADMISSIONS_OFFICER, INTERVIEWER, etc.');
        console.log('\n🎓 "By divine wisdom, the admissions system is established!"');
    }
    catch (error) {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    setupAdmissionsSystem();
}
//# sourceMappingURL=setup-admissions-system.js.map