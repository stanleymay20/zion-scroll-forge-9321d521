#!/usr/bin/env ts-node
interface ValidationResult {
    component: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
}
declare class AdmissionsInfrastructureValidator {
    private results;
    validate(): Promise<ValidationResult[]>;
    private validateDatabase;
    private validateRedis;
    private validateFileSystem;
    private validateDockerConfiguration;
    private validateAuthentication;
    private generateReport;
    private addResult;
    cleanup(): Promise<void>;
}
export { AdmissionsInfrastructureValidator };
export default AdmissionsInfrastructureValidator;
//# sourceMappingURL=validate-admissions-infrastructure.d.ts.map