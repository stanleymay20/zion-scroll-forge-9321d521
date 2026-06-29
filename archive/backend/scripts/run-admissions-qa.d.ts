#!/usr/bin/env ts-node
interface RunnerOptions {
    environment: 'development' | 'production' | 'ci-cd';
    suites: ('unit' | 'integration' | 'performance' | 'uat' | 'all')[];
    output?: string;
    verbose?: boolean;
    failFast?: boolean;
    generateReports?: boolean;
}
declare class AdmissionsQARunner {
    private options;
    constructor(options: RunnerOptions);
    run(): Promise<void>;
    private runSelectedSuites;
    private setupEventListeners;
    private displayResults;
    private getQualityGateEmoji;
    private generateReports;
    private generateHtmlReport;
    private saveResults;
    private ensureDirectoryExists;
}
export { AdmissionsQARunner, RunnerOptions };
//# sourceMappingURL=run-admissions-qa.d.ts.map