import { test, expect } from '@playwright/test';

test('Take screenshot of Otto model loading state', async ({ page }) => {
  // Navigate to the Model Viewer
  await page.goto('/');
  await page.click('a:has-text("Model Viewer")');
  
  // Wait for the page to load
  await page.waitForSelector('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  
  // Take a screenshot before clicking
  await page.screenshot({ path: '/tmp/before-otto-click.png', fullPage: true });
  
  // Click the Otto with skeleton button
  await page.click('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  
  // Wait a few seconds for the model to load
  await page.waitForTimeout(5000);
  
  // Take a screenshot to see what happened
  await page.screenshot({ path: '/tmp/after-otto-click.png', fullPage: true });
  
  // Check if any buttons are visible
  const buttons = await page.locator('button').all();
  console.log('Found buttons:');
  for (const button of buttons) {
    const text = await button.textContent();
    const visible = await button.isVisible();
    console.log(`- "${text}": ${visible ? 'visible' : 'hidden'}`);
  }
  
  // Look specifically for model loading states
  const modelLoadingText = page.locator('text="Model loaded successfully"');
  const modelLoadingVisible = await modelLoadingText.isVisible();
  console.log('Model loaded successfully text visible:', modelLoadingVisible);
  
  // Check for error boundary
  const errorText = page.locator('text="Model Loading Error"');
  const errorVisible = await errorText.isVisible();
  console.log('Error boundary visible:', errorVisible);
});