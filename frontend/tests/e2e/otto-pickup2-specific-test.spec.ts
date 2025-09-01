import { test, expect } from '@playwright/test';

test.describe('Otto Pickup2 Animation PropertyBinding Test', () => {
  test('should load Otto with skeleton and play Pickup2 animation without PropertyBinding errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    const threeJsErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
      
      if (text.includes('THREE.') && (text.includes('Error') || text.includes('Warning'))) {
        threeJsErrors.push(text);
        console.log('⚠️ Three.js error/warning:', text);
      }
    });

    console.log('🎯 Starting Otto Pickup2 PropertyBinding Test...');

    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-page.png', fullPage: true });

    // Navigate to model viewer page
    await page.goto('/#/model-viewer');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to model viewer');

    // Take screenshot of model viewer page
    await page.screenshot({ path: 'screenshots/02-model-viewer-page.png', fullPage: true });

    // Switch to Game Models mode
    const gameModelsButton = page.locator('button:has-text("Game Models")');
    await expect(gameModelsButton).toBeVisible({ timeout: 10000 });
    await gameModelsButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Switched to Game Models mode');

    // Take screenshot after switching to game models
    await page.screenshot({ path: 'screenshots/03-game-models-mode.png', fullPage: true });

    // Select Otto Matic from game dropdown
    const gameSelect = page.locator('[role="combobox"]').first();
    await expect(gameSelect).toBeVisible({ timeout: 10000 });
    await gameSelect.click();
    await page.waitForTimeout(500);
    
    // Click on Otto Matic option
    await page.getByRole('option', { name: 'Otto Matic' }).click();
    await page.waitForTimeout(500);
    console.log('✅ Selected Otto Matic game');

    // Select Otto from model dropdown - find the model select (should be the third combobox)
    const modelSelect = page.locator('[role="combobox"]').nth(2);
    await expect(modelSelect).toBeVisible({ timeout: 5000 });
    await modelSelect.click();
    await page.waitForTimeout(500);
    
    // Click on Otto option
    await page.getByRole('option', { name: /Otto/ }).first().click();
    await page.waitForTimeout(500);
    console.log('✅ Selected Otto model');

    // Take screenshot after model selection
    await page.screenshot({ path: 'screenshots/04-otto-selected.png', fullPage: true });

    // Select "Load with skeleton data" option
    const skeletonLabel = page.locator('label:has-text("Load with skeleton data")');
    await expect(skeletonLabel).toBeVisible({ timeout: 5000 });
    await skeletonLabel.click();
    await page.waitForTimeout(500);
    console.log('✅ Selected "Load with skeleton data" option');

    // Click Load button
    const loadButton = page.locator('button:has-text("Load Otto")').or(
      page.locator('button:has-text("Load Model")')
    );
    await expect(loadButton).toBeVisible({ timeout: 5000 });
    
    // Clear existing errors before loading
    propertyBindingErrors.length = 0;
    
    await loadButton.click();
    console.log('✅ Clicked Load button');
    
    // Wait for model to load completely - this might take a while
    console.log('⏳ Waiting for Otto model with skeleton to load...');
    await page.waitForTimeout(15000); // Give more time for loading
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/05-otto-loaded-with-skeleton.png', fullPage: true });

    // Check if animation controls are available
    const animationSelect = page.locator('select').filter({ hasText: 'Select Animation' }).or(
      page.locator('select').filter({ has: page.locator('option:has-text("Pickup2")') })
    ).or(
      page.locator('[role="combobox"]').filter({ hasText: 'Select Animation' })
    );
    
    // Wait for animation selector to appear
    console.log('⏳ Waiting for animation controls...');
    await expect(animationSelect).toBeVisible({ timeout: 20000 });
    console.log('✅ Animation controls found');

    // Look for Pickup2 animation specifically - first try with regular select
    let animationOptions = await page.$$eval('select option', options => 
      options
        .map(option => ({ value: option.value, text: option.textContent }))
        .filter(option => option.text && option.text.includes('Pickup2'))
    ).catch(() => []);

    if (animationOptions.length === 0) {
      // If no regular select options, try clicking the combobox and looking for Pickup2
      const animationCombobox = page.locator('[role="combobox"]').filter({ hasText: 'Select Animation' }).or(
        page.locator('text=-- Select Animation --').locator('..')
      );
      
      if (await animationCombobox.isVisible()) {
        await animationCombobox.click();
        await page.waitForTimeout(1000);
        
        // Look for Pickup2 in dropdown options
        const pickup2Option = page.getByRole('option', { name: /Pickup2/i });
        if (await pickup2Option.isVisible()) {
          animationOptions = [{ value: 'pickup2', text: 'Pickup2' }];
        }
      }
    }

    console.log('Available Pickup2 animations:', animationOptions);

    if (animationOptions.length === 0) {
      // List all available animations for debugging
      const allOptions = await page.$$eval('select option', options => 
        options.map(option => ({ value: option.value, text: option.textContent }))
      ).catch(() => []);
      console.log('All available animations:', allOptions);
      
      // Also try to get combobox options
      const comboboxOpen = page.locator('[role="combobox"]').filter({ hasText: 'Select Animation' });
      if (await comboboxOpen.isVisible()) {
        await comboboxOpen.click();
        await page.waitForTimeout(1000);
        const allComboOptions = await page.$$eval('[role="option"]', options => 
          options.map(option => ({ value: option.getAttribute('data-value'), text: option.textContent }))
        ).catch(() => []);
        console.log('All available combobox options:', allComboOptions);
      }
      
      throw new Error('Pickup2 animation not found');
    }

    const pickup2Option = animationOptions[0];
    console.log('✅ Found Pickup2 animation:', pickup2Option);

    // Select Pickup2 animation
    if (await page.locator('select').isVisible()) {
      await animationSelect.selectOption(pickup2Option.value);
    } else {
      // Use combobox approach
      const pickup2OptionElement = page.getByRole('option', { name: /Pickup2/i });
      await pickup2OptionElement.click();
    }
    await page.waitForTimeout(2000);
    console.log('✅ Selected Pickup2 animation');

    // Take screenshot with animation selected
    await page.screenshot({ path: 'screenshots/06-pickup2-selected.png', fullPage: true });

    // Clear PropertyBinding errors before playing animation
    propertyBindingErrors.length = 0;
    
    // Find and click the play button - look for button with Play icon
    const playButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(playButton).toBeVisible({ timeout: 5000 });
    
    console.log('🎮 Playing Pickup2 animation...');
    await playButton.click();
    
    // Wait for animation to start and any PropertyBinding errors to occur
    await page.waitForTimeout(5000);
    
    // Take screenshot while animation is playing
    await page.screenshot({ path: 'screenshots/07-pickup2-playing.png', fullPage: true });

    // Wait a bit more to catch any delayed PropertyBinding errors
    await page.waitForTimeout(3000);

    // Log detailed results
    console.log('\n=== DETAILED TEST RESULTS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
    console.log(`Three.js errors/warnings found: ${threeJsErrors.length}`);

    if (propertyBindingErrors.length > 0) {
      console.log('\n🔥 PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors found');
    }

    if (threeJsErrors.length > 0) {
      console.log('\n⚠️ Three.js errors/warnings detected:');
      threeJsErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Show recent console messages for debugging
    console.log('\n📋 Recent console messages (last 20):');
    consoleMessages.slice(-20).forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });

    // The test should fail if PropertyBinding errors are found
    if (propertyBindingErrors.length > 0) {
      throw new Error(`❌ Found ${propertyBindingErrors.length} PropertyBinding errors when playing Pickup2 animation. Skeleton system needs fixing.`);
    }

    console.log('\n🎉 Test passed: No PropertyBinding errors found when playing Pickup2 animation');
  });
});