import { test, expect } from '@playwright/test';

test.describe('Quick Test', () => {
  test('Quick Otto PropertyBinding Test', async ({ page }) => {
  // Listen for console messages
  const propertyBindingErrors: string[] = [];
  const allConsoleMessages: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    allConsoleMessages.push(text);
    
    if (text.includes('PropertyBinding') && text.includes('No target node found')) {
      propertyBindingErrors.push(text);
      console.log('🔍 PropertyBinding error detected:', text);
    }
  });

  console.log('Navigating to the page...');
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/quick-test-initial.png', fullPage: true });

  // Navigate to Model Viewer page
  console.log('Clicking Model Viewer link...');
  await page.click('text=Model Viewer');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'screenshots/quick-test-model-viewer.png', fullPage: true });

  // Check what's available on the page
  console.log('Looking for elements...');
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons);
  
  const selects = await page.locator('select').count();
  console.log('Select elements found:', selects);
  
  // Try to find Game Models button
  const gameModelsButton = page.locator('button:has-text("Game Models")');
  const gameModelsExists = await gameModelsButton.count() > 0;
  console.log('Game Models button exists:', gameModelsExists);
  
  if (gameModelsExists) {
    console.log('Switching to Game Models mode...');
    await gameModelsButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/quick-test-game-models.png', fullPage: true });
    
    // Check for the game select dropdown (using new shadcn Select component)
    const gameSelectTrigger = page.locator('[role="combobox"]:has-text("Select a game")');
    const gameSelectTriggerExists = await gameSelectTrigger.count() > 0;
    console.log('Game select trigger exists:', gameSelectTriggerExists);
    
    if (gameSelectTriggerExists) {
      console.log('Clicking game select...');
      await gameSelectTrigger.click();
      await page.waitForTimeout(500);
      
      // Look for Otto Matic option
      const ottomaticOption = page.locator('[role="option"]:has-text("Otto Matic")');
      const ottomaticExists = await ottomaticOption.count() > 0;
      console.log('Otto Matic option exists:', ottomaticExists);
      
      if (ottomaticExists) {
        console.log('Selecting Otto Matic...');
        await ottomaticOption.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'screenshots/quick-test-otto-game-selected.png', fullPage: true });
        
        // Look for model select dropdown
        const modelSelectTrigger = page.locator('[role="combobox"]:has-text("Select a model")');
        const modelSelectExists = await modelSelectTrigger.count() > 0;
        console.log('Model select trigger exists:', modelSelectExists);
        
        if (modelSelectExists) {
          console.log('Clicking model select...');
          await modelSelectTrigger.click();
          await page.waitForTimeout(500);
          
          // Look for Otto model option
          const ottoModelOption = page.locator('[role="option"]:has-text("Otto")').first();
          const ottoModelExists = await ottoModelOption.count() > 0;
          console.log('Otto model option exists:', ottoModelExists);
          
          if (ottoModelExists) {
            console.log('Selecting Otto model...');
            await ottoModelOption.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ path: 'screenshots/quick-test-otto-selected.png', fullPage: true });
            
            // Look for the load button
            const loadButton = page.locator('button:has-text("Load Otto")');
            const loadButtonExists = await loadButton.count() > 0;
            console.log('Load Otto button exists:', loadButtonExists);
            
            if (loadButtonExists) {
              console.log('Loading Otto with skeleton data...');
              await loadButton.click();
              
              // Wait for model to load
              await page.waitForTimeout(8000);
              
              await page.screenshot({ path: 'screenshots/quick-test-otto-loaded.png', fullPage: true });
              
              // Check for animation dropdown
              const animationSelects = await page.locator('select').all();
              let animationSelect = null;
              
              for (const select of animationSelects) {
                const options = await select.locator('option').allTextContents();
                if (options.some(opt => opt.includes('Animation') || opt.includes('Walk') || opt.includes('Standing'))) {
                  animationSelect = select;
                  break;
                }
              }
              
              if (animationSelect) {
                console.log('Found animation selector, testing animation playback...');
                
                // Select an animation (not the first "-- Select Animation --" option)
                const options = await animationSelect.locator('option').all();
                if (options.length > 1) {
                  console.log('Selecting animation...');
                  await animationSelect.selectOption({ index: 1 });
                  await page.waitForTimeout(1000);
                  
                  await page.screenshot({ path: 'screenshots/quick-test-animation-selected.png', fullPage: true });
                  
                  // Look for play button
                  const playButtons = await page.locator('button').all();
                  for (const button of playButtons) {
                    const hasPlayIcon = await button.locator('svg').count() > 0;
                    if (hasPlayIcon) {
                      console.log('Playing animation...');
                      await button.click();
                      await page.waitForTimeout(3000); // Wait for animation to start and potential errors
                      break;
                    }
                  }
                  
                  await page.screenshot({ path: 'screenshots/quick-test-animation-playing.png', fullPage: true });
                }
              } else {
                console.log('No animation selector found - checking for Three.js errors in model loading...');
              }
            }
          }
        }
      }
    }
  }
  
  // Log results
  console.log(`\n=== TEST RESULTS ===`);
  console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
  
  if (propertyBindingErrors.length > 0) {
    console.log(`❌ PropertyBinding errors detected:`);
    propertyBindingErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log(`✅ No PropertyBinding errors detected!`);
  }
  
  // Log some recent console messages for debugging
  console.log('\n=== Recent Console Messages ===');
  allConsoleMessages.slice(-20).forEach((msg, index) => {
    console.log(`${allConsoleMessages.length - 20 + index + 1}. ${msg}`);
  });

  // The test documents what we found
  console.log(`Final result: ${propertyBindingErrors.length} PropertyBinding errors`);
  });
});