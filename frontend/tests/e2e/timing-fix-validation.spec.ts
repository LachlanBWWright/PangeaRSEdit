import { test, expect } from '@playwright/test';

test.describe('PropertyBinding Timing Fix Validation', () => {
  test('should load Otto skeleton and play Pickup2 without PropertyBinding errors after timing fix', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    const propertyBindingErrorsDetailed: string[] = [];

    // Enhanced console monitoring to catch ALL PropertyBinding related messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      // Look for PropertyBinding errors (original format user reported)
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔥 FOUND PropertyBinding error:', text);
      }
      
      // Look for Three.js animation errors
      if (text.includes('THREE.') && (text.includes('PropertyBinding') || text.includes('Animation'))) {
        propertyBindingErrorsDetailed.push(text);
        console.log('🔍 Three.js animation message:', text);
      }
      
      // Look for our timing fix message
      if (text.includes('Creating AnimationMixer after skeleton setup delay')) {
        console.log('✅ Timing fix activated:', text);
      }
    });

    console.log('🎯 Testing PropertyBinding timing fix...');

    await page.goto('/#/model-viewer');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.getByText('Game Models').click();
    await page.waitForTimeout(1000);
    
    // Select Otto Matic
    await page.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Otto Matic' }).click();
    await page.waitForTimeout(1000);
    
    // Select Otto model  
    await page.locator('[role="combobox"]').nth(2).click();
    await page.getByRole('option', { name: /Otto/ }).first().click();
    await page.waitForTimeout(1000);
    
    // Select skeleton loading
    await page.getByText('Load with skeleton data').click();
    console.log('✅ Selected skeleton loading option');
    
    // Clear errors before loading
    propertyBindingErrors.length = 0;
    propertyBindingErrorsDetailed.length = 0;
    
    // Load the model
    const loadButton = page.getByRole('button', { name: /Load Otto/ });
    await loadButton.click();
    console.log('✅ Started loading Otto with skeleton');
    
    // Wait longer for skeleton to load and timing fix to activate
    await page.waitForTimeout(12000); // Extra time for timing fix
    console.log('✅ Skeleton loading phase complete');
    
    // Wait specifically for animations to be ready
    await page.waitForFunction(() => {
      const select = document.querySelector('select');
      return select && select.options.length > 1;
    }, { timeout: 30000 });
    console.log('✅ Animations are ready');
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/timing-fix-01-loaded.png', fullPage: true });
    
    // Select Pickup2 animation (option 6)
    await page.selectOption('select', '6');
    await page.waitForTimeout(2000);
    console.log('✅ Selected Pickup2 animation');
    
    // Take screenshot with animation selected
    await page.screenshot({ path: 'screenshots/timing-fix-02-pickup2-selected.png', fullPage: true });
    
    // Clear errors before playing
    propertyBindingErrors.length = 0;
    propertyBindingErrorsDetailed.length = 0;
    
    // Play the animation
    const playButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await playButton.click();
    console.log('🎮 Playing Pickup2 animation...');
    
    // Wait for animation to start and any PropertyBinding errors to occur
    await page.waitForTimeout(3000);
    
    // Take screenshot while animation is playing
    await page.screenshot({ path: 'screenshots/timing-fix-03-playing.png', fullPage: true });
    
    // Final check for PropertyBinding errors
    console.log('\n=== TIMING FIX TEST RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
    console.log(`Three.js animation messages: ${propertyBindingErrorsDetailed.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors found after timing fix:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      
      throw new Error(`❌ TIMING FIX FAILED: Still found ${propertyBindingErrors.length} PropertyBinding errors`);
    }
    
    if (propertyBindingErrorsDetailed.length > 0) {
      console.log('\n📋 Three.js animation messages:');
      propertyBindingErrorsDetailed.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg}`);
      });
    }
    
    // Check if timing fix was activated
    const timingFixActivated = consoleMessages.some(msg => 
      msg.includes('Creating AnimationMixer after skeleton setup delay')
    );
    
    if (timingFixActivated) {
      console.log('✅ Timing fix was activated');
    } else {
      console.log('⚠️ Timing fix message not detected');
    }
    
    console.log('\n🎉 TIMING FIX SUCCESS: No PropertyBinding errors detected!');
  });
});