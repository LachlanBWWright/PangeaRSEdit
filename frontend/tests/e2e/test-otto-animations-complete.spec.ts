import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('Otto skeleton animations - comprehensive test with screenshots', async ({ page }) => {
  // Set up console message tracking
  const consoleMessages: string[] = [];
  const errorMessages: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    
    if (msg.type() === 'error' || text.includes('Error') || text.includes('ERROR')) {
      errorMessages.push(text);
    }
  });

  // Navigate to the model viewer
  console.log('Navigating to Model Viewer...');
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  await page.waitForLoadState('networkidle');
  
  // Click Model Viewer tab
  await page.click('text=Model Viewer');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-01-viewer.png'), fullPage: true });
  console.log('Screenshot 1: Model Viewer page');

  // Click Game Models button
  await page.click('button:has-text("Game Models")');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-02-game-models.png'), fullPage: true });
  console.log('Screenshot 2: Game Models selected');

  // Click "Load Otto.bg3d Sample Model (with Skeleton)" button
  console.log('Loading Otto sample model with skeleton...');
  await page.click('button:has-text("Otto Sample (with Skeleton)")');
  
  // Wait for model to load (look for animations panel or console message)
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-03-loaded.png'), fullPage: true });
  console.log('Screenshot 3: Otto model loaded');

  // Check if animations panel is visible
  const animationPanel = page.locator('text=Animations');
  const isVisible = await animationPanel.isVisible();
  console.log(`Animation panel visible: ${isVisible}`);
  
  if (isVisible) {
    await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-04-animations-panel.png'), fullPage: true });
    console.log('Screenshot 4: Animations panel');
  }

  // Wait for animations to be processed
  await page.waitForTimeout(2000);

  // Check console for animation loading messages
  const animationLoadMessages = consoleMessages.filter(msg => 
    msg.includes('animation') || msg.includes('Animation')
  );
  console.log('\n=== Animation Load Messages ===');
  animationLoadMessages.slice(0, 20).forEach(msg => console.log(msg));

  // Look for specific animation messages
  const gltfAnimationMsg = consoleMessages.find(msg => msg.includes('Loaded') && msg.includes('animations from glTF'));
  if (gltfAnimationMsg) {
    console.log('\n✅ Found animation load message:', gltfAnimationMsg);
  }

  // Try to find and click on an animation to play
  // Look for "Walk" animation specifically
  console.log('\nLooking for animations to play...');
  
  // Try to find animation list or buttons
  const walkAnimation = page.locator('text=Walk').first();
  const walkExists = await walkAnimation.count() > 0;
  
  if (walkExists) {
    console.log('Found "Walk" animation, attempting to click...');
    await walkAnimation.click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-05-walk-selected.png'), fullPage: true });
    console.log('Screenshot 5: Walk animation selected');
    
    // Try to find and click play button
    const playButton = page.locator('button[aria-label="Play"], button:has-text("Play")').first();
    const playExists = await playButton.count() > 0;
    
    if (playExists) {
      console.log('Found play button, clicking...');
      await playButton.click();
      await page.waitForTimeout(500);
      
      // Take screenshots at different times during animation
      await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-06-playing-0ms.png'), fullPage: true });
      console.log('Screenshot 6: Animation playing (0ms)');
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-07-playing-300ms.png'), fullPage: true });
      console.log('Screenshot 7: Animation playing (300ms)');
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-08-playing-600ms.png'), fullPage: true });
      console.log('Screenshot 8: Animation playing (600ms)');
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(__dirname, '../../screenshots/otto-anim-09-playing-900ms.png'), fullPage: true });
      console.log('Screenshot 9: Animation playing (900ms)');
    }
  }

  // Check for PropertyBinding errors
  const propertyBindingErrors = consoleMessages.filter(msg => 
    msg.includes('PropertyBinding') && (msg.includes('No target node') || msg.includes('Error'))
  );
  
  console.log('\n=== PropertyBinding Error Check ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`PropertyBinding errors: ${propertyBindingErrors.length}`);
  
  if (propertyBindingErrors.length > 0) {
    console.log('\n❌ PropertyBinding errors found:');
    propertyBindingErrors.forEach(msg => console.log(`  ${msg}`));
  } else {
    console.log('\n✅ NO PropertyBinding errors found!');
  }

  // Check for any error messages
  console.log(`\n=== Error Messages ===`);
  console.log(`Total error messages: ${errorMessages.length}`);
  if (errorMessages.length > 0) {
    console.log('Errors:');
    errorMessages.slice(0, 10).forEach(msg => console.log(`  ${msg}`));
  }

  // Write console log to file
  const consoleLogPath = join(__dirname, '../../screenshots/otto-console-log.txt');
  mkdirSync(join(__dirname, '../../screenshots'), { recursive: true });
  writeFileSync(consoleLogPath, consoleMessages.join('\n'));
  console.log(`\nConsole log written to: ${consoleLogPath}`);

  // Verify no PropertyBinding errors
  expect(propertyBindingErrors.length).toBe(0);
  
  console.log('\n=== Test Complete ===');
});
