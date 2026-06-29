declare class SimplePredictiveAnalyticsValidator {
    private results;
    private addResult;
    validateServiceInstantiation(): Promise<void>;
    validateFileStructure(): Promise<void>;
    validateTypeScriptCompilation(): Promise<void>;
    validateAPIRoutes(): Promise<void>;
    validateDatabaseMigration(): Promise<void>;
    validateTestSuite(): Promise<void>;
    validateImplementationCompleteness(): Promise<void>;
    runValidation(): Promise<void>;
}
export default SimplePredictiveAnalyticsValidator;
//# sourceMappingURL=validate-predictive-analytics-simple.d.ts.map