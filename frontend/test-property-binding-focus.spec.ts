import { test, expect } from '@playwright/test';

test.describe('Otto PropertyBinding Error Reproduction', () => {
  test('should load Otto with skeleton and trigger PropertyBinding errors when playing animation', async ({ page }) => {
    // Listen for all console messages to capture PropertyBinding errors
    const propertyBindingErrors: string[] = [];
    const allConsoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      if (text.includes('PropertyBinding')) {
        propertyBindingErrors.push(text);
        console.log('🔍 PropertyBinding error detected:', text);
      }
    });

    // Navigate to application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/pb-debug-01-initial.png', fullPage: true });
    
    // Switch to Upload Files mode first (to access original Otto files)
    const uploadFilesModeButton = page.locator('button:has-text("Upload Files")');
    if (await uploadFilesModeButton.isVisible()) {
      await uploadFilesModeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Upload Otto.bg3d
    console.log('Looking for Otto BG3D file upload...');
    const fileInputBG3D = page.locator('input[type="file"]').first();
    await fileInputBG3D.setInputFiles('/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.bg3d');
    await page.waitForTimeout(2000);
    
    // Take screenshot after BG3D upload
    await page.screenshot({ path: 'screenshots/pb-debug-02-bg3d-uploaded.png', fullPage: true });
    
    // Look for skeleton file upload section
    console.log('Looking for skeleton file upload...');
    const skeletonUploadSection = page.locator('text=Skeleton File').or(
      page.locator('text=Upload skeleton').or(
        page.locator('input[type="file"]').nth(1)
      )
    );
    
    if (await skeletonUploadSection.count() > 0) {
      // Try to upload skeleton file
      const fileInputSkeleton = page.locator('input[type="file"]').nth(1);
      if (await fileInputSkeleton.count() > 0) {
        await fileInputSkeleton.setInputFiles('/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.skeleton.rsrc');
        await page.waitForTimeout(2000);
        console.log('Uploaded skeleton file');
      }
    }
    
    // Look for "Load with skeleton" or similar option
    const skeletonLoadButton = page.locator('button:has-text("Load with skeleton")').or(
      page.locator('button:has-text("skeleton")').or(
        page.locator('text=skeleton').locator('..').locator('button')
      )
    );
    
    if (await skeletonLoadButton.count() > 0) {
      await skeletonLoadButton.click();
      console.log('Clicked skeleton load button');
      await page.waitForTimeout(3000);
    }
    
    // Take screenshot after skeleton loading attempt
    await page.screenshot({ path: 'screenshots/pb-debug-03-skeleton-loaded.png', fullPage: true });
    
    // Wait for model to load and look for animations
    await page.waitForTimeout(5000);
    
    // Look for animation controls
    console.log('Searching for animation controls...');
    
    // Multiple selectors for animation dropdown
    const animationSelectors = [
      'select:has(option:text("Pickup"))',
      'select:has(option:text("Walk"))', 
      'select:has(option:text("Standing"))',
      'select[class*="animation"]',
      'select[id*="animation"]',
      'text=Select Animation',
      'text=Animation'
    ];
    
    let animationSelector = null;
    for (const selector of animationSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        animationSelector = element;
        console.log(`Found animation control with selector: ${selector}`);
        break;
      }
    }
    
    if (animationSelector) {
      // Take screenshot with animation controls visible
      await page.screenshot({ path: 'screenshots/pb-debug-04-animation-controls.png', fullPage: true });
      
      // Get animation options
      const options = await animationSelector.locator('option').allTextContents();
      console.log('Available animations:', options);
      
      // Select an animation that's likely to trigger PropertyBinding errors
      const targetAnimations = ['Pickup2', 'Walk', 'Standing', 'WalkWithGun'];
      let selectedAnimation = null;
      
      for (const animName of targetAnimations) {
        const option = options.find(opt => opt.includes(animName));
        if (option) {
          selectedAnimation = option;
          console.log(`Selecting animation: ${option}`);
          await animationSelector.selectOption({ label: option });
          await page.waitForTimeout(2000);
          break;
        }
      }
      
      if (selectedAnimation) {
        // Take screenshot with animation selected
        await page.screenshot({ path: 'screenshots/pb-debug-05-animation-selected.png', fullPage: true });
        
        // Look for play button
        const playButtonSelectors = [
          'button:has-text("Play")',
          'button[title="Play"]',
          'button:has(svg[class*="play"])',
          'button[class*="play"]',
          '.play-button'
        ];
        
        let playButton = null;
        for (const selector of playButtonSelectors) {
          const element = page.locator(selector).first();
          if (await element.count() > 0 && await element.isVisible()) {
            playButton = element;
            console.log(`Found play button with selector: ${selector}`);
            break;
          }
        }
        
        if (playButton) {
          console.log(`🎬 Starting animation playback for "${selectedAnimation}"...`);
          
          // Click play and wait for PropertyBinding errors to occur
          await playButton.click();
          
          // Wait for animation to start and PropertyBinding to be attempted
          await page.waitForTimeout(3000);
          
          // Take screenshot during animation playback
          await page.screenshot({ path: 'screenshots/pb-debug-06-animation-playing.png', fullPage: true });
          
          console.log('Animation started, checking for PropertyBinding errors...');
        } else {
          console.log('❌ No play button found');
        }
      } else {
        console.log('❌ No suitable animation found in options');
      }
    } else {
      console.log('❌ No animation controls found');
      
      // Check what's actually on the page
      const allText = await page.textContent('body');
      console.log('Page content contains skeleton:', allText?.includes('skeleton'));
      console.log('Page content contains animation:', allText?.includes('animation'));
      console.log('Page content contains bone:', allText?.includes('bone'));
    }
    
    // Final results
    console.log('\n=== FINAL ANALYSIS ===');
    console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
    console.log(`Total console messages: ${allConsoleMessages.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors detected:');
      propertyBindingErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors detected');
    }
    
    // Show recent skeleton/animation related messages
    const relevantMessages = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('skeleton') ||
      msg.toLowerCase().includes('animation') ||
      msg.toLowerCase().includes('bone') ||
      msg.toLowerCase().includes('joint') ||
      msg.toLowerCase().includes('three')
    ).slice(-15);
    
    console.log('\n📋 Recent skeleton/animation messages:');
    relevantMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg}`);
    });
    
    // If we didn't find PropertyBinding errors, this might indicate the issue is resolved
    // OR that we're not triggering the right conditions
    if (propertyBindingErrors.length === 0) {
      console.log('\n🤔 No PropertyBinding errors found. This could mean:');
      console.log('  1. The issue has been fixed');
      console.log('  2. Animation system is not loading properly'); 
      console.log('  3. Different conditions are needed to trigger the error');
    }
  });
});