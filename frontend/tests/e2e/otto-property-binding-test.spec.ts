import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Test', () => {
  test('should reproduce PropertyBinding errors when playing Otto animations', async ({ page }) => {
    // Listen specifically for PropertyBinding errors
    const propertyBindingErrors: string[] = [];
    const allConsoleMessages: string[] = [];
    const threeJSErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      if (text.includes('PropertyBinding')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
      
      if (text.toLowerCase().includes('three') && (text.includes('error') || text.includes('warn'))) {
        threeJSErrors.push(text);
        console.log('⚠️ Three.js error/warning:', text);
      }
    });

    console.log('Navigating to Otto skeleton test...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to Game Models mode  
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);
    
    // Select Otto Matic
    await page.locator('[role="combobox"]:has-text("Select a game")').click();
    await page.locator('[role="option"]:has-text("Otto Matic")').click();
    await page.waitForTimeout(1000);
    
    // Select Otto model
    await page.locator('[role="combobox"]:has-text("Select a model")').click();
    await page.locator('[role="option"]:has-text("Otto")').first().click();
    await page.waitForTimeout(1000);
    
    // Take screenshot before loading
    await page.screenshot({ path: 'screenshots/otto-pb-before-load.png', fullPage: true });
    
    // Load Otto with skeleton
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load - give it plenty of time
    console.log('Waiting for Otto model to load...');
    await page.waitForTimeout(10000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-pb-after-load.png', fullPage: true });
    
    // Check if we have any animations available
    console.log('Looking for animation controls...');
    
    // Look for the animation selector (could be a regular select or custom component)
    const animationSelector = page.locator('select').filter({ hasText: /Animation|Walk|Standing/ }).first();
    const hasAnimationSelector = await animationSelector.count() > 0;
    console.log('Animation selector found:', hasAnimationSelector);
    
    if (hasAnimationSelector) {
      // Get all animation options
      const options = await animationSelector.locator('option').allTextContents();
      console.log('Available animations:', options);
      
      // Select an animation (skip the first placeholder option)
      if (options.length > 1) {
        const firstRealAnimation = options.find(opt => opt !== "-- Select Animation --" && opt.trim() !== "");
        if (firstRealAnimation) {
          console.log(`Selecting animation: ${firstRealAnimation}`);
          await animationSelector.selectOption({ label: firstRealAnimation });
          await page.waitForTimeout(2000);
          
          // Take screenshot with animation selected
          await page.screenshot({ path: 'screenshots/otto-pb-animation-selected.png', fullPage: true });
          
          // Look for play button and click it - this should trigger PropertyBinding errors
          const playButton = page.locator('button').filter({ hasText: /Play/ }).or(
            page.locator('button[title="Play"]')
          ).or(
            page.locator('button').filter({ has: page.locator('svg') })
          ).first();
          
          const hasPlayButton = await playButton.count() > 0;
          console.log('Play button found:', hasPlayButton);
          
          if (hasPlayButton) {
            console.log('🎬 Starting animation playback - this should trigger PropertyBinding errors...');
            
            // Click play and immediately wait for PropertyBinding errors
            await playButton.click();
            
            // Wait longer for the animation to start and PropertyBinding to be attempted
            await page.waitForTimeout(5000);
            
            // Take screenshot while animation is supposedly playing
            await page.screenshot({ path: 'screenshots/otto-pb-animation-playing.png', fullPage: true });
            
            console.log('Animation playback initiated, checking for PropertyBinding errors...');
          } else {
            console.log('❌ No play button found - can\'t test animation playback');
          }
        }
      }
    } else {
      console.log('❌ No animation selector found - checking if skeleton loaded properly');
      
      // Check if we can at least see that skeleton data was loaded
      const recentSkeletonMessages = allConsoleMessages.filter(msg => 
        msg.includes('skeleton') || msg.includes('animation') || msg.includes('bone')
      ).slice(-10);
      
      console.log('Recent skeleton-related messages:');
      recentSkeletonMessages.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
    }
    
    // Final check for errors
    console.log('\n=== FINAL RESULTS ===');
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
    console.log(`Three.js errors/warnings: ${threeJSErrors.length}`);
    console.log(`Total console messages: ${allConsoleMessages.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors detected');
    }
    
    if (threeJSErrors.length > 0) {
      console.log('\n⚠️ Three.js errors/warnings:');
      threeJSErrors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Log recent animation/skeleton related messages
    const relevantMessages = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('animation') || 
      msg.toLowerCase().includes('skeleton') ||
      msg.toLowerCase().includes('bone') ||
      msg.toLowerCase().includes('joint') ||
      msg.toLowerCase().includes('three')
    ).slice(-15);
    
    console.log('\n📋 Recent relevant console messages:');
    relevantMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg}`);
    });
    
    // The test should document what we found - don't fail the test, just report
    console.log(`\n🎯 Test Result: Found ${propertyBindingErrors.length} PropertyBinding errors`);
    
    // Only expect no errors if the user's report was fixed, but let's see what we actually get
    if (propertyBindingErrors.length > 0) {
      console.log('🔍 PropertyBinding errors are still occurring - this confirms the issue exists');
    }
  });
});