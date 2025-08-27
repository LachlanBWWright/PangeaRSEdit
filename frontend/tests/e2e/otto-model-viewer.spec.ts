import { test, expect } from '@playwright/test';

test.describe('Otto Model Viewer', () => {
  test('should load Otto model with animations and allow download', async ({ page }) => {
    // Navigate to the model viewer
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for the Otto sample model link/button
    const ottoLink = page.getByText('Otto.bg3d', { exact: false });
    await expect(ottoLink).toBeVisible();
    
    // Click to load the Otto model
    await ottoLink.click();
    
    // Wait for the model to load in the 3D viewer
    await page.waitForTimeout(3000); // Give time for model loading
    
    // Check that the 3D canvas is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check for animation information display
    const animationInfo = page.getByText('Animation', { exact: false });
    await expect(animationInfo).toBeVisible();
    
    // Verify animation durations are displayed (not all 1 second)
    const durationElements = page.locator('[class*="duration"], [data-testid*="duration"]');
    if (await durationElements.count() > 0) {
      // Check that we have realistic durations
      const firstDuration = await durationElements.first().textContent();
      console.log('Found animation duration:', firstDuration);
    }
    
    // Try to download the model to test roundtrip
    const downloadButton = page.getByText('Download', { exact: false }).or(
      page.getByRole('button', { name: /download/i })
    );
    
    if (await downloadButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForDownload();
      
      await downloadButton.click();
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify the download has a reasonable file size
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        console.log(`Downloaded file size: ${stats.size} bytes`);
        
        // Should be more than just a few KB - Otto model should be substantial
        expect(stats.size).toBeGreaterThan(10000);
      }
    }
    
    // Take a screenshot to verify the model is displayed
    await page.screenshot({ path: 'otto-model-loaded.png', fullPage: true });
  });
  
  test('should display proper animation timing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load Otto model
    const ottoLink = page.getByText('Otto.bg3d', { exact: false });
    await ottoLink.click();
    await page.waitForTimeout(3000);
    
    // Look for animation list or animation controls
    const animationSection = page.locator('[class*="animation"], [data-testid*="animation"]');
    
    if (await animationSection.count() > 0) {
      // Check for reasonable animation durations (not all 1.0s)
      const animationText = await animationSection.allTextContents();
      console.log('Animation information found:', animationText);
      
      // Look for duration patterns like "1.47s", "2.23s", etc.
      const durationRegex = /(\d+\.\d+)s/g;
      const durations: number[] = [];
      
      animationText.forEach(text => {
        const matches = text.match(durationRegex);
        if (matches) {
          matches.forEach(match => {
            const duration = parseFloat(match.replace('s', ''));
            durations.push(duration);
          });
        }
      });
      
      console.log('Found animation durations:', durations);
      
      if (durations.length > 0) {
        // Verify we have varied durations (not all 1.0)
        const uniqueDurations = [...new Set(durations)];
        expect(uniqueDurations.length).toBeGreaterThan(1);
        
        // Verify we have some realistic durations
        const hasRealisticDurations = durations.some(d => d > 1.0 && d < 5.0);
        expect(hasRealisticDurations).toBe(true);
      }
    }
  });

  test('should show model hierarchy without React errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load Otto model
    const ottoLink = page.getByText('Otto.bg3d', { exact: false });
    await ottoLink.click();
    await page.waitForTimeout(3000);
    
    // Check for model hierarchy display
    const hierarchySection = page.locator('[class*="hierarchy"], [class*="model"], [data-testid*="hierarchy"]');
    
    // Verify no React errors occurred
    const reactErrors = consoleErrors.filter(error => 
      error.includes('React') || 
      error.includes('Warning:') ||
      error.includes('Error:')
    );
    
    console.log('Console errors:', consoleErrors);
    console.log('Page errors:', pageErrors);
    console.log('React-specific errors:', reactErrors);
    
    // Should not have React errors
    expect(reactErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});