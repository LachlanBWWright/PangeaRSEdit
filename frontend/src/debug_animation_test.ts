/**
 * Debug test to check animation durations in glTF
 */
import { test, expect } from '@playwright/test';

test('Debug Animation Durations in Browser', async ({ page }) => {
  console.log('Debugging animation durations...');
  
  // Add console log capture
  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // Load Otto with skeleton
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  console.log('Waiting for model to load...');
  await page.waitForTimeout(10000);
  
  // Look for animation console logs
  const animationLogs = logs.filter(log => 
    log.includes('Found') && log.includes('animation') ||
    log.includes('duration') ||
    log.includes('clip') ||
    log.includes('Animation')
  );
  
  console.log('Animation-related console logs:');
  animationLogs.forEach(log => console.log(log));
  
  // Check what animations are detected
  const animationDropdown = page.locator('select').first();
  if (await animationDropdown.isVisible()) {
    const animationOptions = await animationDropdown.locator('option').allTextContents();
    console.log('Animation options in dropdown:');
    animationOptions.forEach((opt, i) => {
      if (i > 0) { // Skip "-- Select Animation --" option
        console.log(`  ${i}: ${opt}`);
      }
    });
    
    // Check if we have proper durations (not all 0:01.00)
    const nonDefaultDurations = animationOptions.filter(opt => 
      opt.includes('(') && !opt.includes('(0:01.00)')
    );
    console.log(`Found ${nonDefaultDurations.length} animations with non-default durations`);
    if (nonDefaultDurations.length > 0) {
      console.log('✅ SUCCESS: Animation durations are working!');
    } else {
      console.log('❌ ISSUE: All animations still show 0:01.00');
    }
  }
  
  console.log('All console logs:');
  logs.forEach(log => console.log(log));
});