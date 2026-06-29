#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionsQARunner = void 0;
const AdmissionsTestConfiguration_1 = require("../src/services/testing/AdmissionsTestConfiguration");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class AdmissionsQARunner {
    constructor(options) {
        this.options = options;
    }
    async run() {
        console.log('🎓 ScrollUniversity Admissions Quality Assurance');
        console.log('================================================');
        console.log(`Environment: ${this.options.environment}`);
        console.log(`Test Suites: ${this.options.suites.join(', ')}`);
        console.log('');
        try {
            const qaFramework = AdmissionsTestConfiguration_1.AdmissionsTestConfiguration.createQAFramework(this.options.environment);
            this.setupEventListeners(qaFramework);
            let results;
            if (this.options.suites.includes('all')) {
                console.log('🚀 Running full quality assurance suite...');
                results = await qaFramework.runFullQualityAssurance();
            }
            else {
                console.log('🔧 Running selected test suites...');
                results = await this.runSelectedSuites(qaFramework);
            }
            this.displayResults(results);
            if (this.options.generateReports) {
                await this.generateReports(results);
            }
            if (this.options.output) {
                await this.saveResults(results);
            }
            const exitCode = results.qualityGate === 'passed' ? 0 : 1;
            process.exit(exitCode);
        }
        catch (error) {
            console.error('❌ Quality assurance failed:', error.message);
            if (this.options.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
    async runSelectedSuites(qaFramework) {
        return await qaFramework.runFullQualityAssurance();
    }
    setupEventListeners(qaFramework) {
        qaFramework.on('qaStart', () => {
            console.log('🔄 Starting quality assurance...');
        });
        qaFramework.on('phaseStart', (phase) => {
            const phaseNames = {
                'unit-testing': '🧪 Unit Testing',
                'integration-testing': '🔗 Integration Testing',
                'performance-testing': '⚡ Performance Testing',
                'user-acceptance-testing': '👥 User Acceptance Testing',
                'validation': '✅ Validation Rules'
            };
            console.log(`${phaseNames[phase] || phase}...`);
        });
        qaFramework.on('phaseComplete', (phase, results) => {
            if (this.options.verbose) {
                console.log(`  ✓ ${phase} completed`);
            }
        });
        qaFramework.on('scenarioStart', (scenario) => {
            if (this.options.verbose) {
                console.log(`  🔄 Running scenario: ${scenario}`);
            }
        });
        qaFramework.on('scenarioComplete', (scenario, result) => {
            if (this.options.verbose) {
                const status = result.success || result.passed ? '✅' : '❌';
                console.log(`  ${status} ${scenario}`);
            }
        });
        qaFramework.on('validationComplete', (ruleName, result) => {
            if (this.options.verbose) {
                const status = result.passed ? '✅' : '❌';
                console.log(`  ${status} ${ruleName}: ${result.message}`);
            }
        });
        qaFramework.on('qaComplete', (results) => {
            console.log('🎉 Quality assurance completed!');
        });
        qaFramework.on('qaError', (error) => {
            console.error('❌ Quality assurance error:', error.message);
        });
    }
    displayResults(results) {
        console.log('');
        console.log('📊 Quality Assurance Results');
        console.log('============================');
        console.log(`Overall Score: ${results.overallScore.toFixed(1)}/100`);
        console.log(`Quality Gate: ${this.getQualityGateEmoji(results.qualityGate)} ${results.qualityGate.toUpperCase()}`);
        console.log('');
        console.log('🧪 Unit Tests:');
        console.log(`  Total: ${results.unitTestResults.totalTests}`);
        console.log(`  Passed: ${results.unitTestResults.totalPassed}`);
        console.log(`  Failed: ${results.unitTestResults.totalFailed}`);
        console.log(`  Coverage: ${results.unitTestResults.coverage}%`);
        console.log(`  Success Rate: ${results.unitTestResults.successRate.toFixed(1)}%`);
        console.log('');
        console.log('🔗 Integration Tests:');
        console.log(`  Scenarios: ${results.integrationTestResults.scenarios.length}`);
        console.log(`  Success: ${results.integrationTestResults.overallSuccess ? 'Yes' : 'No'}`);
        console.log(`  Duration: ${results.integrationTestResults.totalDuration}ms`);
        console.log('');
        console.log('⚡ Performance Tests:');
        console.log(`  Score: ${results.performanceTestResults.overallScore.toFixed(1)}/100`);
        console.log(`  Avg Response Time: ${results.performanceTestResults.averageResponseTime}ms`);
        console.log(`  Throughput: ${results.performanceTestResults.throughput.toFixed(1)} req/s`);
        console.log(`  Error Rate: ${results.performanceTestResults.errorRate.toFixed(2)}%`);
        console.log('');
        console.log('👥 User Acceptance Tests:');
        console.log(`  Scenarios: ${results.userAcceptanceTestResults.scenarios.length}`);
        console.log(`  Success: ${results.userAcceptanceTestResults.overallSuccess ? 'Yes' : 'No'}`);
        console.log(`  Screenshots: ${results.userAcceptanceTestResults.screenshots.length}`);
        console.log('');
        console.log('✅ Validation Rules:');
        const passedValidations = Array.from(results.validationResults.values()).filter(v => v.passed).length;
        const totalValidations = results.validationResults.size;
        console.log(`  Passed: ${passedValidations}/${totalValidations}`);
        if (this.options.verbose) {
            for (const [ruleName, result] of results.validationResults.entries()) {
                const status = result.passed ? '✅' : '❌';
                console.log(`  ${status} ${ruleName}: ${result.message}`);
            }
        }
        console.log('');
        if (results.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            results.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
            console.log('');
        }
        if (results.artifacts.length > 0) {
            console.log('📁 Generated Artifacts:');
            results.artifacts.forEach(artifact => {
                console.log(`  ${artifact.type}: ${artifact.name}`);
            });
            console.log('');
        }
    }
    getQualityGateEmoji(status) {
        switch (status) {
            case 'passed': return '✅';
            case 'warning': return '⚠️';
            case 'failed': return '❌';
            default: return '❓';
        }
    }
    async generateReports(results) {
        console.log('📄 Generating reports...');
        const reportsDir = './test-reports';
        await this.ensureDirectoryExists(reportsDir);
        const jsonReport = {
            ...results,
            validationResults: Object.fromEntries(results.validationResults)
        };
        await fs_1.promises.writeFile(path_1.default.join(reportsDir, 'qa-report.json'), JSON.stringify(jsonReport, null, 2));
        const htmlReport = this.generateHtmlReport(results);
        await fs_1.promises.writeFile(path_1.default.join(reportsDir, 'qa-report.html'), htmlReport);
        console.log(`📄 Reports generated in ${reportsDir}/`);
    }
    generateHtmlReport(results) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ScrollUniversity Admissions QA Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9e9e9; border-radius: 3px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        .section { margin: 20px 0; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ScrollUniversity Admissions Quality Assurance Report</h1>
        <p>Generated: ${results.timestamp.toISOString()}</p>
        <p>Environment: ${results.environment}</p>
        <p>Version: ${results.version}</p>
    </div>

    <div class="section">
        <h2>Overall Results</h2>
        <div class="metric">
            <strong>Overall Score:</strong> ${results.overallScore.toFixed(1)}/100
        </div>
        <div class="metric">
            <strong>Quality Gate:</strong> 
            <span class="${results.qualityGate}">${results.qualityGate.toUpperCase()}</span>
        </div>
    </div>

    <div class="section">
        <h2>Test Results Summary</h2>
        <h3>Unit Tests</h3>
        <div class="metric">Total: ${results.unitTestResults.totalTests}</div>
        <div class="metric">Passed: ${results.unitTestResults.totalPassed}</div>
        <div class="metric">Failed: ${results.unitTestResults.totalFailed}</div>
        <div class="metric">Coverage: ${results.unitTestResults.coverage}%</div>

        <h3>Integration Tests</h3>
        <div class="metric">Scenarios: ${results.integrationTestResults.scenarios.length}</div>
        <div class="metric">Success: ${results.integrationTestResults.overallSuccess ? 'Yes' : 'No'}</div>

        <h3>Performance Tests</h3>
        <div class="metric">Score: ${results.performanceTestResults.overallScore.toFixed(1)}/100</div>
        <div class="metric">Avg Response: ${results.performanceTestResults.averageResponseTime}ms</div>
        <div class="metric">Error Rate: ${results.performanceTestResults.errorRate.toFixed(2)}%</div>

        <h3>User Acceptance Tests</h3>
        <div class="metric">Scenarios: ${results.userAcceptanceTestResults.scenarios.length}</div>
        <div class="metric">Success: ${results.userAcceptanceTestResults.overallSuccess ? 'Yes' : 'No'}</div>
    </div>

    ${results.recommendations.length > 0 ? `
    <div class="section recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>
    `;
    }
    async saveResults(results) {
        const outputPath = this.options.output;
        await this.ensureDirectoryExists(path_1.default.dirname(outputPath));
        const outputData = {
            ...results,
            validationResults: Object.fromEntries(results.validationResults)
        };
        await fs_1.promises.writeFile(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`💾 Results saved to ${outputPath}`);
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await fs_1.promises.access(dirPath);
        }
        catch {
            await fs_1.promises.mkdir(dirPath, { recursive: true });
        }
    }
}
exports.AdmissionsQARunner = AdmissionsQARunner;
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        environment: 'development',
        suites: ['all'],
        verbose: false,
        failFast: false,
        generateReports: false
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--environment':
            case '-e':
                options.environment = args[++i];
                break;
            case '--suites':
            case '-s':
                options.suites = args[++i].split(',');
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--fail-fast':
            case '-f':
                options.failFast = true;
                break;
            case '--reports':
            case '-r':
                options.generateReports = true;
                break;
            case '--help':
            case '-h':
                printUsage();
                process.exit(0);
                break;
        }
    }
    return options;
}
function printUsage() {
    console.log(`
ScrollUniversity Admissions Quality Assurance Runner

Usage: ts-node run-admissions-qa.ts [options]

Options:
  -e, --environment <env>    Environment: development, production, ci-cd (default: development)
  -s, --suites <suites>      Test suites: unit,integration,performance,uat,all (default: all)
  -o, --output <file>        Output file for results (JSON format)
  -v, --verbose              Verbose output
  -f, --fail-fast            Stop on first failure
  -r, --reports              Generate HTML and other reports
  -h, --help                 Show this help message

Examples:
  ts-node run-admissions-qa.ts                                    # Run all tests in development
  ts-node run-admissions-qa.ts -e production -r                   # Run all tests in production with reports
  ts-node run-admissions-qa.ts -s unit,integration -v             # Run specific suites with verbose output
  ts-node run-admissions-qa.ts -e ci-cd -o results.json           # Run for CI/CD and save results
  `);
}
async function main() {
    try {
        const options = parseArguments();
        const runner = new AdmissionsQARunner(options);
        await runner.run();
    }
    catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=run-admissions-qa.js.map