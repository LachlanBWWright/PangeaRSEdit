import { test } from '@playwright/test';

test('Debug Model Viewer page', async ({ page }) => {
  console.log('Navigating to the page...');
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  
  // Navigate to Model Viewer page
  console.log('Clicking Model Viewer link...');
  await page.click('text=Model Viewer');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ path: 'screenshots/model-viewer-page.png', fullPage: true });
  
  // List all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('All buttons on Model Viewer page:', buttons);
  
  // List all select elements
  const selects = await page.locator('select').all();
  console.log('Number of select elements:', selects.length);
  
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const options = await select.locator('option').allTextContents();
    const id = await select.getAttribute('data-testid');
    console.log(`Select ${i} (id: ${id}):`, options);
  }
  
  // Check for Game Models button
  const gameModelsButton = await page.locator('button:has-text("Game Models")').count();
  console.log('Game Models button found:', gameModelsButton > 0);
  
  if (gameModelsButton > 0) {
    console.log('Clicking Game Models button...');
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'screenshots/after-game-models-click.png', fullPage: true });
    
    // Check selects again
    const selectsAfter = await page.locator('select').all();
    console.log('Number of select elements after clicking Game Models:', selectsAfter.length);
    
    for (let i = 0; i < selectsAfter.length; i++) {
      const select = selectsAfter[i];
      const options = await select.locator('option').allTextContents();
      const id = await select.getAttribute('data-testid');
      console.log(`Select ${i} after click (id: ${id}):`, options);
    }
  }
});