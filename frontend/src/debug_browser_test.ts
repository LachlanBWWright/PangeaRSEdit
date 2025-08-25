/**
 * Debug test to see what's happening in the browser
 */
import { test, expect } from '@playwright/test';

test('Debug Otto Browser Loading', async ({ page }) => {
  console.log('Starting debug test...');
  
  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what we're looking at
  await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_initial_load.png', fullPage: true });
  
  // Look for the Otto button with skeleton
  console.log('Looking for Otto button...');
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_before_otto_click.png', fullPage: true });
  
  // Check if button exists
  const buttonExists = await ottoButton.isVisible();
  console.log(`Otto button visible: ${buttonExists}`);
  
  if (buttonExists) {
    await ottoButton.click();
    console.log('Clicked Otto button, waiting...');
    await page.waitForTimeout(10000);
    
    // Take screenshot after loading
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/debug_after_otto_load.png', fullPage: true });
    
    // Look for animation controls
    const animationControls = page.locator('select');
    const animationCount = await animationControls.count();
    console.log(`Found ${animationCount} select elements`);
    
    // Check all select elements
    for (let i = 0; i < animationCount; i++) {
      const select = animationControls.nth(i);
      const text = await select.textContent();
      console.log(`Select ${i}: ${text}`);
    }
  } else {
    console.log('Otto button not found!');
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons total`);
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent();
      console.log(`Button ${i}: ${text}`);
    }
  }
});