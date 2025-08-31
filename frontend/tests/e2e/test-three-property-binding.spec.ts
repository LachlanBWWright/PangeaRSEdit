import { test, expect } from '@playwright/test';

test.describe('THREE.js PropertyBinding Error Detection', () => {
  test('should detect actual THREE.PropertyBinding errors like "No target node found for track"', async ({ page }) => {
    // Listen specifically for THREE.PropertyBinding errors
    const threePropertyBindingErrors: string[] = [];
    const allConsoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      // Look for the specific THREE.PropertyBinding error patterns the user reported
      if (text.includes('THREE.PropertyBinding') && text.includes('No target node found for track')) {
        threePropertyBindingErrors.push(text);
        console.log(`🔴 THREE.PropertyBinding ERROR: ${text}`);
      }
      
      // Also capture warnings that mention PropertyBinding
      if (text.includes('PropertyBinding') && (text.includes('warn') || text.includes('error'))) {
        console.log(`⚠️ PropertyBinding warning/error: ${text}`);
      }
    });

    console.log('🎬 Starting THREE.PropertyBinding error detection test...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Navigate to Model Viewer
    await page.click('text=Model Viewer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to Game Models mode  
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);
    
    // Select Otto Matic
    await page.locator('[role="combobox"]:has-text("Select a game")').click();
    await page.locator('[role="option"]:has-text("Otto Matic")').click();
    await page.waitForTimeout(1000);
    
    // Select Otto model
    await page.locator('[role="combobox"]:has-text("Select a model")').click();
    await page.locator('[role="option"]:has-text("Otto")').first().click();
    await page.waitForTimeout(1000);
    
    console.log('🔄 Loading Otto with skeleton data...');
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load completely
    await page.waitForTimeout(10000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/three-pb-01-loaded.png', fullPage: true });
    
    // Find animation selector
    const animationSelect = page.locator('select').filter({ 
      has: page.locator('option:text("Walk")') 
    }).or(
      page.locator('select').filter({ 
        has: page.locator('option:text("Standing")') 
      })
    ).first();
    
    const hasAnimationSelect = await animationSelect.count() > 0;
    console.log(`🎛️ Animation selector found: ${hasAnimationSelect}`);
    
    if (hasAnimationSelect) {
      const options = await animationSelect.locator('option').allTextContents();
      console.log('📋 Available animations:', options);
      
      // Select the Pickup2 animation specifically (user mentioned this triggers the error)
      let targetAnimation = options.find(opt => opt.includes('Pickup2'));
      if (!targetAnimation) {
        // Fallback to other animations
        targetAnimation = options.find(opt => opt.includes('Walk')) || 
                         options.find(opt => opt.includes('Standing')) ||
                         options.find(opt => opt !== '-- Select Animation --' && opt.trim() !== '');
      }
      
      if (targetAnimation) {
        console.log(`🎯 Selecting animation: ${targetAnimation}`);
        await animationSelect.selectOption({ label: targetAnimation });
        await page.waitForTimeout(3000);
        
        // Take screenshot with animation selected
        await page.screenshot({ path: 'screenshots/three-pb-02-animation-selected.png', fullPage: true });
        
        // Find play button - look for the actual play button
        const playButton = page.locator('button').filter({ 
          has: page.locator('svg[data-lucide="play"]') 
        }).or(
          page.locator('button:has-text("Play")')
        ).first();
        
        const hasPlayButton = await playButton.count() > 0;
        console.log(`▶️ Play button found: ${hasPlayButton}`);
        
        if (hasPlayButton) {
          console.log(`🚀 Starting animation playback for "${targetAnimation}"...`);
          console.log('⚠️  This should trigger THREE.PropertyBinding errors if the issue exists');
          
          // Clear any existing PropertyBinding errors
          threePropertyBindingErrors.length = 0;
          
          // Click play button
          await playButton.click();
          
          // Wait for animation to start and PropertyBinding to attempt node resolution
          await page.waitForTimeout(5000);
          
          // Take screenshot during animation
          await page.screenshot({ path: 'screenshots/three-pb-03-animation-playing.png', fullPage: true });
          
          console.log('🔍 Checking for THREE.PropertyBinding errors after animation start...');
          
          // Wait a bit more to ensure all PropertyBinding attempts are captured
          await page.waitForTimeout(3000);
          
        } else {
          console.log('❌ No play button found - cannot test animation playback');
        }
      } else {
        console.log('❌ No suitable animation found');
      }
    } else {
      console.log('❌ No animation selector found - skeleton may not have loaded properly');
    }
    
    // Final analysis
    console.log('\n=== THREE.js PropertyBinding Error Analysis ===');
    console.log(`THREE.PropertyBinding "No target node" errors: ${threePropertyBindingErrors.length}`);
    console.log(`Total console messages: ${allConsoleMessages.length}`);
    
    if (threePropertyBindingErrors.length > 0) {
      console.log('\n🔴 THREE.PropertyBinding errors detected:');
      threePropertyBindingErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      // Extract the track names that are failing
      const failedTracks = threePropertyBindingErrors.map(error => {
        const match = error.match(/No target node found for track: ([^.]+)/);
        return match ? match[1] : 'unknown';
      });
      
      console.log(`\n🎯 Failed track targets: ${[...new Set(failedTracks)].join(', ')}`);
      
    } else {
      console.log('\n✅ No THREE.PropertyBinding "No target node" errors detected');
      
      // Check if we had any PropertyBinding related messages at all
      const propertyBindingMessages = allConsoleMessages.filter(msg => 
        msg.includes('PropertyBinding') || msg.includes('property binding')
      );
      
      if (propertyBindingMessages.length > 0) {
        console.log(`\n📋 Found ${propertyBindingMessages.length} PropertyBinding-related messages:`);
        propertyBindingMessages.slice(0, 5).forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg}`);
        });
      }
    }
    
    // Check for other Three.js related errors that might indicate issues
    const threeJSErrors = allConsoleMessages.filter(msg => 
      msg.toLowerCase().includes('three') && 
      (msg.includes('error') || msg.includes('warn'))
    );
    
    if (threeJSErrors.length > 0) {
      console.log(`\n⚠️ Other Three.js errors/warnings (${threeJSErrors.length}):`);
      threeJSErrors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // The test result - we want to document what we found
    if (threePropertyBindingErrors.length > 0) {
      console.log('\n❌ ISSUE CONFIRMED: THREE.PropertyBinding errors are occurring');
    } else {
      console.log('\n🤔 ISSUE STATUS UNCLEAR: No THREE.PropertyBinding errors detected');
      console.log('This could mean the issue is fixed, or conditions are different than expected');
    }
  });
});