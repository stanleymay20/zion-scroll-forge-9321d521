/**
 * Script to fix reserved word usage in JavaScript/TypeScript files
 */

const fs = require('fs');
const path = require('path');

const glob = require('glob');

// Find all TypeScript files in admissions directory
const files = glob.sync('src/services/admissions/**/*.ts', { cwd: __dirname });

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace (eval) => with (evaluation) =>
  content = content.replace(/\(eval\)\s*=>/g, '(evaluation) =>');
  content = content.replace(/\beval\./g, 'evaluation.');
  
  // Replace interface parameter with userInterface
  content = content.replace(/\(([^,)]*,\s*)?interface\)/g, '($1userInterface)');
  content = content.replace(/\.\.\.interface/g, '...userInterface');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
});

console.log('Done!');
