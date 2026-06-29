/**
 * Remove duplicate models and enums from Prisma schema
 * Keeps first occurrence, removes second occurrence
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

console.log('Reading schema...');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Find duplicate section boundaries
// The duplicate section starts around line 2450 and we need to remove it
// We'll find it by looking for the second occurrence of "ScrollCoin Blockchain Integration"

let firstScrollCoinLine = -1;
let secondScrollCoinLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('ScrollCoin Blockchain Integration')) {
    if (firstScrollCoinLine === -1) {
      firstScrollCoinLine = i;
    } else {
      secondScrollCoinLine = i;
      break;
    }
  }
}

console.log(`First ScrollCoin section: line ${firstScrollCoinLine + 1}`);
console.log(`Second ScrollCoin section (duplicate): line ${secondScrollCoinLine + 1}`);

// Find where the duplicate section ends (before any new unique content)
// The duplicate section should end before line 2883
let duplicateSectionEnd = lines.length;

// Remove from second ScrollCoin occurrence to end of file
// (since the duplicates go all the way to the end)
const cleanedLines = lines.slice(0, secondScrollCoinLine);

console.log(`Removing lines ${secondScrollCoinLine + 1} to ${lines.length}`);
console.log(`New total lines: ${cleanedLines.length}`);

const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync(schemaPath, cleanedContent, 'utf8');

console.log('✅ Duplicates removed!');
console.log('\nNext: npx prisma db pull --force');
