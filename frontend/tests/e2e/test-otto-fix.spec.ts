import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Fix Test', () => {
  test('should not have PropertyBinding errors when loading Otto with skeleton', async ({ page }) => {
    // Listen for console messages
    const propertyBindingErrors: string[] = [];
    const allConsoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
    });

    console.log('Navigating to the page...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Navigate to Model Viewer page
    console.log('Clicking Model Viewer link...');
    await page.click('text=Model Viewer');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Switching to Game Models mode...');
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);
    
    console.log('Selecting Otto Matic from game dropdown...');
    await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
    await page.waitForTimeout(500);
    
    console.log('Selecting Otto from model dropdown...');
    await page.selectOption('select[data-testid="model-select"]', 'Otto');
    await page.waitForTimeout(500);
    
    // Take screenshot before loading
    await page.screenshot({ path: 'screenshots/otto-before-skeleton-fix.png', fullPage: true });

    console.log('Loading Otto with skeleton data...');
    await page.click('button:has-text("Load with skeleton data")');
    
    // Wait for model to load
    await page.waitForTimeout(8000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-after-skeleton-fix.png', fullPage: true });

    console.log('Checking for animation viewer...');
    const animationSelects = await page.locator('select').all();
    let animationSelect = null;
    
    for (const select of animationSelects) {
      const options = await select.locator('option').allTextContents();
      if (options.some(opt => opt.includes('Animation') || opt.includes('Walk') || opt.includes('Standing'))) {
        animationSelect = select;
        break;
      }
    }
    
    if (animationSelect) {
      console.log('Found animation selector, testing animation playback...');
      
      // Select an animation (not the first "-- Select Animation --" option)
      const options = await animationSelect.locator('option').all();
      if (options.length > 1) {
        console.log('Selecting animation...');
        await animationSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Look for play button and click it
        const playButtons = await page.locator('button').all();
        for (const button of playButtons) {
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');
          if (ariaLabel?.includes('Play') || title?.includes('Play') || 
              (await button.textContent())?.includes('Play')) {
            console.log('Playing animation...');
            await button.click();
            await page.waitForTimeout(3000); // Wait for animation to start and potential errors
            break;
          }
        }
      }
    } else {
      console.log('No animation selector found, checking for model display...');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/otto-final-test.png', fullPage: true });

    // Log results
    console.log(`\n=== TEST RESULTS ===`);
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log(`❌ PropertyBinding errors detected:`);
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log(`✅ No PropertyBinding errors detected!`);
    }
    
    // Also check for other Three.js errors
    const threeJSErrors = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('three') && 
      (msg.includes('error') || msg.includes('warn'))
    );
    
    console.log(`\nThree.js related messages: ${threeJSErrors.length}`);
    threeJSErrors.slice(0, 10).forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });

    // Check if canvas has content (model is visible)
    const canvas = page.locator('canvas').first();
    const canvasExists = await canvas.count() > 0;
    console.log(`\nCanvas element exists: ${canvasExists}`);
    
    if (canvasExists) {
      // Try to get canvas dimensions
      const boundingBox = await canvas.boundingBox();
      console.log(`Canvas dimensions: ${boundingBox?.width}x${boundingBox?.height}`);
    }

    // The test passes if no PropertyBinding errors are found
    expect(propertyBindingErrors.length).toBe(0);
  });
});