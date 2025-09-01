import { test, expect } from '@playwright/test';

test.describe('Manual PropertyBinding Debug', () => {
  test('debug and manually test PropertyBinding errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const propertyBindingErrors: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('PropertyBinding') && text.includes('No target node found')) {
        propertyBindingErrors.push(text);
        console.log('🔥 PropertyBinding error:', text);
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/debug-01-initial.png', fullPage: true });

    // Get current page content
    const pageContent = await page.content();
    console.log('Page loaded, content length:', pageContent.length);

    // Look for elements
    const buttons = await page.locator('button').count();
    const selects = await page.locator('select').count();
    const divs = await page.locator('div').count();

    console.log(`Elements found - Buttons: ${buttons}, Selects: ${selects}, Divs: ${divs}`);

    // Try to find game models button
    const gameModelsButton = await page.locator('button:has-text("Game Models")').count();
    console.log(`Game Models button found: ${gameModelsButton}`);

    if (gameModelsButton > 0) {
      await page.click('button:has-text("Game Models")');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/debug-02-game-models.png', fullPage: true });

      // Check for dropdowns
      const selectsAfter = await page.locator('select').count();
      console.log(`Selects after clicking Game Models: ${selectsAfter}`);

      if (selectsAfter > 0) {
        // Get select options
        const firstSelect = page.locator('select').first();
        const options = await firstSelect.locator('option').count();
        console.log(`First select has ${options} options`);

        if (options > 1) {
          // Try selecting ottomatic
          try {
            await firstSelect.selectOption('ottomatic');
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/debug-03-ottomatic-selected.png', fullPage: true });

            // Check for second dropdown
            const secondSelectCount = await page.locator('select').count();
            if (secondSelectCount > 1) {
              const secondSelect = page.locator('select').nth(1);
              const secondOptions = await secondSelect.locator('option').count();
              console.log(`Second select has ${secondOptions} options`);

              if (secondOptions > 1) {
                await secondSelect.selectOption({ index: 1 }); // Select first non-empty option
                await page.waitForTimeout(1000);
                await page.screenshot({ path: 'screenshots/debug-04-model-selected.png', fullPage: true });

                // Look for skeleton button
                const skeletonButton = await page.locator('button:has-text("skeleton")').count();
                console.log(`Skeleton button found: ${skeletonButton}`);

                if (skeletonButton > 0) {
                  await page.click('button:has-text("skeleton")');
                  await page.waitForTimeout(5000); // Wait for model to load
                  await page.screenshot({ path: 'screenshots/debug-05-skeleton-loaded.png', fullPage: true });

                  // Check for animation dropdown
                  const animationSelects = await page.locator('select').count();
                  console.log(`Animation selects found: ${animationSelects}`);

                  if (animationSelects > 2) {
                    const animSelect = page.locator('select').nth(2);
                    const animOptions = await animSelect.locator('option').count();
                    console.log(`Animation select has ${animOptions} options`);

                    if (animOptions > 1) {
                      await animSelect.selectOption({ index: 1 });
                      await page.waitForTimeout(1000);
                      await page.screenshot({ path: 'screenshots/debug-06-animation-selected.png', fullPage: true });

                      // Clear PropertyBinding errors before playing
                      propertyBindingErrors.length = 0;

                      // Try to find and click play button
                      const playButtons = await page.locator('button').all();
                      for (const button of playButtons) {
                        const hasIcon = await button.locator('svg').count() > 0;
                        if (hasIcon) {
                          try {
                            await button.click();
                            console.log('Clicked play button');
                            break;
                          } catch (e) {
                            console.log('Failed to click button:', e);
                          }
                        }
                      }

                      await page.waitForTimeout(3000);
                      await page.screenshot({ path: 'screenshots/debug-07-animation-playing.png', fullPage: true });

                      console.log(`PropertyBinding errors after playing: ${propertyBindingErrors.length}`);
                      if (propertyBindingErrors.length > 0) {
                        console.log('PropertyBinding errors found:');
                        propertyBindingErrors.forEach((error, i) => {
                          console.log(`${i + 1}. ${error}`);
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.log('Error during selection:', e);
          }
        }
      }
    }

    console.log(`\nFinal summary:`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);

    // Don't fail the test, just report results
    if (propertyBindingErrors.length > 0) {
      console.log('❌ PropertyBinding errors detected - skeleton system needs fixing');
    } else {
      console.log('✅ No PropertyBinding errors detected');
    }
  });
});