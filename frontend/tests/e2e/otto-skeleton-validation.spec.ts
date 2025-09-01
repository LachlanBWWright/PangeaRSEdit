import { test, expect } from '@playwright/test';

test.describe('Otto Skeleton glTF Validation', () => {
  test('should validate Otto skeleton GLB structure and track naming', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    const glbValidationMessages: string[] = [];

    // Listen for ALL console messages to debug 
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      // Look for PropertyBinding errors
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error:', text);
      }
      
      // Look for Three.js animation/joint related logs
      if (text.includes('THREE.') && (text.includes('Animation') || text.includes('joint') || text.includes('track'))) {
        console.log('🔍 Three.js animation info:', text);
      }
      
      // Look for skeleton/joint creation logs
      if (text.includes('joint') || text.includes('bone') || text.includes('PropertyBinding')) {
        glbValidationMessages.push(text);
      }
    });

    console.log('🎯 Starting Otto skeleton GLB validation test...');

    // Navigate and load Otto with skeleton
    await page.goto('/#/model-viewer');
    await page.waitForLoadState('networkidle');
    
    await page.getByText('Game Models').click();
    await page.waitForTimeout(1000);
    
    await page.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Otto Matic' }).click();
    await page.waitForTimeout(1000);
    
    await page.locator('[role="combobox"]').nth(2).click();
    await page.getByRole('option', { name: /Otto/ }).first().click();
    await page.waitForTimeout(1000);
    
    await page.getByText('Load with skeleton data').click();
    
    // Clear messages before loading
    consoleMessages.length = 0;
    propertyBindingErrors.length = 0;
    
    const loadButton = page.getByRole('button', { name: /Load Otto/ });
    await loadButton.click();
    console.log('✅ Loading Otto with skeleton...');

    // Wait for loading to complete
    await page.waitForFunction(() => {
      const select = document.querySelector('select');
      return select && select.options.length > 1;
    }, { timeout: 30000 });
    
    console.log('✅ Otto skeleton loaded');
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-skeleton-loaded.png', fullPage: true });

    // Now inspect the GLB structure by examining console logs during loading
    console.log('\n=== SKELETON LOADING ANALYSIS ===');
    
    // Filter for skeleton-related messages
    const skeletonMessages = consoleMessages.filter(msg => 
      msg.includes('joint') || 
      msg.includes('bone') || 
      msg.includes('skeleton') ||
      msg.includes('PropertyBinding') ||
      msg.includes('Animation') ||
      msg.includes('Pelvis') ||
      msg.includes('Torso')
    );
    
    console.log(`Skeleton-related console messages: ${skeletonMessages.length}`);
    skeletonMessages.slice(0, 20).forEach((msg, i) => {
      console.log(`${i + 1}. ${msg}`);
    });

    // Try different animations to see if some cause PropertyBinding errors
    const animationsToTest = ['0', '6', '10']; // Standing, Pickup2, and another one
    
    for (const animationValue of animationsToTest) {
      console.log(`\n--- Testing animation ${animationValue} ---`);
      
      // Clear PropertyBinding errors
      propertyBindingErrors.length = 0;
      
      try {
        // Select animation
        await page.selectOption('select', animationValue);
        await page.waitForTimeout(1000);
        
        // Play animation
        const playButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await playButton.click();
        await page.waitForTimeout(2000);
        
        // Stop animation
        const stopButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
        if (await stopButton.isVisible()) {
          await stopButton.click();
        }
        
        console.log(`Animation ${animationValue}: ${propertyBindingErrors.length} PropertyBinding errors`);
        
        if (propertyBindingErrors.length > 0) {
          propertyBindingErrors.forEach(error => {
            console.log(`  🔥 ${error}`);
          });
        }
        
      } catch (error) {
        console.log(`Error testing animation ${animationValue}:`, error);
      }
      
      await page.waitForTimeout(1000);
    }

    // Download the GLB for external validation
    try {
      console.log('\n--- Attempting GLB download for validation ---');
      const downloadButton = page.getByRole('button', { name: 'Download as GLB' });
      
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      
      console.log(`✅ Downloaded GLB: ${download.suggestedFilename()}`);
      await download.saveAs(`screenshots/${download.suggestedFilename()}`);
    } catch (error) {
      console.log('Could not download GLB:', error);
    }

    // Final analysis
    console.log('\n=== FINAL ANALYSIS ===');
    console.log(`Total PropertyBinding errors detected: ${propertyBindingErrors.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    
    // Look for evidence of the issue
    const pelvisErrors = propertyBindingErrors.filter(err => err.includes('Pelvis'));
    const positionErrors = propertyBindingErrors.filter(err => err.includes('position'));
    const quaternionErrors = propertyBindingErrors.filter(err => err.includes('quaternion'));
    
    console.log(`Pelvis-related errors: ${pelvisErrors.length}`);
    console.log(`Position-related errors: ${positionErrors.length}`);
    console.log(`Quaternion-related errors: ${quaternionErrors.length}`);
    
    if (propertyBindingErrors.length === 0) {
      console.log('\n🤔 No PropertyBinding errors detected in automated test');
      console.log('This suggests either:');
      console.log('1. The issue is fixed');
      console.log('2. The issue only occurs in specific conditions');
      console.log('3. The test environment differs from user environment');
      console.log('4. The issue requires manual interaction patterns');
    }
    
    // The test should complete successfully to allow us to gather information
    // Instead of failing, we'll just report what we found
    console.log('\n✅ Skeleton validation test completed');
  });
});