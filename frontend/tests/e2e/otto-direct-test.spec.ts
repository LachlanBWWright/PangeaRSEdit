import { test, expect } from '@playwright/test';

test('Otto Model Test - Direct Approach', async ({ page }) => {
  console.log('=== OTTO MODEL DIRECT TEST ===');
  
  // Set up console log capture
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error' || text.includes('ERROR') || text.includes('Failed')) {
      console.log(`🔥 Browser console [${msg.type()}]: ${text}`);
    }
  });
  
  // Capture any page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    const errorMsg = error.message;
    pageErrors.push(errorMsg);
    console.log(`🔥 Page error: ${errorMsg}`);
  });
  
  // Navigate to the application
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  console.log('✅ Navigated to homepage');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Go to Model Viewer
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  console.log('✅ Navigated to Model Viewer');
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/otto-test-initial.png', fullPage: true });
  console.log('✅ Initial screenshot taken');
  
  // Wait for the game selector to be available
  await page.waitForSelector('text=Game Model Selector', { timeout: 10000 });
  
  // Select Otto Matic game first
  const gameSelector = page.locator('select, [role="combobox"]').first();
  if (await gameSelector.count() > 0) {
    await gameSelector.click();
    await page.waitForTimeout(500);
    await page.keyboard.type('Otto Matic');
    await page.keyboard.press('Enter');
    console.log('✅ Selected Otto Matic game via keyboard');
  } else {
    // Try alternative approach
    const gameButton = page.locator('text=Select a game');
    if (await gameButton.count() > 0) {
      await gameButton.click();
      await page.waitForTimeout(500);
      await page.click('text=Otto Matic');
      console.log('✅ Selected Otto Matic game via click');
    }
  }
  
  // Wait for models to populate
  await page.waitForTimeout(2000);
  
  // Take screenshot after game selection
  await page.screenshot({ path: '/tmp/otto-test-game-selected.png', fullPage: true });
  console.log('✅ Game selection screenshot taken');
  
  // Try to select Otto model - use more specific selector
  const modelButton = page.locator('text=Select a model');
  if (await modelButton.count() > 0) {
    await modelButton.click();
    await page.waitForTimeout(500);
    
    // Look for Otto in the dropdown - try different approaches
    const ottoOption = page.locator('[role="option"]:has-text("Otto")').first();
    if (await ottoOption.count() > 0) {
      await ottoOption.click();
      console.log('✅ Selected Otto model via role option');
    } else {
      // Try direct text click with force
      await page.click('text=Otto', { force: true });
      console.log('✅ Selected Otto model via force click');
    }
  }
  
  await page.waitForTimeout(1000);
  
  // Take screenshot after model selection
  await page.screenshot({ path: '/tmp/otto-test-model-selected.png', fullPage: true });
  console.log('✅ Model selection screenshot taken');
  
  // Look for the Load button
  const loadButtons = await page.locator('button').allTextContents();
  console.log('Available buttons:', loadButtons);
  
  // Try to find and click the load button
  const loadButton = page.locator('button:has-text("Load"), button:has-text("Otto")').first();
  if (await loadButton.count() > 0) {
    await loadButton.click();
    console.log('✅ Clicked load button');
    
    // Wait for model loading
    await page.waitForTimeout(8000);
    
    // Take screenshot after loading attempt
    await page.screenshot({ path: '/tmp/otto-test-after-loading.png', fullPage: true });
    console.log('✅ Post-loading screenshot taken');
  } else {
    console.log('⚠️ Load button not found');
  }
  
  // Check for canvas or model display
  const canvas = page.locator('canvas');
  if (await canvas.count() > 0) {
    console.log('✅ Canvas element found - model likely loaded');
  } else {
    console.log('⚠️ No canvas element found');
  }
  
  // Look for animation controls
  const animControls = await page.locator('text=Animation, text=Play, text=Pause').count();
  console.log(`Animation controls found: ${animControls}`);
  
  // Final screenshot
  await page.screenshot({ path: '/tmp/otto-test-final.png', fullPage: true });
  console.log('✅ Final screenshot taken');
  
  // Check for errors
  console.log('=== FINAL REPORT ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  
  // Look for error patterns
  const errorMessages = consoleMessages.filter(msg => 
    msg.includes('[error]') || 
    msg.toLowerCase().includes('error') || 
    msg.toLowerCase().includes('failed')
  );
  
  console.log(`Console errors: ${errorMessages.length}`);
  if (errorMessages.length > 0) {
    console.log('Error messages:');
    errorMessages.slice(0, 5).forEach(msg => console.log(`  - ${msg}`));
  }
  
  // Test passes if no major page errors
  expect(pageErrors.length).toBeLessThan(3);
  
  console.log('=== TEST COMPLETED ===');
});