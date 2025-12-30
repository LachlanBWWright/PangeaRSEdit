// Debug script to test rsrcdump-ts liquid output
import { saveToJson } from '@lachlanbwwright/rsrcdump-ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Otto Matic struct specs (array format as expected by rsrcdump-ts)
const OTTO_STRUCT_SPECS = [
  "Liqd:H x x I i h x x i 200f f f h h h h+:type,flags,height,numNubs,reserved,x`y[100],hotSpotX,hotSpotZ,bBoxTop,bBoxLeft,bBoxBottom,bBoxRight",
];

async function debugLiquidData() {
  console.log('\n=== DEBUGGING OTTO MATIC LIQUID DATA ===\n');
  
  // Try to find the Otto Matic Apocalypse level file
  const testFile = path.join(__dirname, 'public/assets/ottoMatic/terrain/Apocalypse.ter.rsrc');
  
  if (!fs.existsSync(testFile)) {
    console.error('ERROR: Test file not found:', testFile);
    console.log('Available directories:');
    const parentDir = path.join(__dirname, '../sampleFiles');
    if (fs.existsSync(parentDir)) {
      console.log(fs.readdirSync(parentDir));
    }
    return;
  }
  
  console.log('Reading file:', testFile);
  const bytes = new Uint8Array(fs.readFileSync(testFile));
  console.log('File size:', bytes.length, 'bytes\n');
  
  // Parse with rsrcdump-ts
  console.log('Calling rsrcdump-ts saveToJson...');
  const result = await saveToJson(bytes, OTTO_STRUCT_SPECS, [], []);
  
  if (!result.ok) {
    console.error('ERROR:', result.error);
    return;
  }
  
  console.log('Parse successful!\n');
  const json = JSON.parse(result.value);
  
  // Check for Liqd resource
  console.log('=== CHECKING FOR LIQD RESOURCE ===');
  console.log('Has Liqd key:', 'Liqd' in json);
  
  if (json.Liqd) {
    console.log('Liqd type:', typeof json.Liqd);
    console.log('Liqd keys:', Object.keys(json.Liqd));
    
    if (json.Liqd[1000]) {
      console.log('\nLiqd[1000] exists!');
      console.log('Liqd[1000].obj type:', typeof json.Liqd[1000].obj);
      console.log('Is array:', Array.isArray(json.Liqd[1000].obj));
      
      if (Array.isArray(json.Liqd[1000].obj)) {
        console.log('Number of liquid patches:', json.Liqd[1000].obj.length);
        console.log('\n=== FIRST LIQUID PATCH ===');
        console.log(JSON.stringify(json.Liqd[1000].obj[0], null, 2));
        
        // Check for nubs array
        if (json.Liqd[1000].obj[0].nubs) {
          console.log('\n✓ Patch has nubs array!');
          console.log('Nubs length:', json.Liqd[1000].obj[0].nubs.length);
          console.log('First 5 nubs:', json.Liqd[1000].obj[0].nubs.slice(0, 5));
        } else {
          console.log('\n✗ NO nubs array found!');
          console.log('Available keys:', Object.keys(json.Liqd[1000].obj[0]));
        }
      }
    } else {
      console.log('✗ Liqd[1000] does NOT exist');
    }
  } else {
    console.log('✗ NO Liqd key in parsed JSON');
    console.log('Available top-level keys:', Object.keys(json));
  }
}

debugLiquidData().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
