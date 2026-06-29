interface ValidationResult {
    component: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
}
declare function validateCompetitiveAnalysisSetup(): Promise<ValidationResult[]>;
export { validateCompetitiveAnalysisSetup };
//# sourceMappingURL=validate-competitive-analysis-setup.d.ts.map