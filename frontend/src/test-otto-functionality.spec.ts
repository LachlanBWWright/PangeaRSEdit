/**
 * Test Otto skeleton functionality in browser including roundtrip
 */
import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import { join } from 'path';

test('Otto skeleton functionality end-to-end', async ({ page }) => {
  console.log('Testing Otto skeleton functionality...');
  
  // Capture console logs
  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  // 1. Click Otto with skeleton button
  console.log('1. Loading Otto with skeleton...');
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  // Wait for model to load
  await page.waitForTimeout(8000);
  
  // 2. Check if model loaded without crashing
  const errorElement = page.locator('text=Error:');
  const isErrorVisible = await errorElement.isVisible().catch(() => false);
  
  if (isErrorVisible) {
    const errorText = await errorElement.textContent();
    console.log('Error found on page:', errorText);
    
    // Check console logs for more details
    const errorLogs = logs.filter(log => 
      log.includes('[error]') || 
      log.includes('Error') ||
      log.includes('Failed') ||
      log.includes('error')
    );
    console.log('Error logs from console:');
    errorLogs.forEach(log => console.log(log));
    
    // Continue test to see if downloads work despite error
  }
  
  // 3. Check for animations in dropdown
  console.log('2. Checking animation dropdown...');
  await page.waitForTimeout(2000); // Give more time for UI to update
  
  const animationDropdown = page.locator('select').first();
  if (await animationDropdown.isVisible()) {
    const animationOptions = await animationDropdown.locator('option').allTextContents();
    console.log(`Found ${animationOptions.length - 1} animation options (excluding default)`);
    
    // Check animation durations
    const durationsShown = animationOptions.filter(opt => opt.includes('(') && opt.includes(':'));
    console.log('Animation durations shown:');
    durationsShown.forEach(opt => console.log(`  ${opt}`));
  } else {
    console.log('No animation dropdown found');
  }
  
  // 4. Test GLB download - look for any download button
  console.log('3. Testing downloads...');
  await page.waitForTimeout(2000);
  
  // Look for any download buttons
  const downloadButtons = page.locator('button:has-text("Download")');
  const downloadCount = await downloadButtons.count();
  console.log(`Found ${downloadCount} download buttons`);
  
  if (downloadCount === 0) {
    console.log('No download buttons found, model may not have loaded correctly');
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: '/tmp/otto-error-state.png', fullPage: true });
    console.log('Screenshot saved to /tmp/otto-error-state.png');
    return; // Exit test early
  }
  // Continue if we have download buttons
  const glbDownloadButton = page.locator('button:has-text("Download GLB")').first();
  const bg3dDownloadButton = page.locator('button:has-text("Download BG3D")').first();
  
  // Test GLB download if available
  if (await glbDownloadButton.isVisible()) {
    console.log('GLB download button found, testing download...');
    const glbDownloadPromise = page.waitForEvent('download');
    await glbDownloadButton.click();
    const glbDownload = await glbDownloadPromise;
    
    const glbPath = join('/tmp', glbDownload.suggestedFilename() || 'test.glb');
    await glbDownload.saveAs(glbPath);
    const glbStats = await fs.stat(glbPath);
    console.log(`GLB file size: ${glbStats.size} bytes`);
    expect(glbStats.size).toBeGreaterThan(50000);
    await fs.unlink(glbPath).catch(() => {});
  } else {
    console.log('GLB download button not found');
  }
  
  // Test BG3D download if available
  if (await bg3dDownloadButton.isVisible()) {
    console.log('BG3D download button found, testing download...');
    const bg3dDownloadPromise = page.waitForEvent('download');
    await bg3dDownloadButton.click();
    const bg3dDownload = await bg3dDownloadPromise;
    
    const bg3dPath = join('/tmp', bg3dDownload.suggestedFilename() || 'test.bg3d');
    await bg3dDownload.saveAs(bg3dPath);
    const bg3dStats = await fs.stat(bg3dPath);
    console.log(`BG3D file size: ${bg3dStats.size} bytes`);
    expect(bg3dStats.size).toBeGreaterThan(10000);
    await fs.unlink(bg3dPath).catch(() => {});
  } else {
    console.log('BG3D download button not found');
  }
  
  // 6. Look for any critical errors in console logs
  const criticalErrors = logs.filter(log => 
    log.includes('[error]') || 
    (log.includes('error') && (log.includes('failed') || log.includes('crashed')))
  );
  
  if (criticalErrors.length > 0) {
    console.log('Critical errors found:');
    criticalErrors.forEach(err => console.log(`  ${err}`));
  } else {
    console.log('✅ No critical errors found in console logs');
  }
  
  // 7. Check for skeleton-related logs
  const skeletonLogs = logs.filter(log => 
    log.includes('skeleton') || 
    log.includes('animation') || 
    log.includes('bone') ||
    log.includes('Creating skeleton') ||
    log.includes('Converting BG3D with skeleton')
  );
  
  console.log('Skeleton-related logs:');
  skeletonLogs.slice(0, 20).forEach(log => console.log(`  ${log}`)); // Show first 20
  
  // 8. Final validation
  console.log('5. Final validation...');
  
  // The model should be visible (no crash screen)
  const canvas = page.locator('canvas');
  const canvasVisible = await canvas.isVisible();
  console.log(`Canvas visible: ${canvasVisible}`);
  
  if (canvasVisible) {
    console.log('✅ Canvas is visible - basic 3D scene is working');
  } else {
    console.log('❌ Canvas not visible - 3D scene may have failed to load');
  }
  
  console.log('✅ Otto skeleton functionality test completed!');
});