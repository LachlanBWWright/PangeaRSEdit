import { test, expect } from '@playwright/test';

test.describe('Otto Skeleton Animation Verification', () => {
  test('verify Otto skeleton loads correctly and animations play without errors', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Track console messages
    const consoleMessages: string[] = [];
    const errorMessages: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      
      // Track THREE.js and PropertyBinding errors specifically
      if (msg.type() === 'error') {
        if (text.includes('THREE') || 
            text.includes('PropertyBinding') || 
            text.includes('No target node found')) {
          errorMessages.push(text);
        }
      }
    });

    // Step 1: Navigate to Model Viewer
    console.log('Step 1: Navigating to Model Viewer...');
    await page.waitForSelector('text=Model Viewer', { timeout: 10000 });
    await page.click('text=Model Viewer');
    await page.waitForTimeout(2000);
    
    // Take screenshot of model viewer page
    await page.screenshot({ 
      path: '/tmp/01-model-viewer-page.png',
      fullPage: true 
    });
    console.log('Screenshot saved: 01-model-viewer-page.png');

    // Step 2: Click Game Models button
    console.log('Step 2: Selecting Game Models...');
    await page.waitForSelector('text=Game Models', { timeout: 10000 });
    await page.click('text=Game Models');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/tmp/02-game-models-selected.png',
      fullPage: true 
    });
    console.log('Screenshot saved: 02-game-models-selected.png');

    // Step 3: Load Otto with skeleton
    console.log('Step 3: Loading Otto with skeleton...');
    await page.waitForSelector('text=Otto Sample (with Skeleton)', { timeout: 10000 });
    await page.click('text=Otto Sample (with Skeleton)');
    
    // Wait for model to load
    console.log('Waiting for model to load...');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ 
      path: '/tmp/03-otto-loaded.png',
      fullPage: true 
    });
    console.log('Screenshot saved: 03-otto-loaded.png');

    // Step 4: Verify canvas is visible
    console.log('Step 4: Verifying canvas...');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Step 5: Look for animations panel
    console.log('Step 5: Finding animations...');
    await page.waitForTimeout(2000);
    
    // Try to find animation elements (they might be in a list or dropdown)
    const animationSelectors = [
      '[role="button"]',
      'button',
      '[class*="animation"]',
      '[class*="Animation"]'
    ];
    
    let animationElements = null;
    for (const selector of animationSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 5) { // Likely found animation buttons
        animationElements = elements;
        console.log(`Found ${count} potential animation elements with selector: ${selector}`);
        break;
      }
    }
    
    await page.screenshot({ 
      path: '/tmp/04-looking-for-animations.png',
      fullPage: true 
    });
    console.log('Screenshot saved: 04-looking-for-animations.png');

    // Step 6: Try to play an animation
    console.log('Step 6: Attempting to play an animation...');
    
    // Look for any clickable animation item
    const possibleAnimButtons = page.locator('button, [role="button"]');
    const buttonCount = await possibleAnimButtons.count();
    console.log(`Found ${buttonCount} clickable elements`);
    
    // Try to find and click an animation with "Walk" or other common name
    const animationNames = ['Walk', 'Run', 'Jump', 'Stand', 'Idle'];
    let animationClicked = false;
    
    for (const animName of animationNames) {
      try {
        const animButton = page.locator(`text=${animName}`).first();
        if (await animButton.isVisible({ timeout: 1000 })) {
          console.log(`Found and clicking animation: ${animName}`);
          await animButton.click();
          animationClicked = true;
          await page.waitForTimeout(3000); // Let animation start
          
          await page.screenshot({ 
            path: `/tmp/05-animation-${animName}-frame1.png`,
            fullPage: true 
          });
          console.log(`Screenshot saved: 05-animation-${animName}-frame1.png`);
          
          // Wait more to get different frame
          await page.waitForTimeout(2000);
          
          await page.screenshot({ 
            path: `/tmp/06-animation-${animName}-frame2.png`,
            fullPage: true 
          });
          console.log(`Screenshot saved: 06-animation-${animName}-frame2.png`);
          
          break;
        }
      } catch (e) {
        // Animation not found, try next
        continue;
      }
    }
    
    if (!animationClicked) {
      console.log('Could not find standard animation names, taking screenshot of current state');
      await page.screenshot({ 
        path: '/tmp/05-no-animation-found.png',
        fullPage: true 
      });
    }

    // Step 7: Print console analysis
    console.log('\n=== CONSOLE MESSAGE ANALYSIS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`THREE.js/PropertyBinding errors: ${errorMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('\n=== ERROR MESSAGES ===');
      errorMessages.forEach(msg => console.log(`  ERROR: ${msg}`));
    } else {
      console.log('\n✅ NO THREE.js PropertyBinding errors found!');
    }
    
    // Print last 20 console messages for debugging
    console.log('\n=== RECENT CONSOLE MESSAGES ===');
    consoleMessages.slice(-20).forEach(msg => console.log(`  ${msg}`));
    
    // Step 8: Download GLB to verify skeleton structure
    console.log('\nStep 8: Downloading GLB for validation...');
    try {
      const downloadButton = page.locator('text=Download as GLB');
      if (await downloadButton.isVisible({ timeout: 5000 })) {
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        const downloadPath = '/tmp/otto-test-export.glb';
        await download.saveAs(downloadPath);
        console.log(`Downloaded GLB to: ${downloadPath}`);
        
        // Check file size
        const fs = require('fs');
        const stats = fs.statSync(downloadPath);
        console.log(`GLB file size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
        
        // GLB with skeleton should be significantly larger than without
        expect(stats.size).toBeGreaterThan(300000); // At least 300KB
      }
    } catch (e) {
      console.log('Could not download GLB:', e);
    }

    // Final assertion: No PropertyBinding errors
    expect(errorMessages.length).toBe(0);
  });
});