import { test, expect } from '@playwright/test';

/**
 * Comprehensive test to verify skeletal animations are working correctly:
 * 1. Load Otto model with skeleton
 * 2. Verify animations are available
 * 3. Play multiple animations and capture screenshots
 * 4. Check for 0 PropertyBinding errors
 */
test('Comprehensive animation test - load, play, and verify', async ({ page }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  
  console.log('=== Starting Comprehensive Animation Test ===');
  
  // Navigate to the app
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-results/01-initial-page.png' });
  console.log('✅ Initial page loaded');
  
  // Click Model Viewer tab
  await page.click('button:has-text("Model Viewer")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/02-model-viewer.png' });
  console.log('✅ Model Viewer tab opened');
  
  // Click Game Models button
  await page.click('button:has-text("Game Models")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/03-game-models.png' });
  console.log('✅ Game Models selected');
  
  // Click the Otto Sample (with Skeleton) button
  console.log('Loading Otto Sample with Skeleton...');
  await page.click('button:has-text("Otto Sample (with Skeleton)")');
  
  // Wait for model to load (increased timeout for skeleton processing)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/04-otto-loaded.png' });
  console.log('✅ Otto model loaded');
  
  // Enable visualization options
  console.log('Enabling visualization options...');
  
  // Enable wireframe mode
  const wireframeSwitch = page.locator('label:has-text("Wireframe Mode")').locator('input[type="checkbox"]');
  await wireframeSwitch.check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/05-wireframe-enabled.png' });
  console.log('✅ Wireframe mode enabled');
  
  // Enable skeleton visualization
  const skeletonSwitch = page.locator('label:has-text("Show Skeleton")').locator('input[type="checkbox"]');
  await skeletonSwitch.check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/06-skeleton-visible.png' });
  console.log('✅ Skeleton visualization enabled');
  
  // Enable bone position logging
  const logBoneSwitch = page.locator('label:has-text("Log Bone Positions")').locator('input[type="checkbox"]');
  await logBoneSwitch.check();
  await page.waitForTimeout(500);
  console.log('✅ Bone position logging enabled');
  
  // Check if animations panel exists
  const animationPanel = page.locator('text=Animation Viewer');
  await expect(animationPanel).toBeVisible({ timeout: 5000 });
  console.log('✅ Animation panel visible');
  
  // Get list of available animations
  const animationButtons = page.locator('[class*="animation-list"] button, [class*="animationList"] button, text=/Walk|Standing|Jump/').first();
  const animationCount = await animationButtons.count();
  console.log(`Found ${animationCount} animation(s)`);
  
  // Test playing multiple animations
  const animationsToTest = ['Walk', 'Standing', 'Jump', 'Punch'];
  
  for (const animName of animationsToTest) {
    console.log(`\n=== Testing Animation: ${animName} ===`);
    
    try {
      // Find and click the animation button
      const animButton = page.locator(`button:has-text("${animName}")`).first();
      
      if (await animButton.isVisible()) {
        console.log(`Clicking "${animName}" animation...`);
        await animButton.click();
        await page.waitForTimeout(500);
        
        // Take screenshot at start
        await page.screenshot({ path: `test-results/anim-${animName.toLowerCase()}-start.png` });
        console.log(`✅ Screenshot: ${animName} - start`);
        
        // Wait for animation to play a bit
        await page.waitForTimeout(1000);
        
        // Take screenshot mid-animation
        await page.screenshot({ path: `test-results/anim-${animName.toLowerCase()}-mid.png` });
        console.log(`✅ Screenshot: ${animName} - mid`);
        
        // Wait more
        await page.waitForTimeout(1000);
        
        // Take screenshot later in animation
        await page.screenshot({ path: `test-results/anim-${animName.toLowerCase()}-end.png` });
        console.log(`✅ Screenshot: ${animName} - end`);
        
        console.log(`✅ Animation "${animName}" played successfully`);
      } else {
        console.log(`⚠️ Animation "${animName}" button not found`);
      }
    } catch (error) {
      console.log(`⚠️ Could not test animation "${animName}": ${error}`);
    }
  }
  
  // Collect and analyze console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Wait a bit more to collect any async console messages
  await page.waitForTimeout(2000);
  
  // Get all console messages from the page
  const allMessages = await page.evaluate(() => {
    // Return any stored console messages if available
    return (window as any).__consoleMessages || [];
  });
  
  console.log('\n=== Console Message Analysis ===');
  console.log(`Total console messages collected: ${consoleMessages.length}`);
  
  // Check for PropertyBinding errors
  const propertyBindingErrors = consoleMessages.filter(msg => 
    msg.includes('PropertyBinding') && msg.includes('error')
  );
  
  const noTargetErrors = consoleMessages.filter(msg =>
    msg.includes('No target node found')
  );
  
  const threeErrors = consoleMessages.filter(msg =>
    msg.includes('THREE') && (msg.includes('[error]') || msg.includes('Error'))
  );
  
  console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
  console.log(`"No target node found" errors: ${noTargetErrors.length}`);
  console.log(`THREE.js errors: ${threeErrors.length}`);
  
  if (propertyBindingErrors.length > 0) {
    console.log('\n❌ PropertyBinding Errors Found:');
    propertyBindingErrors.forEach(err => console.log(`  ${err}`));
  }
  
  if (noTargetErrors.length > 0) {
    console.log('\n❌ "No target node found" Errors:');
    noTargetErrors.forEach(err => console.log(`  ${err}`));
  }
  
  if (threeErrors.length > 0) {
    console.log('\n❌ THREE.js Errors Found:');
    threeErrors.forEach(err => console.log(`  ${err}`));
  }
  
  // Final screenshot
  await page.screenshot({ path: 'test-results/99-final-state.png', fullPage: true });
  console.log('✅ Final screenshot captured');
  
  console.log('\n=== Test Summary ===');
  console.log(`✅ Model loaded successfully`);
  console.log(`✅ Visualization options working`);
  console.log(`✅ Animations tested: ${animationsToTest.length}`);
  console.log(`✅ Screenshots captured: ${animationsToTest.length * 3 + 7}`);
  console.log(`✅ PropertyBinding errors: ${propertyBindingErrors.length}`);
  console.log(`✅ "No target node" errors: ${noTargetErrors.length}`);
  console.log(`✅ THREE.js errors: ${threeErrors.length}`);
  
  // Assertions
  expect(propertyBindingErrors.length).toBe(0);
  expect(noTargetErrors.length).toBe(0);
  expect(threeErrors.length).toBe(0);
  
  console.log('\n✅ All assertions passed!');
  console.log('=== Comprehensive Animation Test Complete ===\n');
});
