import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('Skeleton hierarchy verification - mesh as child of Armature', async ({ page }) => {
  // Set up console message tracking
  const consoleMessages: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
  });

  // Navigate to the model viewer
  console.log('Navigating to Model Viewer...');
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  await page.waitForLoadState('networkidle');
  
  // Click Model Viewer tab
  await page.click('text=Model Viewer');
  await page.waitForTimeout(1000);
  
  // Click Game Models button
  await page.click('button:has-text("Game Models")');
  await page.waitForTimeout(500);

  // Click "Otto Sample (with Skeleton)" button
  console.log('Loading Otto sample model with skeleton...');
  await page.click('button:has-text("Otto Sample (with Skeleton)")');
  
  // Wait for model to load and console messages
  await page.waitForTimeout(5000);
  
  // Take screenshots
  await page.screenshot({ path: join(__dirname, '../../screenshots/skeleton-fix-01-loaded.png'), fullPage: true });
  
  // Enable Show Skeleton if available
  try {
    const showSkeletonToggle = page.locator('label:has-text("Show Skeleton")').locator('input[type="checkbox"]');
    const toggleCount = await showSkeletonToggle.count();
    if (toggleCount > 0) {
      await showSkeletonToggle.check();
      console.log('✅ Show Skeleton enabled');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(__dirname, '../../screenshots/skeleton-fix-02-skeleton-visible.png'), fullPage: true });
    }
  } catch (e) {
    console.log('⚠️ Could not find or enable Show Skeleton toggle');
  }
  
  // Enable Wireframe Mode if available
  try {
    const wireframeToggle = page.locator('label:has-text("Wireframe Mode")').locator('input[type="checkbox"]');
    const toggleCount = await wireframeToggle.count();
    if (toggleCount > 0) {
      await wireframeToggle.check();
      console.log('✅ Wireframe Mode enabled');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(__dirname, '../../screenshots/skeleton-fix-03-wireframe.png'), fullPage: true });
      
      // Disable wireframe and take screenshot
      await wireframeToggle.uncheck();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(__dirname, '../../screenshots/skeleton-fix-04-wireframe-off.png'), fullPage: true });
    }
  } catch (e) {
    console.log('⚠️ Could not find or enable Wireframe Mode toggle');
  }
  
  // Wait for additional console messages
  await page.waitForTimeout(2000);
  
  console.log('\n=== CONSOLE MESSAGE ANALYSIS ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  
  // Look for key messages about skeleton hierarchy
  console.log('\n=== Skeleton Hierarchy Messages ===');
  const hierarchyMessages = consoleMessages.filter(msg => 
    msg.includes('Armature') || 
    msg.includes('joint') || 
    msg.includes('skeleton') ||
    msg.includes('skin')
  );
  hierarchyMessages.slice(0, 30).forEach(msg => console.log(msg));
  
  // Look for the critical message that skinned mesh was added to Armature
  const skinnedMeshToArmature = consoleMessages.filter(msg =>
    msg.includes('Added skinned mesh') && msg.includes('Armature')
  );
  
  console.log('\n=== Skinned Mesh Attachment ===');
  console.log(`Messages indicating mesh attached to Armature: ${skinnedMeshToArmature.length}`);
  skinnedMeshToArmature.forEach(msg => console.log(`  ✅ ${msg}`));
  
  // Check for PropertyBinding errors
  const propertyBindingErrors = consoleMessages.filter(msg => 
    msg.includes('PropertyBinding') && msg.includes('No target node found')
  );
  
  console.log('\n=== PropertyBinding Error Check ===');
  console.log(`PropertyBinding "No target node" errors: ${propertyBindingErrors.length}`);
  
  if (propertyBindingErrors.length > 0) {
    console.log('❌ PropertyBinding errors found:');
    propertyBindingErrors.slice(0, 10).forEach(msg => console.log(`  ${msg}`));
  } else {
    console.log('✅ NO PropertyBinding errors!');
  }
  
  // Check for bone position logging
  const bonePositionMessages = consoleMessages.filter(msg =>
    msg.includes('Bone Positions') || msg.includes('bone') && msg.includes('position')
  );
  console.log(`\n=== Bone Position Logging ===`);
  console.log(`Bone position messages: ${bonePositionMessages.length}`);
  bonePositionMessages.slice(0, 20).forEach(msg => console.log(msg));
  
  // Write console log to file
  const consoleLogPath = join(__dirname, '../../screenshots/skeleton-fix-console.txt');
  mkdirSync(join(__dirname, '../../screenshots'), { recursive: true });
  writeFileSync(consoleLogPath, consoleMessages.join('\n'));
  console.log(`\nConsole log written to: ${consoleLogPath}`);

  // ASSERTIONS
  
  // 1. Verify no PropertyBinding errors
  expect(propertyBindingErrors.length).toBe(0);
  
  // 2. Verify skinned mesh was attached to Armature (correct hierarchy)
  expect(skinnedMeshToArmature.length).toBeGreaterThan(0);
  
  // 3. Verify we found hierarchy messages (indicates skeleton was processed)
  expect(hierarchyMessages.length).toBeGreaterThan(0);
  
  console.log('\n=== Test Complete ===');
  console.log('✅ All assertions passed!');
});
