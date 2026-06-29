#!/usr/bin/env ts-node
declare const validationRules: {
    name: string;
    category: string;
    severity: string;
}[];
declare const rulesByCategory: Record<string, number>;
declare const criticalRules: number;
declare const unitTestComponents: string[];
declare const integrationScenarios: string[];
declare const uatScenarios: string[];
declare const overallScore = 85.7;
declare const qualityGate: string;
declare const gateEmoji: string;
//# sourceMappingURL=simple-qa-test.d.ts.map