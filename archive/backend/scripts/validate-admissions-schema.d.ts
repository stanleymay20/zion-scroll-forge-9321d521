#!/usr/bin/env ts-node
interface ValidationResult {
    component: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
}
declare class AdmissionsSchemaValidator {
    private results;
    validate(): Promise<ValidationResult[]>;
    private validatePrismaSchema;
    private validateMigrationFiles;
    private validateInfrastructureFiles;
    private generateReport;
    private addResult;
}
export { AdmissionsSchemaValidator };
export default AdmissionsSchemaValidator;
//# sourceMappingURL=validate-admissions-schema.d.ts.map