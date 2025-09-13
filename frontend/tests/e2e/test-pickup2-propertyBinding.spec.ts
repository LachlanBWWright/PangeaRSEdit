import { test, expect } from '@playwright/test';

test.describe('Otto Pickup2 PropertyBinding Error Test', () => {
  test('should reproduce PropertyBinding errors when playing Pickup2 animation', async ({ page }) => {
    // Capture all console messages 
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error captured:', text);
      }
      
      // Also log animation-related messages
      if (text.includes('animation') || text.includes('skeleton') || text.includes('joint')) {
        console.log('📋 Animation/skeleton log:', text);
      }
    });

    // Navigate to application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/pb-test-01-viewer.png', fullPage: true });
    
    // Switch to Game Models mode to use Otto
    const gameModelsButton = page.locator('button:has-text("Game Models")');
    if (await gameModelsButton.isVisible()) {
      await gameModelsButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Select Otto Matic game
    const gameSelect = page.locator('select').first();
    await gameSelect.selectOption('ottomatic');
    await page.waitForTimeout(1000);
    
    // Take screenshot after game selection
    await page.screenshot({ path: 'screenshots/pb-test-02-game-selected.png', fullPage: true });
    
    // Select Characters category
    const categorySelect = page.locator('select').nth(1);
    await categorySelect.selectOption('characters');
    await page.waitForTimeout(1000);
    
    // Select Otto model
    const modelSelect = page.locator('select').nth(2);
    await modelSelect.selectOption('Otto');
    await page.waitForTimeout(1000);
    
    // Take screenshot after model selection
    await page.screenshot({ path: 'screenshots/pb-test-03-model-selected.png', fullPage: true });
    
    // Click "Load with skeleton data" button
    const loadSkeletonButton = page.locator('button:has-text("Load with skeleton data")');
    await expect(loadSkeletonButton).toBeVisible();
    await loadSkeletonButton.click();
    
    console.log('⏳ Loading Otto with skeleton data...');
    await page.waitForTimeout(5000); // Wait for model to load
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/pb-test-04-otto-loaded.png', fullPage: true });
    
    // Look for animation dropdown
    const animationSelect = page.locator('select:has(option:text("Pickup"))');
    await expect(animationSelect).toBeVisible({ timeout: 10000 });
    
    // Select Pickup2 animation specifically
    console.log('🎯 Selecting Pickup2 animation...');
    await animationSelect.selectOption({ label: /Pickup2/ });
    await page.waitForTimeout(2000);
    
    // Take screenshot with animation selected
    await page.screenshot({ path: 'screenshots/pb-test-05-pickup2-selected.png', fullPage: true });
    
    // Find and click play button
    const playButton = page.locator('button').filter({ hasText: /Play/ });
    await expect(playButton).toBeVisible();
    
    console.log('▶️ Starting Pickup2 animation playback...');
    await playButton.click();
    
    // Wait for PropertyBinding errors to occur
    await page.waitForTimeout(3000);
    
    // Take screenshot during animation
    await page.screenshot({ path: 'screenshots/pb-test-06-animation-playing.png', fullPage: true });
    
    // Print results
    console.log('\n=== TEST RESULTS ===');
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      // Analyze the error patterns
      const positionErrors = propertyBindingErrors.filter(e => e.includes('.position'));
      const quaternionErrors = propertyBindingErrors.filter(e => e.includes('.quaternion'));
      const translationErrors = propertyBindingErrors.filter(e => e.includes('.translation'));
      const rotationErrors = propertyBindingErrors.filter(e => e.includes('.rotation'));
      
      console.log(`\n📊 Error Analysis:`);
      console.log(`  Position errors: ${positionErrors.length}`);
      console.log(`  Quaternion errors: ${quaternionErrors.length}`);
      console.log(`  Translation errors: ${translationErrors.length}`);
      console.log(`  Rotation errors: ${rotationErrors.length}`);
    } else {
      console.log('\n✅ No PropertyBinding errors detected!');
    }
    
    // Also check for any general errors
    const generalErrors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('error') && 
      !msg.includes('PropertyBinding')
    );
    
    if (generalErrors.length > 0) {
      console.log('\n⚠️ Other errors found:');
      generalErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  });
});