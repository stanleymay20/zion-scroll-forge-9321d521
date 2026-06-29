#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionsSchemaValidator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../src/utils/logger");
class AdmissionsSchemaValidator {
    constructor() {
        this.results = [];
    }
    async validate() {
        logger_1.logger.info('🔍 Validating ScrollUniversity Admissions System Schema...');
        try {
            await this.validatePrismaSchema();
            await this.validateMigrationFiles();
            await this.validateInfrastructureFiles();
            await this.generateReport();
            return this.results;
        }
        catch (error) {
            logger_1.logger.error('❌ Schema validation failed:', error);
            this.addResult('schema_validation', 'fail', `Schema validation failed: ${error.message}`);
            return this.results;
        }
    }
    async validatePrismaSchema() {
        logger_1.logger.info('📊 Validating Prisma schema...');
        const schemaPath = path_1.default.join(__dirname, '../prisma/schema.prisma');
        if (!fs_1.default.existsSync(schemaPath)) {
            this.addResult('prisma_schema', 'fail', 'Prisma schema file not found');
            return;
        }
        const schemaContent = fs_1.default.readFileSync(schemaPath, 'utf8');
        const requiredModels = [
            'Application',
            'EligibilityAssessment',
            'SpiritualEvaluation',
            'AcademicEvaluation',
            'InterviewRecord',
            'AdmissionDecision',
            'AppealRecord',
            'WaitlistEntry',
            'DocumentVerification'
        ];
        for (const model of requiredModels) {
            if (schemaContent.includes(`model ${model}`)) {
                this.addResult(`model_${model}`, 'pass', `Model ${model} found in schema`);
            }
            else {
                this.addResult(`model_${model}`, 'fail', `Model ${model} not found in schema`);
            }
        }
        const requiredEnums = [
            'ApplicationStatus',
            'ProgramType',
            'AdmissionDecisionType',
            'EligibilityStatus',
            'MaturityLevel',
            'InterviewType',
            'InterviewFormat',
            'RecommendationType'
        ];
        for (const enumType of requiredEnums) {
            if (schemaContent.includes(`enum ${enumType}`)) {
                this.addResult(`enum_${enumType}`, 'pass', `Enum ${enumType} found in schema`);
            }
            else {
                this.addResult(`enum_${enumType}`, 'fail', `Enum ${enumType} not found in schema`);
            }
        }
        const lines = schemaContent.split('\n');
        let braceCount = 0;
        let inModel = false;
        let inEnum = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('model ') || line.startsWith('enum ')) {
                if (line.startsWith('model '))
                    inModel = true;
                if (line.startsWith('enum '))
                    inEnum = true;
            }
            if (line.includes('{'))
                braceCount++;
            if (line.includes('}')) {
                braceCount--;
                if (braceCount === 0) {
                    inModel = false;
                    inEnum = false;
                }
            }
            if (inModel && line.includes('@') && !line.includes('@@') && !line.includes('@id') &&
                !line.includes('@default') && !line.includes('@unique') && !line.includes('@relation') &&
                !line.includes('@map') && !line.includes('@updatedAt')) {
            }
        }
        if (braceCount === 0) {
            this.addResult('schema_syntax', 'pass', 'Schema syntax appears valid (balanced braces)');
        }
        else {
            this.addResult('schema_syntax', 'fail', `Schema syntax error: unbalanced braces (${braceCount})`);
        }
    }
    async validateMigrationFiles() {
        logger_1.logger.info('📁 Validating migration files...');
        const migrationDir = path_1.default.join(__dirname, '../prisma/migrations');
        if (!fs_1.default.existsSync(migrationDir)) {
            this.addResult('migration_directory', 'warning', 'Migration directory not found');
            return;
        }
        const migrationFiles = fs_1.default.readdirSync(migrationDir);
        const admissionsMigrations = migrationFiles.filter(file => file.includes('admissions') || file.includes('add_admissions_system'));
        if (admissionsMigrations.length > 0) {
            this.addResult('admissions_migrations', 'pass', `Found ${admissionsMigrations.length} admissions migration(s)`);
            const infrastructureMigration = migrationFiles.find(file => file.includes('add_admissions_system_infrastructure'));
            if (infrastructureMigration) {
                this.addResult('infrastructure_migration', 'pass', 'Infrastructure migration file found');
                const migrationPath = path_1.default.join(migrationDir, infrastructureMigration, 'migration.sql');
                if (fs_1.default.existsSync(migrationPath)) {
                    const migrationContent = fs_1.default.readFileSync(migrationPath, 'utf8');
                    if (migrationContent.includes('CREATE TABLE applications')) {
                        this.addResult('migration_content', 'pass', 'Migration contains required table creation');
                    }
                    else {
                        this.addResult('migration_content', 'warning', 'Migration may not contain all required tables');
                    }
                }
            }
            else {
                this.addResult('infrastructure_migration', 'warning', 'Infrastructure migration file not found');
            }
        }
        else {
            this.addResult('admissions_migrations', 'warning', 'No admissions migrations found');
        }
    }
    async validateInfrastructureFiles() {
        logger_1.logger.info('🏗️ Validating infrastructure files...');
        const requiredFiles = [
            {
                path: 'src/admissions-server.ts',
                name: 'Admissions Server'
            },
            {
                path: 'src/middleware/admissions-auth.ts',
                name: 'Admissions Authentication'
            },
            {
                path: 'src/config/redis-admissions.config.ts',
                name: 'Redis Configuration'
            },
            {
                path: 'docker/admissions/Dockerfile',
                name: 'Admissions Dockerfile'
            },
            {
                path: 'docker/admissions/docker-compose.admissions.yml',
                name: 'Docker Compose Configuration'
            }
        ];
        for (const file of requiredFiles) {
            const fullPath = path_1.default.join(__dirname, '..', file.path);
            if (fs_1.default.existsSync(fullPath)) {
                this.addResult(`file_${file.name.replace(/\s+/g, '_').toLowerCase()}`, 'pass', `${file.name} file exists`);
                const content = fs_1.default.readFileSync(fullPath, 'utf8');
                if (file.path.includes('admissions-server.ts')) {
                    if (content.includes('express') && content.includes('admissionsAuth')) {
                        this.addResult('server_content', 'pass', 'Admissions server has required dependencies');
                    }
                    else {
                        this.addResult('server_content', 'warning', 'Admissions server may be missing dependencies');
                    }
                }
                if (file.path.includes('admissions-auth.ts')) {
                    if (content.includes('AdmissionsRole') && content.includes('AdmissionsPermission')) {
                        this.addResult('auth_content', 'pass', 'Authentication middleware has required roles and permissions');
                    }
                    else {
                        this.addResult('auth_content', 'warning', 'Authentication middleware may be incomplete');
                    }
                }
                if (file.path.includes('redis-admissions.config.ts')) {
                    if (content.includes('ioredis') && content.includes('AdmissionsRedisClient')) {
                        this.addResult('redis_content', 'pass', 'Redis configuration has required components');
                    }
                    else {
                        this.addResult('redis_content', 'warning', 'Redis configuration may be incomplete');
                    }
                }
            }
            else {
                this.addResult(`file_${file.name.replace(/\s+/g, '_').toLowerCase()}`, 'fail', `${file.name} file not found`);
            }
        }
        const packageJsonPath = path_1.default.join(__dirname, '../package.json');
        if (fs_1.default.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
            const requiredScripts = [
                'admissions:infrastructure',
                'admissions:validate',
                'admissions:dev',
                'admissions:start'
            ];
            let scriptsFound = 0;
            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    scriptsFound++;
                }
            }
            if (scriptsFound === requiredScripts.length) {
                this.addResult('package_scripts', 'pass', 'All required npm scripts found');
            }
            else {
                this.addResult('package_scripts', 'warning', `${scriptsFound}/${requiredScripts.length} required scripts found`);
            }
            const requiredDeps = ['ioredis', 'compression'];
            let depsFound = 0;
            for (const dep of requiredDeps) {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    depsFound++;
                }
            }
            if (depsFound === requiredDeps.length) {
                this.addResult('package_dependencies', 'pass', 'All required dependencies found');
            }
            else {
                this.addResult('package_dependencies', 'warning', `${depsFound}/${requiredDeps.length} required dependencies found`);
            }
        }
    }
    async generateReport() {
        logger_1.logger.info('📋 Generating validation report...');
        const passCount = this.results.filter(r => r.status === 'pass').length;
        const failCount = this.results.filter(r => r.status === 'fail').length;
        const warningCount = this.results.filter(r => r.status === 'warning').length;
        const totalCount = this.results.length;
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: totalCount,
                passed: passCount,
                failed: failCount,
                warnings: warningCount,
                success_rate: Math.round((passCount / totalCount) * 100)
            },
            results: this.results
        };
        const logsDir = path_1.default.join(__dirname, '../logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        const reportPath = path_1.default.join(logsDir, 'admissions-schema-validation-report.json');
        fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        logger_1.logger.info(`📊 Schema Validation Summary:`);
        logger_1.logger.info(`   Total checks: ${totalCount}`);
        logger_1.logger.info(`   ✅ Passed: ${passCount}`);
        logger_1.logger.info(`   ❌ Failed: ${failCount}`);
        logger_1.logger.info(`   ⚠️  Warnings: ${warningCount}`);
        logger_1.logger.info(`   Success rate: ${report.summary.success_rate}%`);
        logger_1.logger.info(`   Report saved to: ${reportPath}`);
        if (failCount > 0) {
            logger_1.logger.error('❌ Some validation checks failed. Please review the report.');
            this.results.filter(r => r.status === 'fail').forEach(result => {
                logger_1.logger.error(`   - ${result.component}: ${result.message}`);
            });
        }
        else {
            logger_1.logger.info('✅ All critical validation checks passed!');
        }
    }
    addResult(component, status, message) {
        this.results.push({ component, status, message });
    }
}
exports.AdmissionsSchemaValidator = AdmissionsSchemaValidator;
async function main() {
    const validator = new AdmissionsSchemaValidator();
    try {
        const results = await validator.validate();
        const failCount = results.filter(r => r.status === 'fail').length;
        if (failCount > 0) {
            process.exit(1);
        }
        else {
            process.exit(0);
        }
    }
    catch (error) {
        logger_1.logger.error('Schema validation failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
exports.default = AdmissionsSchemaValidator;
//# sourceMappingURL=validate-admissions-schema.js.map