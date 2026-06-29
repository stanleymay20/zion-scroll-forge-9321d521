/**
 * Fix Course Content Creation Migration SQL Table Ordering
 * 
 * Problem: ImpactMetric table references DeploymentPathway and OutcomeData
 * before they are created, causing foreign key constraint errors.
 * 
 * Solution: Move DeploymentPathway and OutcomeData table definitions
 * to before ImpactMetric table.
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../prisma/migrations/20241228000001_course_content_creation_system/migration.sql'
);

console.log('Reading migration file...');
const content = fs.readFileSync(migrationPath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Find the line numbers for each table
const impactMetricStart = lines.findIndex(l => l.includes('-- Impact Metric Table'));
const impactMetricEnd = lines.findIndex((l, i) => i > impactMetricStart && l.trim() === ');') + 1;

const deploymentPathwayStart = lines.findIndex(l => l.includes('-- Deployment Pathway Table'));
const competencyEnd = lines.findIndex((l, i) => i > deploymentPathwayStart && l.includes('-- Project Connection Table')) - 1;

const outcomeDataStart = lines.findIndex(l => l.includes('-- Outcome Data Table'));
const courseFeedbackEnd = lines.findIndex((l, i) => i > outcomeDataStart && l.includes('-- Create Indexes')) - 1;

console.log(`ImpactMetric: lines ${impactMetricStart}-${impactMetricEnd}`);
console.log(`DeploymentPathway section: lines ${deploymentPathwayStart}-${competencyEnd}`);
console.log(`OutcomeData section: lines ${outcomeDataStart}-${courseFeedbackEnd}`);

// Extract the sections
const deploymentSection = lines.slice(deploymentPathwayStart, competencyEnd + 1);
const outcomeSection = lines.slice(outcomeDataStart, courseFeedbackEnd + 1);

// Build new content:
// 1. Everything before ImpactMetric
// 2. DeploymentPathway section
// 3. OutcomeData section  
// 4. ImpactMetric
// 5. Everything after ImpactMetric but before DeploymentPathway
// 6. Everything after OutcomeData

const newLines = [
  ...lines.slice(0, impactMetricStart),
  '',
  ...deploymentSection,
  '',
  ...outcomeSection,
  '',
  ...lines.slice(impactMetricStart, impactMetricEnd),
  ...lines.slice(impactMetricEnd, deploymentPathwayStart),
  ...lines.slice(competencyEnd + 1, outcomeDataStart),
  ...lines.slice(courseFeedbackEnd + 1)
];

const newContent = newLines.join('\n');

// Write the fixed migration
fs.writeFileSync(migrationPath, newContent, 'utf8');

console.log('✅ Migration SQL fixed!');
console.log('\nTable order is now:');
console.log('1. ProjectRequirements (already before ImpactMetric)');
console.log('2. DeploymentPathway (moved before ImpactMetric)');
console.log('3. OutcomeData (moved before ImpactMetric)');
console.log('4. ImpactMetric (references all three above)');
console.log('\nNext: Run npx prisma migrate deploy');
