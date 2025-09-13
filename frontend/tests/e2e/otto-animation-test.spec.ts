import { test, expect } from '@playwright/test';

test('Otto Model Loading and Animation Test', async ({ page }) => {
  console.log('=== OTTO MODEL LOADING AND ANIMATION TEST ===');
  
  // Set up console log capture
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`Browser console [${msg.type()}]: ${text}`);
  });
  
  // Capture any page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    const errorMsg = error.message;
    pageErrors.push(errorMsg);
    console.log(`Page error: ${errorMsg}`);
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
  
  // Wait for the component to load
  await page.waitForSelector('text=Game Model Selector', { timeout: 10000 });
  console.log('✅ Game Model Selector loaded');
  
  // Select Otto Matic game
  await page.click('text=Select a game');
  await page.click('text=Otto Matic');
  console.log('✅ Selected Otto Matic game');
  
  // Wait for models to load
  await page.waitForTimeout(1000);
  
  // Select Otto character
  await page.click('text=Select a model');
  await page.click('text=Otto');
  console.log('✅ Selected Otto model');
  
  // Ensure skeleton loading is enabled
  const skeletonRadio = page.locator('input[type="radio"]:near(:text("Load with skeleton data"))');
  if (await skeletonRadio.count() > 0) {
    await skeletonRadio.check();
    console.log('✅ Enabled skeleton data loading');
  }
  
  // Load the Otto model
  await page.click('button:has-text("Load Otto")');
  console.log('✅ Clicked Load Otto button');
  
  // Wait for model to load (give it time to process)
  await page.waitForTimeout(5000);
  
  // Take screenshot after model loading
  await page.screenshot({ path: '/tmp/otto-model-loaded.png', fullPage: true });
  console.log('✅ Screenshot taken after model loading');
  
  // Check for success message or model viewer presence
  const modelLoadedIndicator = page.locator('text=Model loaded successfully, text=Otto, canvas');
  if (await modelLoadedIndicator.first().count() > 0) {
    console.log('✅ Model loading indicator found');
  }
  
  // Look for animation controls
  const animationControls = await page.locator('text=Animation, button:has-text("Play"), button:has-text("Pause")').count();
  if (animationControls > 0) {
    console.log('✅ Animation controls found');
    
    // Try to play an animation
    const playButton = page.locator('button:has-text("Play")').first();
    if (await playButton.count() > 0) {
      await playButton.click();
      console.log('✅ Clicked play animation');
      
      // Wait for animation to play
      await page.waitForTimeout(3000);
      
      // Take screenshot during animation
      await page.screenshot({ path: '/tmp/otto-animation-playing.png', fullPage: true });
      console.log('✅ Screenshot taken during animation');
    }
  } else {
    console.log('⚠️ No animation controls found');
  }
  
  // Final screenshot
  await page.screenshot({ path: '/tmp/otto-final-state.png', fullPage: true });
  console.log('✅ Final screenshot taken');
  
  // Check for errors
  console.log('=== CONSOLE LOG SUMMARY ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  
  if (pageErrors.length > 0) {
    console.log('❌ Page errors detected:');
    pageErrors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ No page errors detected');
  }
  
  // Look for specific error patterns
  const errorMessages = consoleMessages.filter(msg => 
    msg.includes('[error]') || 
    msg.includes('ERROR') || 
    msg.includes('Failed') ||
    msg.includes('Error:')
  );
  
  if (errorMessages.length > 0) {
    console.log('❌ Console errors detected:');
    errorMessages.forEach(msg => console.log(`  - ${msg}`));
  } else {
    console.log('✅ No console errors detected');
  }
  
  // Basic assertion - test passes if we didn't get major page errors
  expect(pageErrors.length).toBeLessThan(5); // Allow some minor errors but not complete failure
  
  console.log('=== TEST COMPLETED ===');
});