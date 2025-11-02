const fs = require('fs');
const { loadAppleDoubleFile } = require('./dist/rsrcdump-ts/adf.js');
const { parseRsrcFork } = require('./dist/rsrcdump-ts/rsrcFork.js');

const data = fs.readFileSync('public/Otto.skeleton.rsrc');
const adf = loadAppleDoubleFile(data);
const rsrc = parseRsrcFork(adf.resourceFork);

// Count resources by type
const typeCounts = {};
Object.entries(rsrc).forEach(([type, resources]) => {
  if (typeof resources === 'object' && !Array.isArray(resources)) {
    const count = Object.keys(resources).length;
    typeCounts[type] = count;
  }
});

console.log('Resource types in original:');
Object.entries(typeCounts).sort().forEach(([type, count]) => {
  console.log(`${type}: ${count}`);
});
const total = Object.values(typeCounts).reduce((a,b)=>a+b, 0);
console.log(`\nTotal resources: ${total}`);
