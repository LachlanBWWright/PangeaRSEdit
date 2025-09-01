import { test, expect } from '@playwright/test';

test.describe('PropertyBinding Error Reproduction', () => {
  test('should reproduce PropertyBinding errors by actually clicking play button', async ({ page }) => {
    // Listen for PropertyBinding errors specifically
    const propertyBindingErrors: string[] = [];
    const allConsoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      allConsoleMessages.push(text);
      
      if (text.includes('PropertyBinding')) {
        propertyBindingErrors.push(text);
        console.log(`🚨 PropertyBinding error: ${text}`);
      }
    });

    console.log('Loading Otto skeleton test...');
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
    
    console.log('Loading Otto with skeleton...');
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load
    await page.waitForTimeout(8000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-pb-loaded.png', fullPage: true });
    
    // Look for the animation selector more broadly
    console.log('Looking for animation controls...');
    const selects = await page.locator('select').all();
    let animationSelect = null;
    
    for (const select of selects) {
      const options = await select.locator('option').allTextContents();
      console.log('Found select with options:', options.slice(0, 3));
      
      // Check if this looks like an animation selector
      if (options.some(opt => opt.includes('Walk') || opt.includes('Standing') || opt.includes('Animation'))) {
        animationSelect = select;
        console.log('✅ Found animation select with options:', options.slice(0, 5));
        break;
      }
    }
    
    if (animationSelect) {
      const options = await animationSelect.locator('option').allTextContents();
      
      // Find a good animation to test - preferably Walk
      let targetAnimation = options.find(opt => opt.includes('Walk') && opt.includes('('));
      if (!targetAnimation) {
        targetAnimation = options.find(opt => opt !== '-- Select Animation --' && opt.trim() !== '');
      }
      
      if (targetAnimation) {
        console.log(`🎯 Selecting animation: ${targetAnimation}`);
        await animationSelect.selectOption({ label: targetAnimation });
        await page.waitForTimeout(2000);
        
        // Take screenshot with animation selected
        await page.screenshot({ path: 'screenshots/otto-pb-animation-selected.png', fullPage: true });
        
        // Now look for play button - be very specific about finding it
        console.log('🔍 Looking for play button...');
        
        // Check various possible play button selectors
        const playButtonSelectors = [
          'button[title="Play"]',
          'button:has-text("Play")',
          'button:has([data-lucide="play"])',
          'button svg[data-lucide="play"]',
          'button:has(svg)',
          '.lucide-play',
          '[aria-label*="play" i]'
        ];
        
        let playButton = null;
        for (const selector of playButtonSelectors) {
          const buttons = await page.locator(selector).all();
          if (buttons.length > 0) {
            console.log(`Found ${buttons.length} buttons with selector: ${selector}`);
            playButton = buttons[0];
            break;
          }
        }
        
        // If still no play button, look for buttons with SVG children (likely play icons)
        if (!playButton) {
          console.log('Looking for buttons with SVG children...');
          const svgButtons = await page.locator('button svg').all();
          console.log(`Found ${svgButtons.length} buttons with SVG icons`);
          
          if (svgButtons.length > 0) {
            // Get the parent button of the first SVG
            playButton = page.locator('button').filter({ has: page.locator('svg') }).first();
          }
        }
        
        // Final fallback - look for any buttons near the animation selector
        if (!playButton) {
          console.log('Final fallback - looking for any buttons in animation area...');
          const allButtons = await page.locator('button').all();
          console.log(`Found ${allButtons.length} total buttons on page`);
          
          // Try to find a button that might be play button by checking text
          for (const button of allButtons) {
            const text = await button.textContent();
            const title = await button.getAttribute('title');
            const ariaLabel = await button.getAttribute('aria-label');
            
            if (text?.includes('▶') || title?.toLowerCase().includes('play') || ariaLabel?.toLowerCase().includes('play')) {
              playButton = button;
              console.log(`Found potential play button with text: "${text}", title: "${title}", aria-label: "${ariaLabel}"`);
              break;
            }
          }
        }
        
        if (playButton) {
          console.log('🎬 Found play button! Clicking to start animation...');
          
          // Click play and immediately start monitoring for PropertyBinding errors
          await playButton.click();
          console.log('✅ Play button clicked!');
          
          // Wait for animation to start and PropertyBinding resolution to happen
          await page.waitForTimeout(5000);
          
          // Take screenshot while playing
          await page.screenshot({ path: 'screenshots/otto-pb-playing.png', fullPage: true });
          
          console.log('⏱️ Animation should now be playing - checking for PropertyBinding errors...');
          
        } else {
          console.log('❌ Could not find play button');
          
          // Debug: list all buttons on the page
          const allButtons = await page.locator('button').all();
          console.log(`\nDebugging: Found ${allButtons.length} buttons total:`);
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const button = allButtons[i];
            const text = await button.textContent();
            const title = await button.getAttribute('title');
            const classes = await button.getAttribute('class');
            console.log(`  ${i + 1}. "${text}" title="${title}" class="${classes}"`);
          }
        }
      } else {
        console.log('❌ No suitable animation found to test');
      }
    } else {
      console.log('❌ No animation selector found');
    }
    
    // Final results
    console.log('\n🎯 TEST RESULTS:');
    console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
    console.log(`Total console messages: ${allConsoleMessages.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n🚨 PropertyBinding errors found:');
      propertyBindingErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors detected');
      
      // Show recent relevant messages to see what's happening
      const relevantMessages = allConsoleMessages.filter(msg => 
        msg.toLowerCase().includes('animation') ||
        msg.toLowerCase().includes('play') ||
        msg.toLowerCase().includes('action') ||
        msg.toLowerCase().includes('mixer')
      ).slice(-10);
      
      if (relevantMessages.length > 0) {
        console.log('\n📋 Recent animation-related messages:');
        relevantMessages.forEach((msg, i) => {
          console.log(`  ${i + 1}. ${msg}`);
        });
      }
    }
    
    console.log(`\n📊 Final count: ${propertyBindingErrors.length} PropertyBinding errors`);
  });
});