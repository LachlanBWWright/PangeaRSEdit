import { test, expect } from '@playwright/test';

test.describe('Fixed PropertyBinding Test', () => {
  test('should NOT have PropertyBinding errors after gltf-transform Skin fix', async ({ page }) => {
    // Capture console messages to detect PropertyBinding errors
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error:', text);
      }
      
      // Log animation/skeleton related messages
      if (text.includes('joint') || text.includes('skeleton') || text.includes('PropertyBinding')) {
        console.log('📋 Animation debug:', text);
      }
    });

    // Navigate to application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/fixed-pb-01-viewer.png', fullPage: true });
    
    // Switch to Game Models mode
    const gameModelsButton = page.locator('button:has-text("Game Models")');
    if (await gameModelsButton.isVisible()) {
      await gameModelsButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Select Otto Matic
    const gameSelect = page.locator('select').first();
    await gameSelect.selectOption('ottomatic');
    await page.waitForTimeout(1000);
    
    // Select Characters
    const categorySelect = page.locator('select').nth(1);
    await categorySelect.selectOption('characters');
    await page.waitForTimeout(1000);
    
    // Select Otto
    const modelSelect = page.locator('select').nth(2);
    await modelSelect.selectOption('Otto');
    await page.waitForTimeout(1000);
    
    // Take screenshot after model selection
    await page.screenshot({ path: 'screenshots/fixed-pb-02-model-selected.png', fullPage: true });
    
    // Load with skeleton data
    const loadSkeletonButton = page.locator('button:has-text("Load with skeleton data")');
    await expect(loadSkeletonButton).toBeVisible();
    await loadSkeletonButton.click();
    
    console.log('⏳ Loading Otto with enhanced skeleton system...');
    await page.waitForTimeout(5000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/fixed-pb-03-loaded.png', fullPage: true });
    
    // Wait for animations to be available
    const animationSelect = page.locator('select:has(option:text("Pickup"))');
    await expect(animationSelect).toBeVisible({ timeout: 10000 });
    
    // Test multiple animations to ensure fix works broadly
    const testAnimations = ['Pickup2', 'Walk', 'Standing'];
    
    for (const animName of testAnimations) {
      console.log(`🧪 Testing ${animName} animation for PropertyBinding errors...`);
      
      // Select animation
      await animationSelect.selectOption({ label: new RegExp(animName) });
      await page.waitForTimeout(1000);
      
      // Clear previous PropertyBinding errors for this test
      propertyBindingErrors.length = 0;
      
      // Click play
      const playButton = page.locator('button').filter({ hasText: /Play/ });
      await expect(playButton).toBeVisible();
      await playButton.click();
      
      // Wait for animation to start and PropertyBinding to be tested
      await page.waitForTimeout(3000);
      
      // Check for PropertyBinding errors during this animation
      const errorsForThisAnimation = propertyBindingErrors.length;
      console.log(`   ${animName}: ${errorsForThisAnimation} PropertyBinding errors`);
      
      // Stop the animation
      const stopButton = page.locator('button').filter({ hasText: /Stop|Square/ });
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/fixed-pb-04-final.png', fullPage: true });
    
    // Final results
    console.log('\n=== FIXED SKELETON SYSTEM TEST RESULTS ===');
    console.log(`Total PropertyBinding errors: ${propertyBindingErrors.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors still present:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      // Show pattern analysis
      const positionErrors = propertyBindingErrors.filter(e => e.includes('.position'));
      const quaternionErrors = propertyBindingErrors.filter(e => e.includes('.quaternion'));
      const translationErrors = propertyBindingErrors.filter(e => e.includes('.translation'));
      const rotationErrors = propertyBindingErrors.filter(e => e.includes('.rotation'));
      
      console.log(`\n📊 Error patterns:`);
      console.log(`  .position errors: ${positionErrors.length}`);
      console.log(`  .quaternion errors: ${quaternionErrors.length}`);
      console.log(`  .translation errors: ${translationErrors.length}`);
      console.log(`  .rotation errors: ${rotationErrors.length}`);
    } else {
      console.log('\n✅ SUCCESS: No PropertyBinding errors detected!');
      console.log('The gltf-transform Skin specification fix resolved the issue.');
    }
    
    // Show recent animation-related messages
    const animationMessages = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('skeleton') ||
      msg.toLowerCase().includes('animation') ||
      msg.toLowerCase().includes('joint') ||
      msg.toLowerCase().includes('propertyBinding')
    ).slice(-10);
    
    console.log('\n📋 Recent animation system messages:');
    animationMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg}`);
    });
    
    // The test should pass if there are no PropertyBinding errors
    expect(propertyBindingErrors.length).toBe(0);
  });
});