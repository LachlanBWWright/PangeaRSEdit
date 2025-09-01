import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Fix', () => {
  test('should NOT have PropertyBinding errors when playing animations', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔥 PropertyBinding error:', text);
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial.png', fullPage: true });

    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);

    // Take screenshot after mode switch
    await page.screenshot({ path: 'screenshots/02-game-models-mode.png', fullPage: true });

    // Select Otto Matic from game dropdown
    await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
    await page.waitForTimeout(500);

    // Select Otto from model dropdown
    await page.selectOption('select[data-testid="model-select"]', 'Otto');
    await page.waitForTimeout(500);

    // Take screenshot with model selected
    await page.screenshot({ path: 'screenshots/03-otto-selected.png', fullPage: true });

    // Click "Load with skeleton data" button
    await page.click('button:has-text("Load with skeleton data")');
    
    // Wait for model to load completely
    await page.waitForTimeout(8000);

    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/04-otto-loaded.png', fullPage: true });

    // Verify model is visible (check for canvas)
    const canvasCount = await page.locator('canvas').count();
    console.log(`Canvas elements found: ${canvasCount}`);
    expect(canvasCount).toBeGreaterThan(0);

    // Wait for animation dropdown to be available
    await page.waitForSelector('select', { timeout: 10000 });

    // Get all available animations
    const animationOptions = await page.$$eval('option', options => 
      options.map(option => ({ value: option.value, text: option.textContent }))
        .filter(opt => opt.value && opt.text && !opt.text.includes('Select'))
    );

    console.log(`Found ${animationOptions.length} animations:`, animationOptions.map(a => a.text));

    // Test multiple animations to ensure PropertyBinding works
    const testAnimations = animationOptions.slice(0, 3); // Test first 3 animations

    for (let i = 0; i < testAnimations.length; i++) {
      const animation = testAnimations[i];
      console.log(`\n=== Testing animation ${i + 1}: ${animation.text} ===`);

      // Clear previous PropertyBinding errors
      propertyBindingErrors.length = 0;

      // Select animation
      await page.selectOption('select', animation.value);
      await page.waitForTimeout(1000);

      // Take screenshot with animation selected
      await page.screenshot({ 
        path: `screenshots/05-animation-${i + 1}-selected.png`, 
        fullPage: true 
      });

      // Click play button (look for play icon or play text)
      const playButtons = await page.locator('button').all();
      let playClicked = false;
      
      for (const button of playButtons) {
        const buttonText = await button.textContent();
        const hasPlayIcon = await button.locator('svg').count() > 0;
        
        if (hasPlayIcon || (buttonText && buttonText.toLowerCase().includes('play'))) {
          try {
            await button.click();
            playClicked = true;
            console.log(`Clicked play button for ${animation.text}`);
            break;
          } catch (e) {
            console.log(`Failed to click button: ${e}`);
          }
        }
      }

      if (!playClicked) {
        console.log('No play button found - trying first button with icon');
        const iconButtons = page.locator('button:has(svg)');
        const iconButtonCount = await iconButtons.count();
        if (iconButtonCount > 0) {
          await iconButtons.first().click();
          playClicked = true;
        }
      }

      // Wait for animation to start and potential errors to occur
      await page.waitForTimeout(3000);

      // Take screenshot while playing
      await page.screenshot({ 
        path: `screenshots/06-animation-${i + 1}-playing.png`, 
        fullPage: true 
      });

      // Check for PropertyBinding errors specific to this animation
      if (propertyBindingErrors.length > 0) {
        console.log(`❌ PropertyBinding errors found for ${animation.text}:`);
        propertyBindingErrors.forEach((error, idx) => {
          console.log(`  ${idx + 1}. ${error}`);
        });
      } else {
        console.log(`✅ No PropertyBinding errors for ${animation.text}`);
      }

      // Stop animation before testing next one
      const stopButtons = page.locator('button:has(svg)');
      const stopButtonCount = await stopButtons.count();
      if (stopButtonCount > 1) {
        await stopButtons.nth(1).click(); // Usually stop is second button
      }
      
      await page.waitForTimeout(500);
    }

    // Final results
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total PropertyBinding errors: ${propertyBindingErrors.length}`);

    // Count all PropertyBinding errors across all tests
    const allPropertyBindingErrors = consoleMessages.filter(msg => 
      msg.includes('PropertyBinding') && msg.includes('No target node found')
    );

    console.log(`All PropertyBinding errors found: ${allPropertyBindingErrors.length}`);

    if (allPropertyBindingErrors.length > 0) {
      console.log('\n🔥 All PropertyBinding errors:');
      allPropertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/07-final-state.png', fullPage: true });

    // The test should pass only if NO PropertyBinding errors are found
    expect(allPropertyBindingErrors.length).toBe(0);

    console.log('\n✅ SUCCESS: No PropertyBinding errors detected - skeleton system is working correctly!');
  });
});