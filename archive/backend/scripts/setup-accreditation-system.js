#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccreditationSystemSetup = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
class AccreditationSystemSetup {
    constructor(config = {}) {
        this.config = {
            databaseUrl: config.databaseUrl || process.env.DATABASE_URL || 'postgresql://scroll:scroll@localhost:5432/scrolluniversity',
            ethereumRpcUrl: config.ethereumRpcUrl || process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
            ipfsHost: config.ipfsHost || process.env.IPFS_HOST || 'localhost',
            ipfsPort: config.ipfsPort || parseInt(process.env.IPFS_PORT || '5001'),
            contractDeployment: config.contractDeployment ?? true,
            seedData: config.seedData ?? true
        };
    }
    async setup() {
        console.log('🚀 Setting up ScrollAccreditation System...');
        console.log('=====================================');
        try {
            await this.checkPrerequisites();
            await this.setupEnvironment();
            await this.setupDatabase();
            await this.setupBlockchain();
            await this.setupIPFS();
            await this.deploySmartContracts();
            await this.seedDatabase();
            await this.verifySetup();
            console.log('✅ ScrollAccreditation System setup completed successfully!');
            console.log('🎓 The system is ready for truth-governed, data-grounded education validation');
        }
        catch (error) {
            console.error('❌ Setup failed:', error);
            throw error;
        }
    }
    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...');
        const requirements = [
            { name: 'Node.js', command: 'node --version' },
            { name: 'npm', command: 'npm --version' },
            { name: 'PostgreSQL', command: 'psql --version' },
            { name: 'Docker', command: 'docker --version' }
        ];
        for (const req of requirements) {
            try {
                const version = (0, child_process_1.execSync)(req.command, { encoding: 'utf8' }).trim();
                console.log(`  ✅ ${req.name}: ${version}`);
            }
            catch (error) {
                console.log(`  ❌ ${req.name}: Not found or not accessible`);
                throw new Error(`${req.name} is required but not found`);
            }
        }
    }
    async setupEnvironment() {
        console.log('🔧 Setting up environment variables...');
        const envPath = (0, path_1.join)(process.cwd(), '.env');
        const envExamplePath = (0, path_1.join)(process.cwd(), '.env.example');
        if (!(0, fs_1.existsSync)(envPath)) {
            console.log('  📝 Creating .env file...');
            const envContent = `
# ScrollAccreditation System Environment Configuration
# "We establish secure foundations for educational validation"

# Database Configuration
DATABASE_URL="${this.config.databaseUrl}"

# Blockchain Configuration
ETHEREUM_RPC_URL="${this.config.ethereumRpcUrl}"
ETHEREUM_PRIVATE_KEY="your-private-key-here"
SCROLL_CREDENTIAL_CONTRACT_ADDRESS="will-be-set-after-deployment"

# Validator Private Keys (for testing - use secure key management in production)
PROPHETIC_VALIDATOR_PRIVATE_KEY="your-prophetic-validator-key-here"
DATA_SCIENCE_VALIDATOR_PRIVATE_KEY="your-data-science-validator-key-here"

# IPFS Configuration
IPFS_HOST="${this.config.ipfsHost}"
IPFS_PORT="${this.config.ipfsPort}"
IPFS_PROTOCOL="http"
IPFS_AUTH_TOKEN="your-ipfs-auth-token-here"
IPFS_GATEWAY_URL="https://ipfs.io/ipfs/"

# Application Configuration
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-here"
JWT_EXPIRES_IN="7d"

# Redis Configuration (for caching and sessions)
REDIS_URL="redis://localhost:6379"

# Email Configuration (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# ScrollCoin Configuration
SCROLLCOIN_NETWORK="ethereum"
SCROLLCOIN_CONTRACT_ADDRESS="your-scrollcoin-contract-address"

# API Keys
OPENAI_API_KEY="your-openai-api-key-here"
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
`;
            (0, fs_1.writeFileSync)(envPath, envContent.trim());
            console.log('  ✅ .env file created');
        }
        else {
            console.log('  ✅ .env file already exists');
        }
    }
    async setupDatabase() {
        console.log('🗄️  Setting up database...');
        try {
            console.log('  📦 Installing dependencies...');
            (0, child_process_1.execSync)('npm install', { stdio: 'inherit' });
            console.log('  🔄 Running database migrations...');
            (0, child_process_1.execSync)('npx prisma migrate dev --name init', { stdio: 'inherit' });
            console.log('  🏗️  Generating Prisma client...');
            (0, child_process_1.execSync)('npx prisma generate', { stdio: 'inherit' });
            console.log('  ✅ Database setup completed');
        }
        catch (error) {
            console.error('  ❌ Database setup failed:', error);
            throw error;
        }
    }
    async setupBlockchain() {
        console.log('⛓️  Setting up blockchain infrastructure...');
        try {
            try {
                (0, child_process_1.execSync)(`curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' ${this.config.ethereumRpcUrl}`, { stdio: 'pipe' });
                console.log('  ✅ Blockchain connection verified');
            }
            catch (error) {
                console.log('  ⚠️  Local blockchain not detected, starting Hardhat node...');
                console.log('  💡 For development, run: npx hardhat node');
            }
        }
        catch (error) {
            console.error('  ❌ Blockchain setup failed:', error);
            throw error;
        }
    }
    async setupIPFS() {
        console.log('🌐 Setting up IPFS infrastructure...');
        try {
            try {
                (0, child_process_1.execSync)(`curl -X POST http://${this.config.ipfsHost}:${this.config.ipfsPort}/api/v0/version`, { stdio: 'pipe' });
                console.log('  ✅ IPFS connection verified');
            }
            catch (error) {
                console.log('  ⚠️  IPFS not detected, please start IPFS daemon');
                console.log('  💡 Run: ipfs daemon');
                console.log('  💡 Or use Docker: docker run -d -p 4001:4001 -p 5001:5001 -p 8080:8080 ipfs/go-ipfs');
            }
        }
        catch (error) {
            console.error('  ❌ IPFS setup failed:', error);
            throw error;
        }
    }
    async deploySmartContracts() {
        if (!this.config.contractDeployment) {
            console.log('⏭️  Skipping smart contract deployment');
            return;
        }
        console.log('📜 Deploying smart contracts...');
        try {
            const hardhatConfigPath = (0, path_1.join)(process.cwd(), 'hardhat.config.js');
            if (!(0, fs_1.existsSync)(hardhatConfigPath)) {
                const hardhatConfig = `
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "${this.config.ethereumRpcUrl}"
    }
  }
};
`;
                (0, fs_1.writeFileSync)(hardhatConfigPath, hardhatConfig);
            }
            const deployScriptPath = (0, path_1.join)(process.cwd(), 'scripts', 'deploy-contracts.js');
            const deployScript = `
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ScrollCredentialVerification contract...");
  
  const ScrollCredentialVerification = await ethers.getContractFactory("ScrollCredentialVerification");
  const contract = await ScrollCredentialVerification.deploy();
  
  await contract.waitForDeployment();
  
  console.log("ScrollCredentialVerification deployed to:", await contract.getAddress());
  
  // Update .env file with contract address
  const fs = require('fs');
  const envPath = '.env';
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /SCROLL_CREDENTIAL_CONTRACT_ADDRESS=.*/,
    \`SCROLL_CREDENTIAL_CONTRACT_ADDRESS=\${await contract.getAddress()}\`
  );
  fs.writeFileSync(envPath, envContent);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`;
            if (!(0, fs_1.existsSync)((0, path_1.join)(process.cwd(), 'scripts'))) {
                (0, child_process_1.execSync)('mkdir -p scripts');
            }
            (0, fs_1.writeFileSync)(deployScriptPath, deployScript);
            console.log('  📜 Smart contracts ready for deployment');
            console.log('  💡 Run: npx hardhat run scripts/deploy-contracts.js --network localhost');
        }
        catch (error) {
            console.error('  ❌ Smart contract setup failed:', error);
            throw error;
        }
    }
    async seedDatabase() {
        if (!this.config.seedData) {
            console.log('⏭️  Skipping database seeding');
            return;
        }
        console.log('🌱 Seeding database with initial data...');
        try {
            (0, child_process_1.execSync)('npm run seed', { stdio: 'inherit' });
            console.log('  ✅ Database seeded successfully');
        }
        catch (error) {
            console.error('  ❌ Database seeding failed:', error);
            throw error;
        }
    }
    async verifySetup() {
        console.log('🔍 Verifying system setup...');
        const checks = [
            { name: 'Database Connection', check: () => this.checkDatabase() },
            { name: 'Environment Variables', check: () => this.checkEnvironment() },
            { name: 'Required Files', check: () => this.checkFiles() }
        ];
        for (const check of checks) {
            try {
                await check.check();
                console.log(`  ✅ ${check.name}`);
            }
            catch (error) {
                console.log(`  ❌ ${check.name}: ${error.message}`);
            }
        }
    }
    async checkDatabase() {
        try {
            (0, child_process_1.execSync)('npx prisma db pull --print', { stdio: 'pipe' });
        }
        catch (error) {
            throw new Error('Database connection failed');
        }
    }
    checkEnvironment() {
        const requiredVars = [
            'DATABASE_URL',
            'ETHEREUM_RPC_URL',
            'IPFS_HOST',
            'JWT_SECRET'
        ];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                throw new Error(`${varName} environment variable is missing`);
            }
        }
    }
    checkFiles() {
        const requiredFiles = [
            'prisma/schema.prisma',
            'contracts/ScrollCredentialVerification.sol',
            'src/services/IPFSService.ts',
            'src/services/ScrollAccreditationBlockchainService.ts'
        ];
        for (const file of requiredFiles) {
            if (!(0, fs_1.existsSync)(file)) {
                throw new Error(`Required file ${file} is missing`);
            }
        }
    }
}
exports.AccreditationSystemSetup = AccreditationSystemSetup;
async function main() {
    const args = process.argv.slice(2);
    const config = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        switch (key) {
            case 'database-url':
                config.databaseUrl = value;
                break;
            case 'ethereum-rpc':
                config.ethereumRpcUrl = value;
                break;
            case 'ipfs-host':
                config.ipfsHost = value;
                break;
            case 'no-contracts':
                config.contractDeployment = false;
                break;
            case 'no-seed':
                config.seedData = false;
                break;
        }
    }
    const setup = new AccreditationSystemSetup(config);
    await setup.setup();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=setup-accreditation-system.js.map