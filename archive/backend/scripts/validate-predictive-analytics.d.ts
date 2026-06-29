declare class PredictiveAnalyticsValidator {
    private results;
    private addResult;
    validateDatabaseSchema(): Promise<void>;
    validateAdmissionSuccessModel(): Promise<void>;
    validateYieldPrediction(): Promise<void>;
    validateEnrollmentForecast(): Promise<void>;
    validateProcessImprovement(): Promise<void>;
    validateQualityAssurance(): Promise<void>;
    validateAPIEndpoints(): Promise<void>;
    validatePerformanceMetrics(): Promise<void>;
    private createSampleData;
    private createSampleApplicant;
    runValidation(): Promise<void>;
}
export default PredictiveAnalyticsValidator;
//# sourceMappingURL=validate-predictive-analytics.d.ts.map