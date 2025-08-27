import { test, expect } from '@playwright/test';

test('Otto Model Viewer Screenshot Debug', async ({ page }) => {
  console.log('=== OTTO MODEL VIEWER DEBUGGING ===');
  
  // Navigate to the application
  await page.goto('/');
  console.log('✅ Navigated to homepage');
  
  // Go to Model Viewer
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  console.log('✅ Navigated to Model Viewer');
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/debug-initial.png', fullPage: true });
  console.log('✅ Initial screenshot captured');
  
  // Check what buttons are actually present
  const allButtons = await page.locator('button').allTextContents();
  console.log('All buttons found:', allButtons);
  
  // Look for Otto button with different text patterns
  const ottoButtons = [
    'Load Otto.bg3d Sample Model (with Skeleton)',
    'Otto.bg3d Sample Model (with Skeleton)',
    'with Skeleton'
  ];
  
  for (const buttonText of ottoButtons) {
    const button = page.locator(`button:has-text("${buttonText}")`);
    const count = await button.count();
    console.log(`Buttons containing "${buttonText}": ${count}`);
    if (count > 0) {
      console.log('Found Otto button, clicking...');
      await button.first().click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/tmp/debug-after-click.png', fullPage: true });
      console.log('✅ After-click screenshot captured');
      break;
    }
  }
  
  // Check console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  await page.waitForTimeout(2000);
  console.log('Console logs:', logs);
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/debug-final.png', fullPage: true });
  console.log('✅ Final screenshot captured');
});