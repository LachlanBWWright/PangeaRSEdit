import { test, expect } from '@playwright/test';

test.describe('Comprehensive PropertyBinding Fix Validation', () => {
  test('validate PropertyBinding fix with manual UI navigation', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];
    const threeJsErrors: string[] = [];

    // Enhanced console listening
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      // Track PropertyBinding errors specifically  
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔥 PropertyBinding error:', text);
      }
      
      // Track general Three.js errors
      if (text.includes('THREE.') && (text.includes('error') || text.includes('Error'))) {
        threeJsErrors.push(text);
        console.log('⚠️ Three.js error:', text);
      }
    });

    // Navigate to the application
    console.log('Navigating to application...');
    await page.goto('http://localhost:5173/PangeaRSEdit/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/validation-01-initial.png', fullPage: true });

    // Navigate through UI manually step by step
    console.log('Looking for Model Viewer navigation...');
    
    // Try multiple ways to get to model viewer
    const modelViewerLinks = await page.locator('a:has-text("Model Viewer")').count();
    const modelViewerButtons = await page.locator('button:has-text("Model Viewer")').count();
    
    console.log(`Model Viewer links: ${modelViewerLinks}, buttons: ${modelViewerButtons}`);
    
    if (modelViewerLinks > 0) {
      await page.click('a:has-text("Model Viewer")');
    } else if (modelViewerButtons > 0) {
      await page.click('button:has-text("Model Viewer")');
    } else {
      // Navigate directly to model viewer path
      await page.goto('http://localhost:5173/PangeaRSEdit/model-viewer', { waitUntil: 'networkidle' });
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/validation-02-model-viewer.png', fullPage: true });

    // Look for Game Models mode
    console.log('Looking for Game Models button...');
    const gameModelsButton = await page.locator('button:has-text("Game Models")').count();
    console.log(`Game Models button found: ${gameModelsButton}`);
    
    if (gameModelsButton > 0) {
      await page.click('button:has-text("Game Models")');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/validation-03-game-models.png', fullPage: true });

      // Wait for and find game selector
      console.log('Looking for game selector...');
      await page.waitForSelector('select', { timeout: 10000 });
      
      const selects = await page.locator('select').count();
      console.log(`Select elements found: ${selects}`);
      
      if (selects > 0) {
        // Get first select (game selector)
        const gameSelect = page.locator('select').first();
        const gameOptions = await gameSelect.locator('option').count();
        console.log(`Game select has ${gameOptions} options`);
        
        // Try to select Otto Matic
        const optionTexts = await gameSelect.locator('option').allTextContents();
        console.log('Available game options:', optionTexts);
        
        const ottoOption = optionTexts.find(text => text.toLowerCase().includes('otto'));
        if (ottoOption) {
          await gameSelect.selectOption({ label: ottoOption });
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'screenshots/validation-04-otto-game-selected.png', fullPage: true });
          
          // Look for model selector
          console.log('Looking for model selector...');
          const selectsAfterGame = await page.locator('select').count();
          console.log(`Selects after game selection: ${selectsAfterGame}`);
          
          if (selectsAfterGame > 1) {
            const modelSelect = page.locator('select').nth(1);
            const modelOptions = await modelSelect.locator('option').count();
            console.log(`Model select has ${modelOptions} options`);
            
            if (modelOptions > 1) {
              // Select Otto model
              const modelTexts = await modelSelect.locator('option').allTextContents();
              console.log('Available model options:', modelTexts);
              
              const ottoModelOption = modelTexts.find(text => text.toLowerCase().includes('otto'));
              if (ottoModelOption) {
                await modelSelect.selectOption({ label: ottoModelOption });
                await page.waitForTimeout(1000);
                await page.screenshot({ path: 'screenshots/validation-05-otto-model-selected.png', fullPage: true });
                
                // Look for skeleton load button
                console.log('Looking for skeleton load button...');
                const skeletonButtons = await page.locator('button').allTextContents();
                console.log('Available buttons:', skeletonButtons);
                
                const skeletonButton = skeletonButtons.find(text => 
                  text.toLowerCase().includes('skeleton') || text.toLowerCase().includes('load')
                );
                
                if (skeletonButton) {
                  await page.click(`button:has-text("${skeletonButton}")`);
                  console.log('Clicked skeleton load button, waiting for model to load...');
                  await page.waitForTimeout(8000); // Give time for model to load
                  
                  await page.screenshot({ path: 'screenshots/validation-06-otto-loaded.png', fullPage: true });
                  
                  // Look for animation controls
                  console.log('Looking for animation controls...');
                  const selectsAfterLoad = await page.locator('select').count();
                  console.log(`Selects after model load: ${selectsAfterLoad}`);
                  
                  if (selectsAfterLoad > 2) {
                    const animSelect = page.locator('select').nth(2);
                    const animOptions = await animSelect.locator('option').count();
                    console.log(`Animation select has ${animOptions} options`);
                    
                    if (animOptions > 1) {
                      // Get animation options
                      const animTexts = await animSelect.locator('option').allTextContents();
                      console.log('Available animations:', animTexts);
                      
                      // Look specifically for Pickup2
                      const pickup2Option = animTexts.find(text => 
                        text.toLowerCase().includes('pickup2')
                      );
                      
                      let testAnimation = pickup2Option || animTexts.find(text => 
                        text && !text.includes('Select') && text.trim().length > 0
                      );
                      
                      if (testAnimation) {
                        console.log(`Testing animation: ${testAnimation}`);
                        
                        // Clear PropertyBinding errors before test
                        propertyBindingErrors.length = 0;
                        
                        // Select animation
                        await animSelect.selectOption({ label: testAnimation });
                        await page.waitForTimeout(1000);
                        await page.screenshot({ path: 'screenshots/validation-07-animation-selected.png', fullPage: true });
                        
                        // Find and click play button
                        console.log('Looking for play button...');
                        const allButtons = await page.locator('button').all();
                        
                        for (const button of allButtons) {
                          const hasIcon = await button.locator('svg').count() > 0;
                          const buttonText = await button.textContent();
                          
                          if (hasIcon || (buttonText && buttonText.toLowerCase().includes('play'))) {
                            console.log('Clicking play button...');
                            await button.click();
                            break;
                          }
                        }
                        
                        // Wait for animation to play and PropertyBinding errors to occur
                        console.log('Waiting for animation playback and PropertyBinding check...');
                        await page.waitForTimeout(4000);
                        
                        await page.screenshot({ path: 'screenshots/validation-08-animation-playing.png', fullPage: true });
                        
                        // Report results
                        console.log('\n=== VALIDATION RESULTS ===');
                        console.log(`Animation tested: ${testAnimation}`);
                        console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
                        console.log(`Total console messages: ${consoleMessages.length}`);
                        
                        if (propertyBindingErrors.length > 0) {
                          console.log('\n🔥 PropertyBinding errors found:');
                          propertyBindingErrors.forEach((error, i) => {
                            console.log(`${i + 1}. ${error}`);
                          });
                        } else {
                          console.log('\n✅ No PropertyBinding errors detected!');
                        }
                        
                        // Test passes if no PropertyBinding errors
                        expect(propertyBindingErrors.length).toBe(0);
                        
                      } else {
                        console.log('❌ No valid animation found to test');
                        throw new Error('No valid animation found');
                      }
                    } else {
                      console.log('❌ No animation options available');
                      throw new Error('No animation options available');
                    }
                  } else {
                    console.log('❌ Animation selector not found after model load');
                    throw new Error('Animation selector not found');
                  }
                } else {
                  console.log('❌ Skeleton load button not found');
                  throw new Error('Skeleton load button not found');
                }
              } else {
                console.log('❌ Otto model option not found');
                throw new Error('Otto model option not found');
              }
            } else {
              console.log('❌ No model options available');
              throw new Error('No model options available');
            }
          } else {
            console.log('❌ Model selector not found');
            throw new Error('Model selector not found');
          }
        } else {
          console.log('❌ Otto Matic game option not found');
          throw new Error('Otto Matic game option not found');
        }
      } else {
        console.log('❌ No select elements found');
        throw new Error('No select elements found');
      }
    } else {
      console.log('❌ Game Models button not found');
      throw new Error('Game Models button not found - UI may have changed');
    }
  });
});