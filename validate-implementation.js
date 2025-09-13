#!/usr/bin/env node

// Validation script for Game Model Selector implementation
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Game Model Selector Implementation...\n');

const results = {
  success: 0,
  errors: 0,
  warnings: 0
};

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}`);
    results.success++;
    return true;
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    results.errors++;
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`✅ ${description}`);
    results.success++;
    return true;
  } else {
    console.log(`❌ ${description} - Directory not found: ${dirPath}`);
    results.errors++;
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      console.log(`✅ ${description}`);
      results.success++;
      return true;
    } else {
      console.log(`⚠️  ${description} - Content not found`);
      results.warnings++;
      return false;
    }
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    results.errors++;
    return false;
  }
}

// Component files
console.log('📂 Checking Component Files:');
checkFile('frontend/src/components/GameModelSelector.tsx', 'GameModelSelector component created');
checkFileContent('frontend/src/pages/ModelViewer.tsx', 'GameModelSelector', 'ModelViewer updated with GameModelSelector import');
checkFileContent('frontend/src/pages/ModelViewer.tsx', 'useGameSelector', 'ModelViewer has game selector state');

console.log('\n📁 Checking Game Directory Structure:');
checkDirectory('frontend/public/games', 'Games root directory');
checkDirectory('frontend/public/games/ottomatic', 'Otto Matic directory');
checkDirectory('frontend/public/games/bugdom2', 'Bugdom 2 directory');
checkDirectory('frontend/public/games/cromagrally', 'Cro-Mag Rally directory');
checkDirectory('frontend/public/games/nanosaur2', 'Nanosaur 2 directory');
checkDirectory('frontend/public/games/billyfrontier', 'Billy Frontier directory');

console.log('\n🎮 Checking Otto Matic Model Files:');
checkFile('frontend/public/games/ottomatic/Otto.bg3d', 'Otto.bg3d file');
checkFile('frontend/public/games/ottomatic/Otto.skeleton.rsrc', 'Otto.skeleton.rsrc file');
checkFile('frontend/public/games/ottomatic/Onion.bg3d', 'Onion.bg3d file');
checkFile('frontend/public/games/ottomatic/Onion.skeleton.rsrc', 'Onion.skeleton.rsrc file');

console.log('\n🧪 Checking Test Files:');
checkFile('frontend/tests/e2e/otto-models-comprehensive.spec.ts', 'Comprehensive test suite');
checkFileContent('frontend/tests/e2e/otto-models-comprehensive.spec.ts', 'validateGlbWithGltfValidator', 'glTF validator integration');
checkFileContent('frontend/tests/e2e/otto-models-comprehensive.spec.ts', 'OTTO_MODELS', 'Otto models test data');

console.log('\n📝 Checking Implementation Features:');
checkFileContent('frontend/src/components/GameModelSelector.tsx', 'skeletonFile', 'Skeleton file support');
checkFileContent('frontend/src/components/GameModelSelector.tsx', 'loadWithSkeleton', 'Skeleton prompting system');
checkFileContent('frontend/src/components/GameModelSelector.tsx', 'Otto Matic', 'Otto Matic game configuration');
checkFileContent('frontend/src/pages/ModelViewer.tsx', 'Game Models', 'Game Models tab');
checkFileContent('frontend/src/pages/ModelViewer.tsx', 'Upload Files', 'Upload Files tab');

console.log('\n📊 VALIDATION SUMMARY:');
console.log(`✅ Successful checks: ${results.success}`);
console.log(`⚠️  Warnings: ${results.warnings}`);
console.log(`❌ Errors: ${results.errors}`);

if (results.errors === 0) {
  console.log('\n🎉 All critical components are in place!');
  console.log('📋 Next steps:');
  console.log('  1. Copy additional game files to respective directories');
  console.log('  2. Update GAMES array in GameModelSelector.tsx');
  console.log('  3. Run comprehensive tests');
  console.log('  4. Test UI functionality in browser');
} else {
  console.log('\n⚠️  Implementation has some missing components. Please review the errors above.');
}

console.log('\n🔗 For manual testing, navigate to: Model Viewer → Game Models tab');
console.log('📖 See GAME_MODEL_SELECTOR_IMPLEMENTATION.md for detailed documentation');