import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Detection', () => {
  test('should detect PropertyBinding errors when playing Pickup2 animation', async ({ page }) => {
    const propertyBindingErrors: string[] = [];
    let testCompleted = false;

    // Listen for PropertyBinding errors specifically
    page.on('console', (msg) => {
      const text = msg.text();
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
    });

    console.log('🎯 Starting simplified PropertyBinding detection test...');

    // Navigate to model viewer
    await page.goto('/#/model-viewer');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Switch to Game Models mode
    await page.getByText('Game Models').click();
    await page.waitForTimeout(1000);
    console.log('✅ Switched to Game Models');

    // Select Otto Matic game
    await page.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: 'Otto Matic' }).click();
    await page.waitForTimeout(1000);
    console.log('✅ Selected Otto Matic');

    // Select Otto model
    await page.locator('[role="combobox"]').nth(2).click();
    await page.getByRole('option', { name: /Otto/ }).first().click();
    await page.waitForTimeout(1000);
    console.log('✅ Selected Otto');

    // Select skeleton loading option
    await page.getByText('Load with skeleton data').click();
    console.log('✅ Selected skeleton loading');

    // Load the model
    const loadButton = page.getByRole('button', { name: /Load Otto/ });
    await loadButton.click();
    console.log('✅ Started loading Otto with skeleton');

    // Wait for animations to be available - just wait for select to have options
    await page.waitForFunction(() => {
      const select = document.querySelector('select');
      return select && select.options.length > 1; // More than just default option
    }, { timeout: 30000 });
    console.log('✅ Animations loaded');

    // Find and select Pickup2
    await page.selectOption('select', '6'); // Pickup2 is option 6 based on earlier output
    await page.waitForTimeout(1000);
    console.log('✅ Selected Pickup2 animation');

    // Clear errors before playing
    propertyBindingErrors.length = 0;

    // Click play button
    const playButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await playButton.click();
    console.log('🎮 Playing animation...');

    // Wait just 3 seconds to catch PropertyBinding errors
    await page.waitForTimeout(3000);

    // Log results
    console.log('\n=== RESULTS ===');
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);

    if (propertyBindingErrors.length > 0) {
      console.log('\n🔥 PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      
      // This is what we expect to find based on the user's report
      const expectedErrors = [
        'Pelvis.position',
        'Pelvis.quaternion', 
        'Torso.position',
        'Torso.quaternion'
      ];
      
      const foundExpected = expectedErrors.some(expected => 
        propertyBindingErrors.some(error => error.includes(expected))
      );
      
      if (foundExpected) {
        console.log('✅ Test successfully reproduced the PropertyBinding errors the user reported');
      } else {
        console.log('⚠️ Found PropertyBinding errors but not the specific ones user reported');
      }
      
      throw new Error(`❌ Found ${propertyBindingErrors.length} PropertyBinding errors - this confirms the issue exists and needs fixing`);
    } else {
      console.log('\n🤔 No PropertyBinding errors found - this suggests the issue may be fixed or test environment differs from user environment');
      
      // Don't fail the test since no errors is technically good
      console.log('✅ Test passed: No PropertyBinding errors detected');
    }
  });
});