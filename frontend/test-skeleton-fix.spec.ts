import { test, expect } from '@playwright/test';

test('Test skeletal animation fixes', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errorMessages: string[] = [];
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errorMessages.push(text);
      console.log(`ERROR: ${text}`);
    }
  });

  console.log('Opening application...');
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  await page.waitForTimeout(2000);
  
  // Take screenshot of home page
  await page.screenshot({ path: 'screenshots/01-home-page.png', fullPage: true });
  console.log('Screenshot 1: Home page');

  // Navigate to Model Viewer
  console.log('Navigating to Model Viewer...');
  await page.click('text=Model Viewer');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'screenshots/02-model-viewer-game-models.png', fullPage: true });
  console.log('Screenshot 2: Model Viewer with Game Models mode (note button styling)');

  // Load Otto sample model
  console.log('Loading Otto sample model...');
  await page.click('button:has-text("Load Otto.bg3d Sample Model (with Skeleton)")');
  
  // Wait for model to load
  await page.waitForTimeout(15000);
  
  await page.screenshot({ path: 'screenshots/03-otto-loaded.png', fullPage: true });
  console.log('Screenshot 3: Otto model loaded');

  // Check for animation selector
  const animationSelectors = await page.locator('select').count();
  console.log(`Found ${animationSelectors} select elements`);

  if (animationSelectors > 0) {
    const animSelect = page.locator('select').first();
    const options = await animSelect.locator('option').allTextContents();
    console.log(`Animation options available: ${options.length}`);
    console.log(`First 5 options: ${options.slice(0, 5).join(', ')}`);
    
    // Select an animation
    if (options.length > 1) {
      const walkAnim = options.find(opt => opt.includes('Walk')) || options[1];
      console.log(`Selecting animation: ${walkAnim}`);
      await animSelect.selectOption({ label: walkAnim });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'screenshots/04-animation-selected.png', fullPage: true });
      console.log('Screenshot 4: Animation selected');
      
      // Try to find and click play button
      const playButtons = await page.locator('button').filter({ hasText: /play/i }).count();
      if (playButtons > 0) {
        console.log('Clicking play button...');
        await page.locator('button').filter({ hasText: /play/i }).first().click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'screenshots/05-animation-playing.png', fullPage: true });
        console.log('Screenshot 5: Animation playing');
      }
    }
  }

  // Check for PropertyBinding errors
  console.log('\n=== Checking for Errors ===');
  const propertyBindingErrors = errorMessages.filter(msg => 
    msg.includes('PropertyBinding') || msg.includes('No target node found')
  );
  
  const skeletonErrors = errorMessages.filter(msg =>
    msg.toLowerCase().includes('skeleton') || msg.toLowerCase().includes('joint')
  );

  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Total error messages: ${errorMessages.length}`);
  console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
  console.log(`Skeleton-related errors: ${skeletonErrors.length}`);

  if (propertyBindingErrors.length > 0) {
    console.log('\nPropertyBinding Errors:');
    propertyBindingErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  if (skeletonErrors.length > 0) {
    console.log('\nSkeleton Errors:');
    skeletonErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  // Print all errors for debugging
  if (errorMessages.length > 0) {
    console.log('\nAll Error Messages:');
    errorMessages.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }
  
  console.log('\n=== Test Complete ===');
  console.log('Screenshots saved to screenshots/ directory');
});
