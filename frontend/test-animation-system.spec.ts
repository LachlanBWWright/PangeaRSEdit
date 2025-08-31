import { test, expect } from '@playwright/test';

test.describe('Animation System Debugging', () => {
  test('should debug why animations are not working properly', async ({ page }) => {
    const allConsoleMessages: string[] = [];
    const errorMessages: string[] = [];
    const animationMessages: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      if (msg.type() === 'error') {
        errorMessages.push(text);
        console.log(`🔴 ERROR: ${text}`);
      }
      
      if (text.toLowerCase().includes('animation') || 
          text.toLowerCase().includes('clip') || 
          text.toLowerCase().includes('mixer') ||
          text.toLowerCase().includes('action')) {
        animationMessages.push(text);
        console.log(`🎬 ANIMATION: ${text}`);
      }
    });

    console.log('🔍 Debugging animation system...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
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
    
    console.log('🔄 Loading Otto with skeleton data...');
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load completely
    await page.waitForTimeout(10000);
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'screenshots/animation-debug-01-loaded.png', fullPage: true });
    
    // Check if we can see any animation-related UI elements
    const animationElements = await page.locator('text=Animation').count();
    const selectElements = await page.locator('select').count();
    const buttonElements = await page.locator('button').count();
    
    console.log(`🎛️ Animation elements found: ${animationElements}`);
    console.log(`📋 Select elements found: ${selectElements}`);
    console.log(`🔘 Button elements found: ${buttonElements}`);
    
    // Look for the animation selector
    const animationSelect = page.locator('select').first();
    if (await animationSelect.count() > 0) {
      const options = await animationSelect.locator('option').allTextContents();
      console.log('📋 Animation options:', options.slice(0, 5));
      
      // Select an animation
      if (options.length > 1) {
        const targetAnimation = options.find(opt => opt.includes('Pickup2')) || options[1];
        console.log(`🎯 Selecting animation: ${targetAnimation}`);
        await animationSelect.selectOption({ label: targetAnimation });
        await page.waitForTimeout(3000);
        
        // Take screenshot with animation selected
        await page.screenshot({ path: 'screenshots/animation-debug-02-selected.png', fullPage: true });
        
        // Check for play button state
        const playButtons = await page.locator('button').filter({ 
          has: page.locator('svg') 
        }).count();
        console.log(`▶️ Play buttons found: ${playButtons}`);
        
        // Try to get more specific info about buttons
        const allButtons = await page.locator('button').all();
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const button = allButtons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          console.log(`  Button ${i}: visible=${isVisible}, enabled=${isEnabled}, text="${text}"`);
        }
        
        // Try to execute JavaScript to check the internal state
        const animationInfo = await page.evaluate(() => {
          // Check if there's any animation-related global state we can access
          const animationElements = document.querySelectorAll('[class*="animation"], [id*="animation"]');
          const selectElements = document.querySelectorAll('select');
          
          return {
            animationElementsCount: animationElements.length,
            selectElementsCount: selectElements.length,
            hasAnimationMixer: typeof window !== 'undefined' && !!(window as any).animationMixer,
            hasThree: typeof window !== 'undefined' && !!(window as any).THREE
          };
        });
        
        console.log('🔬 Internal state:', animationInfo);
      }
    }
    
    // Final analysis
    console.log('\n=== Animation System Analysis ===');
    console.log(`Total console messages: ${allConsoleMessages.length}`);
    console.log(`Error messages: ${errorMessages.length}`);
    console.log(`Animation-related messages: ${animationMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('\n🔴 Errors found:');
      errorMessages.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (animationMessages.length > 0) {
      console.log('\n🎬 Animation system messages:');
      animationMessages.slice(0, 10).forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
    }
    
    // Look for specific issues
    const gltfErrors = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('gltf') && (msg.includes('error') || msg.includes('fail'))
    );
    
    const threeErrors = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('three') && (msg.includes('error') || msg.includes('fail'))
    );
    
    if (gltfErrors.length > 0) {
      console.log('\n📄 glTF-related errors:');
      gltfErrors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (threeErrors.length > 0) {
      console.log('\n🎮 Three.js-related errors:');
      threeErrors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  });
});