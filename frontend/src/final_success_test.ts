/**
 * Final test to capture the working animation system
 */
import { test, expect } from '@playwright/test';

test('Otto Animation System - Final Success Documentation', async ({ page }) => {
  console.log('Testing final working Otto animation system...');
  
  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // Load Otto with skeleton
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  console.log('Waiting for model to load...');
  await page.waitForTimeout(8000);
  
  // Take screenshot of working system
  await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/otto_animation_system_working.png' });
  
  // Verify animation dropdown is working
  const animationDropdown = page.locator('select').filter({ hasText: 'Animation' }).first();
  await expect(animationDropdown).toBeVisible();
  
  // Get animation count
  const animationOptions = await animationDropdown.locator('option').allTextContents();
  console.log(`SUCCESS: Found ${animationOptions.length - 1} animations in working system`);
  
  expect(animationOptions.length).toBeGreaterThan(10); // Should have many animations
});