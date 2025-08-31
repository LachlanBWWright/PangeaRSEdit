import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Debug', () => {
  test('should check PropertyBinding errors when playing Pickup2 animation', async ({ page }) => {
    // Comprehensive console message tracking
    const consoleMessages: { type: string; text: string; timestamp: number }[] = [];
    const propertyBindingErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      const timestamp = Date.now();
      consoleMessages.push({ type: msg.type(), text, timestamp });
      
      // Track PropertyBinding errors specifically
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log(`🔴 PropertyBinding Error: ${text}`);
      }
      
      // Also track other Three.js errors
      if (text.includes('THREE.') && (text.includes('error') || text.includes('Error'))) {
        console.log(`⚠️  Three.js Error: ${text}`);
      }
    });

    // Navigate to the model viewer
    console.log('📂 Navigating to model viewer...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: '/tmp/otto-debug-01-initial.png', fullPage: true });

    // Navigate to model viewer page  
    await page.click('a[href="/PangeaRSEdit/modelviewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode if not already there
    const gameModelsButton = page.locator('button:has-text("Game Models")');
    if (await gameModelsButton.isVisible()) {
      await gameModelsButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Select Otto Matic from dropdown
    console.log('🎮 Selecting Otto Matic...');
    await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
    await page.waitForTimeout(500);
    
    // Select Otto model
    console.log('🤖 Selecting Otto model...');
    await page.selectOption('select[data-testid="model-select"]', 'Otto');
    await page.waitForTimeout(500);
    
    // Screenshot before loading
    await page.screenshot({ path: '/tmp/otto-debug-02-before-load.png', fullPage: true });

    // Load with skeleton data
    console.log('💀 Loading Otto with skeleton data...');
    await page.click('button:has-text("Load with skeleton data")');
    
    // Wait for model to load completely
    console.log('⏳ Waiting for model to load...');
    await page.waitForTimeout(8000);
    
    // Screenshot after loading
    await page.screenshot({ path: '/tmp/otto-debug-03-after-load.png', fullPage: true });

    // Check if animation dropdown is visible
    const animationSelect = page.locator('select').first();
    await expect(animationSelect).toBeVisible({ timeout: 10000 });
    
    console.log('🎭 Animation dropdown found, checking for Pickup2...');
    
    // Get all animation options
    const options = await animationSelect.locator('option').allTextContents();
    console.log('Available animations:', options.slice(0, 10)); // Show first 10
    
    // Try to find and select Pickup2 animation specifically
    const pickup2Option = options.find(opt => opt.includes('Pickup2'));
    if (pickup2Option) {
      console.log(`🎯 Found Pickup2: "${pickup2Option}"`);
      await animationSelect.selectOption({ label: pickup2Option });
      await page.waitForTimeout(1000);
      
      // Screenshot with Pickup2 selected
      await page.screenshot({ path: '/tmp/otto-debug-04-pickup2-selected.png', fullPage: true });
      
      // Clear PropertyBinding errors so we only see new ones
      propertyBindingErrors.length = 0;
      
      // Find and click play button
      const playButton = page.locator('button[title="Play"]').or(page.locator('button:has-text("▶")'));
      await expect(playButton).toBeVisible({ timeout: 5000 });
      
      console.log('▶️  Playing Pickup2 animation...');
      await playButton.click();
      
      // Wait for animation to start and potential errors to appear
      await page.waitForTimeout(3000);
      
      // Screenshot while playing
      await page.screenshot({ path: '/tmp/otto-debug-05-playing.png', fullPage: true });
      
      // Log all PropertyBinding errors that occurred during animation play
      console.log(`\n🔍 PropertyBinding Errors Found: ${propertyBindingErrors.length}`);
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      
      // Also check for any critical Three.js errors
      const threeJsErrors = consoleMessages.filter(msg => 
        msg.text.includes('THREE.') && 
        (msg.text.toLowerCase().includes('error') || msg.text.toLowerCase().includes('warn'))
      );
      
      console.log(`\n⚠️  Three.js Errors/Warnings: ${threeJsErrors.length}`);
      threeJsErrors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.text}`);
      });
      
      // Stop animation
      const stopButton = page.locator('button[title="Stop"]').or(page.locator('button:has-text("⏹")'));
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Final screenshot
      await page.screenshot({ path: '/tmp/otto-debug-06-final.png', fullPage: true });
      
      // Test result: Report the actual PropertyBinding errors found
      console.log(`\n📊 Test Results:`);
      console.log(`- PropertyBinding errors: ${propertyBindingErrors.length}`);
      console.log(`- Total console messages: ${consoleMessages.length}`);
      
      if (propertyBindingErrors.length > 0) {
        console.log(`\n❌ CONFIRMED: PropertyBinding errors detected during Pickup2 animation`);
        console.log(`First error: ${propertyBindingErrors[0]}`);
      } else {
        console.log(`\n✅ NO PropertyBinding errors found during Pickup2 animation`);
      }
      
    } else {
      console.log('❌ Pickup2 animation not found in options');
      throw new Error('Pickup2 animation not available');
    }
  });
});