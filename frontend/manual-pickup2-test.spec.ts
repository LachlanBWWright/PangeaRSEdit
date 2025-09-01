import { test, expect } from '@playwright/test';

test('Manual reproduction of Pickup2 PropertyBinding error', async ({ page }) => {
  // Track specific PropertyBinding errors with the exact pattern the user reported
  const propertyBindingErrors: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    
    // Look for the EXACT error pattern the user reported:
    // "THREE.PropertyBinding: No target node found for track: Pelvis.position."
    // "THREE.PropertyBinding: No target node found for track: Pelvis.quaternion."
    if (text.includes('THREE.PropertyBinding') && text.includes('No target node found for track:')) {
      propertyBindingErrors.push(text);
      console.log(`🔴 EXACT PropertyBinding Error: ${text}`);
    }
  });

  console.log('📂 Manual reproduction test starting...');
  
  // Navigate exactly as the user would
  await page.goto('http://localhost:5173/PangeaRSEdit/');
  await page.waitForLoadState('networkidle');
  
  // Go to model viewer
  await page.click('a[href="/PangeaRSEdit/modelviewer"]');
  await page.waitForLoadState('networkidle');
  
  // Follow user's exact steps
  console.log('🎮 Switching to Game Models...');
  await page.click('button:has-text("Game Models")');
  await page.waitForTimeout(1000);
  
  console.log('🎯 Selecting Otto Matic game...');
  await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
  await page.waitForTimeout(1000);
  
  console.log('🤖 Selecting Otto model...');
  await page.selectOption('select[data-testid="model-select"]', 'Otto');
  await page.waitForTimeout(1000);
  
  console.log('💀 Loading Otto with skeleton data...');
  await page.click('button:has-text("Load with skeleton data")');
  
  // Wait longer for complete loading
  await page.waitForTimeout(10000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/manual-otto-loaded.png', fullPage: true });
  
  // Find animation selector
  console.log('🎭 Looking for animation selector...');
  const animationSelect = page.locator('select').first();
  await expect(animationSelect).toBeVisible({ timeout: 15000 });
  
  // Get all options to find Pickup2
  const options = await animationSelect.locator('option').allTextContents();
  console.log('Available animations:', options.slice(0, 15));
  
  // Find Pickup2 specifically
  const pickup2Option = options.find(opt => opt.includes('Pickup2'));
  if (!pickup2Option) {
    throw new Error('Pickup2 animation not found');
  }
  
  console.log(`🎯 Found Pickup2: "${pickup2Option}"`);
  
  // Clear any previous PropertyBinding errors
  propertyBindingErrors.length = 0;
  
  // Select Pickup2 animation
  await animationSelect.selectOption({ label: pickup2Option });
  await page.waitForTimeout(2000);
  
  console.log('▶️  Attempting to play Pickup2...');
  
  // Find and click play button (try multiple selectors)
  const playButton = page.locator('button[title="Play"]')
    .or(page.locator('button:has-text("▶")'))
    .or(page.locator('button:has(svg[data-lucide="play"])'))
    .or(page.locator('button').filter({ hasText: /play/i }));
  
  await expect(playButton.first()).toBeVisible({ timeout: 5000 });
  await playButton.first().click();
  
  console.log('⏳ Waiting for PropertyBinding errors to appear...');
  
  // Wait sufficient time for Three.js to process the animation and show errors
  await page.waitForTimeout(5000);
  
  // Take screenshot while playing
  await page.screenshot({ path: '/tmp/manual-pickup2-playing.png', fullPage: true });
  
  // Report exact results
  console.log(`\n📊 MANUAL REPRODUCTION RESULTS:`);
  console.log(`PropertyBinding errors found: ${propertyBindingErrors.length}`);
  
  if (propertyBindingErrors.length > 0) {
    console.log(`\n🚨 CONFIRMED: Exact PropertyBinding errors reproduced:`);
    propertyBindingErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log(`\n✅ No PropertyBinding errors found with current implementation`);
  }
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/manual-final-result.png', fullPage: true });
  
  console.log(`Test completed. PropertyBinding errors: ${propertyBindingErrors.length}`);
});