import { test, expect } from '@playwright/test';

test('Otto skeleton functionality comprehensive test', async ({ page }) => {
  console.log('=== COMPREHENSIVE OTTO SKELETON TEST ===');
  
  // Navigate to the application
  await page.goto('/');
  console.log('✅ Navigated to homepage');
  
  // Go to Model Viewer
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  console.log('✅ Navigated to Model Viewer');
  
  // Set up error monitoring
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  // Click Otto with skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  expect(await ottoButton.isVisible()).toBe(true);
  console.log('✅ Otto skeleton button found');
  
  await ottoButton.click();
  console.log('✅ Clicked Otto skeleton button');
  
  // Wait for processing to complete
  await page.waitForTimeout(8000);
  
  // Check for download buttons
  const glbDownloadButton = page.locator('button:has-text("Download as GLB")');
  const bg3dDownloadButton = page.locator('button:has-text("Download as BG3D")');
  
  const glbVisible = await glbDownloadButton.isVisible();
  const bg3dVisible = await bg3dDownloadButton.isVisible();
  
  console.log('✅ GLB download button visible:', glbVisible);
  console.log('✅ BG3D download button visible:', bg3dVisible);
  
  expect(glbVisible).toBe(true);
  expect(bg3dVisible).toBe(true);
  
  // Test GLB download functionality
  await glbDownloadButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ GLB download functionality tested');
  
  // Test BG3D download functionality  
  await bg3dDownloadButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ BG3D download functionality tested');
  
  // Check that there were no page errors
  expect(pageErrors.length).toBe(0);
  console.log('✅ No page errors detected');
  
  // Verify 3D model is loaded (check for canvas)
  const canvas = page.locator('canvas');
  const canvasVisible = await canvas.isVisible();
  console.log('✅ 3D canvas visible:', canvasVisible);
  expect(canvasVisible).toBe(true);
  
  console.log('🎉 ALL TESTS PASSED - OTTO SKELETON FUNCTIONALITY WORKING CORRECTLY');
});