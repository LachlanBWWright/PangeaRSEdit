/**
 * Simplified test to debug Otto loading issues
 */
import { test, expect } from '@playwright/test';

test('debug Otto model loading', async ({ page }) => {
  // Listen for console messages to debug
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.toString());
  });

  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of initial state
  await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_01_initial.png' });
  
  // Click Otto sample button (with skeleton)
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  console.log('Looking for Otto button...');
  
  if (await ottoButton.isVisible()) {
    console.log('Otto button found, clicking...');
    await ottoButton.click();
    
    // Wait longer for model to load
    await page.waitForTimeout(10000);
    
    // Take screenshot after model loads
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_02_otto_loaded.png' });
    
    // Look for any animation dropdown or control
    const animationSelects = await page.locator('select').all();
    console.log(`Found ${animationSelects.length} select elements`);
    
    for (let i = 0; i < animationSelects.length; i++) {
      const selectText = await animationSelects[i].textContent();
      console.log(`Select ${i}: ${selectText}`);
    }
    
    // Look for animation viewer component
    const animationCard = page.locator('.card', { hasText: 'Animation' });
    const isAnimationCardVisible = await animationCard.isVisible();
    console.log('Animation card visible:', isAnimationCardVisible);
    
    if (isAnimationCardVisible) {
      await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_03_animation_card.png' });
    }
    
  } else {
    console.log('Otto button not found!');
  }
  
  // Print recent console messages
  console.log('Recent console messages:');
  consoleMessages.slice(-10).forEach(msg => console.log(msg));
});

test('debug Otto without skeleton', async ({ page }) => {
  // Listen for console messages
  page.on('console', msg => {
    console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
  });

  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // Click Otto sample button (without skeleton)
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (without Skeleton)")');
  
  if (await ottoButton.isVisible()) {
    console.log('Otto without skeleton button found, clicking...');
    await ottoButton.click();
    
    await page.waitForTimeout(8000);
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_04_otto_no_skeleton.png' });
  }
});