import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Reproduction', () => {
  test('should reproduce PropertyBinding errors when playing Pickup2 animation', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');

    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);

    // Select Otto Matic from game dropdown
    await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
    await page.waitForTimeout(500);

    // Select Otto from model dropdown
    await page.selectOption('select[data-testid="model-select"]', 'Otto');
    await page.waitForTimeout(500);

    // Click "Load with skeleton data" button
    await page.click('button:has-text("Load with skeleton data")');
    
    // Wait for model to load completely
    await page.waitForTimeout(8000);

    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-loaded-with-skeleton.png', fullPage: true });

    // Wait for animation dropdown to be available
    await page.waitForSelector('select', { timeout: 10000 });

    // Look for Pickup2 animation specifically
    const animationOptions = await page.$$eval('option', options => 
      options.map(option => ({ value: option.value, text: option.textContent }))
    );

    console.log('Available animations:', animationOptions);

    // Find Pickup2 animation
    const pickup2Option = animationOptions.find(option => 
      option.text && option.text.includes('Pickup2')
    );

    if (!pickup2Option) {
      console.log('❌ Pickup2 animation not found. Available options:', animationOptions);
      throw new Error('Pickup2 animation not found');
    }

    console.log('✅ Found Pickup2 animation:', pickup2Option);

    // Select Pickup2 animation
    await page.selectOption('select', pickup2Option.value);
    await page.waitForTimeout(1000);

    // Take screenshot with animation selected
    await page.screenshot({ path: 'screenshots/otto-pickup2-selected.png', fullPage: true });

    // Clear any existing PropertyBinding errors
    propertyBindingErrors.length = 0;

    // Click play button to trigger PropertyBinding errors
    await page.click('button:has(svg)'); // Play button with icon
    
    // Wait for animation to start and PropertyBinding errors to occur
    await page.waitForTimeout(3000);

    // Take screenshot while playing
    await page.screenshot({ path: 'screenshots/otto-pickup2-playing.png', fullPage: true });

    // Log results
    console.log('\n=== PropertyBinding Error Analysis ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);

    if (propertyBindingErrors.length > 0) {
      console.log('\n🔥 PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors found');
    }

    // The test should fail if PropertyBinding errors are found
    if (propertyBindingErrors.length > 0) {
      throw new Error(`Found ${propertyBindingErrors.length} PropertyBinding errors - skeleton system needs fixing`);
    }
  });
});