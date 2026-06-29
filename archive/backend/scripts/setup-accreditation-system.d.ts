#!/usr/bin/env ts-node
interface SetupConfig {
    databaseUrl: string;
    ethereumRpcUrl: string;
    ipfsHost: string;
    ipfsPort: number;
    contractDeployment: boolean;
    seedData: boolean;
}
declare class AccreditationSystemSetup {
    private config;
    constructor(config?: Partial<SetupConfig>);
    setup(): Promise<void>;
    private checkPrerequisites;
    private setupEnvironment;
    private setupDatabase;
    private setupBlockchain;
    private setupIPFS;
    private deploySmartContracts;
    private seedDatabase;
    private verifySetup;
    private checkDatabase;
    private checkEnvironment;
    private checkFiles;
}
export { AccreditationSystemSetup };
//# sourceMappingURL=setup-accreditation-system.d.ts.map