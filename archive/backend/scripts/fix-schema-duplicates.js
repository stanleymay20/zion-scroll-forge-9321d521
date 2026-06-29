/**
 * Script to remove duplicate models and enums from Prisma schema
 * 
 * This script removes the duplicate section from lines 2451-3017
 * which contains duplicate ScrollCoinTransaction, Scholarship, and other models
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

console.log('Reading schema file...');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const lines = schemaContent.split('\n');

console.log(`Total lines in schema: ${lines.length}`);

// Remove lines 2450-3016 (0-indexed: 2449-3015)
// This removes the duplicate section starting with "// ScrollCoin Blockchain Integration Models"
// and ending just before the Course Content Creation models
const startRemove = 2449; // Line 2450 (0-indexed)
const endRemove = 3016;    // Line 3017 (0-indexed, exclusive)

console.log(`Removing lines ${startRemove + 1} to ${endRemove}...`);

const cleanedLines = [
  ...lines.slice(0, startRemove),
  ...lines.slice(endRemove)
];

console.log(`New total lines: ${cleanedLines.length}`);
console.log(`Removed ${lines.length - cleanedLines.length} lines`);

// Write back to file
const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync(schemaPath, cleanedContent, 'utf8');

console.log('✅ Schema duplicates removed successfully!');
console.log('\nNext steps:');
console.log('1. Run: cd backend && npx prisma format');
console.log('2. Run: npx prisma validate');
console.log('3. Run: npx prisma db push');
