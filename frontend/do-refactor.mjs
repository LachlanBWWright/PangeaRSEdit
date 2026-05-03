import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        files.push(...walkDir(fullPath));
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Replace err(new Error(...)) with err(...)
  // Handle all quote styles
  
  // Double quotes: "..."
  content = content.replace(/err\(new Error\("([^"]*)"\)\)/g, (match, str) => {
    return `err("${str}")`;
  });
  
  // Single quotes: '...'
  content = content.replace(/err\(new Error\('([^']*)'\)\)/g, (match, str) => {
    return `err('${str}')`;
  });
  
  // Backticks: `...` (with template expressions)
  // This is tricky because we need to handle ${...} inside
  content = content.replace(/err\(new Error\(`([^`]*)`\)\)/g, (match, str) => {
    return `err(\`${str}\`)`;
  });
  
  // Now handle more complex patterns - err(new Error(something()))
  // Use a state machine approach
  content = content.replace(/err\(new Error\(([^()]*(?:\([^()]*\)[^()]*)*)\)\)/g, (match, innerContent) => {
    return `err(${innerContent})`;
  });
  
  // Replace Result<T, Error> with Result<T, string>
  // Simple case: Result<anything, Error>
  content = content.replace(/Result<([^<>]*), Error>/g, (match, typeParam) => {
    return `Result<${typeParam}, string>`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

const srcDir = path.join(__dirname, 'src');
const files = walkDir(srcDir);

let changedCount = 0;
let fileList = [];
for (const file of files) {
  if (refactorFile(file)) {
    changedCount++;
    fileList.push(path.relative(__dirname, file));
  }
}

console.log(`Modified ${changedCount} files:`);
fileList.forEach(f => console.log(`  ${f}`));
