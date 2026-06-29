#!/usr/bin/env ts-node
interface SetupOptions {
    skipMigration?: boolean;
    skipSeed?: boolean;
    skipRedis?: boolean;
    skipDocker?: boolean;
}
declare class AdmissionsInfrastructureSetup {
    private options;
    constructor(options?: SetupOptions);
    setup(): Promise<void>;
    private runMigrations;
    private seedInitialData;
    private setupRedis;
    private setupDockerEnvironment;
    private validateSetup;
    cleanup(): Promise<void>;
}
export { AdmissionsInfrastructureSetup };
export default AdmissionsInfrastructureSetup;
//# sourceMappingURL=setup-admissions-infrastructure.d.ts.map