#!/usr/bin/env ts-node
interface ValidationResult {
    component: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    details?: string[];
}
declare class AdmissionsTestingValidator {
    private results;
    validate(): Promise<ValidationResult[]>;
    private validateTestInfrastructure;
    private validateJestConfiguration;
    private validateTestRunnerComponents;
    private validateDatabaseTestSetup;
    private validateEnvironmentConfiguration;
    private validateTestConfigurations;
    private validateTestSuites;
    private validateTestSuite;
    private validateTestData;
    private validateCiCdIntegration;
    private validateReporting;
    private addResult;
    private displayResults;
    runQuickTest(): Promise<boolean>;
}
export { AdmissionsTestingValidator };
//# sourceMappingURL=validate-admissions-testing.d.ts.map