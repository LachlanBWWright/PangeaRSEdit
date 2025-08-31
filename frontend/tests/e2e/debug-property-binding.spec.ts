import { test, expect } from '@playwright/test';

test.describe('Debug PropertyBinding Error', () => {
  test('should debug the actual PropertyBinding error source', async ({ page }) => {
    // Listen for ALL console messages
    const allMessages: { type: string, text: string }[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      allMessages.push({ type, text });
      
      if (text.includes('PropertyBinding') || text.includes('Pelvis')) {
        console.log(`🔍 [${type.toUpperCase()}] ${text}`);
      }
      
      if (text.includes('three') || text.includes('THREE')) {
        console.log(`⚙️ [${type.toUpperCase()}] ${text}`);
      }
    });
    
    // Also listen for page errors
    page.on('pageerror', (error) => {
      console.log(`💥 PAGE ERROR: ${error.message}`);
    });

    console.log('Starting Otto model test...');
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
    
    // Wait for model to load and let's see what happens
    await page.waitForTimeout(8000);
    
    // Look for animation dropdown
    const animationSelector = page.locator('select').filter({ hasText: /Animation|Walk|Standing/ }).first();
    const hasAnimationSelector = await animationSelector.count() > 0;
    
    if (hasAnimationSelector) {
      const options = await animationSelector.locator('option').allTextContents();
      console.log('Available animations:', options.slice(0, 5)); // Show first 5
      
      // Try to select Walk animation specifically (where we might see the error)
      const walkOption = options.find(opt => opt.includes('Walk'));
      if (walkOption) {
        console.log(`Selecting ${walkOption}...`);
        await animationSelector.selectOption({ label: walkOption });
        await page.waitForTimeout(2000);
        
        // Now try to play it
        const playButton = page.locator('button').filter({ hasText: /Play/ }).or(
          page.locator('button[title="Play"]')
        ).first();
        
        if (await playButton.count() > 0) {
          console.log('🎬 Playing Walk animation - watching for PropertyBinding errors...');
          await playButton.click();
          
          // Wait and see what happens
          await page.waitForTimeout(10000);
          
          console.log('Animation should now be playing...');
        }
      }
    }
    
    // Filter console messages for the important ones
    const propertyBindingErrors = allMessages.filter(m => 
      m.text.includes('PropertyBinding') && m.text.includes('No target node found')
    );
    
    const animationRelated = allMessages.filter(m => 
      m.text.toLowerCase().includes('animation') ||
      m.text.toLowerCase().includes('pelvis') ||
      m.text.toLowerCase().includes('bone') ||
      m.text.toLowerCase().includes('joint')
    );
    
    console.log('\n=== ANALYSIS ===');
    console.log(`Total console messages: ${allMessages.length}`);
    console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
    console.log(`Animation-related messages: ${animationRelated.length}`);
    
    if (propertyBindingErrors.length > 0) {
      console.log('\n❌ PropertyBinding errors found:');
      propertyBindingErrors.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.type}] ${msg.text}`);
      });
    } else {
      console.log('\n✅ No PropertyBinding errors detected');
    }
    
    // Show recent animation-related messages
    console.log('\n📋 Recent animation-related messages (last 10):');
    animationRelated.slice(-10).forEach((msg, i) => {
      console.log(`  ${animationRelated.length - 10 + i + 1}. [${msg.type}] ${msg.text}`);
    });
    
    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/property-binding-debug.png', fullPage: true });
    
    console.log(`\n🎯 Final result: ${propertyBindingErrors.length} PropertyBinding errors detected`);
  });
});