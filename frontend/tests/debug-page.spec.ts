import { test, expect } from '@playwright/test';

test('Debug: Check Model Viewer page content', async ({ page }) => {
  await page.goto('http://localhost:5174/PangeaRSEdit/');
  
  // Navigate to Model Viewer
  await page.click('text=Model Viewer');
  await page.waitForTimeout(2000);
  
  // Take a screenshot to see what's on the page
  await page.screenshot({ path: '/tmp/model-viewer-debug.png', fullPage: true });
  
  // Get all button text
  const buttons = await page.locator('button').allTextContents();
  console.log('All buttons found on Model Viewer page:', buttons);
  
  // Look for Otto specifically
  const hasOttoSkeleton = await page.locator('text=Otto').and(page.locator('text=skeleton')).count();
  console.log('Otto skeleton buttons found:', hasOttoSkeleton);
  
  // Look for any text containing Otto or skeleton
  const ottoElements = await page.locator('text*=Otto').allTextContents();
  const skeletonElements = await page.locator('text*=skeleton').allTextContents();
  console.log('Elements containing Otto:', ottoElements);
  console.log('Elements containing skeleton:', skeletonElements);
  
  expect(true).toBe(true); // Just to pass the test
});