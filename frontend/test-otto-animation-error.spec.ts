import { test, expect } from '@playwright/test';

test.describe('Otto Animation Error Debug', () => {
  test('should check for PropertyBinding errors when loading Otto with skeleton', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('PropertyBinding')) {
        console.log('🔍 PropertyBinding error:', text);
      }
    });

    // Navigate to the page
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/otto-initial.png', fullPage: true });

    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);
    
    // Select Otto Matic from game dropdown
    await page.selectOption('select[data-testid="game-select"]', 'ottomatic');
    await page.waitForTimeout(500);
    
    // Select Otto from model dropdown
    await page.selectOption('select[data-testid="model-select"]', 'Otto');
    await page.waitForTimeout(500);
    
    // Take screenshot before loading with skeleton
    await page.screenshot({ path: 'screenshots/otto-before-skeleton.png', fullPage: true });

    // Click "Load with skeleton data" button
    await page.click('button:has-text("Load with skeleton data")');
    
    // Wait for model to load
    await page.waitForTimeout(5000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshots/otto-after-skeleton.png', fullPage: true });

    // Check if model viewer canvas is visible
    const canvas = await page.locator('canvas').count();
    console.log(`Canvas elements found: ${canvas}`);
    
    // Look for animation viewer
    const animationViewer = await page.locator('[data-testid="animation-viewer"]').count();
    console.log(`Animation viewer found: ${animationViewer}`);
    
    // If animations are present, try to play one
    if (animationViewer > 0) {
      // Select an animation
      await page.selectOption('select', { index: 1 });
      await page.waitForTimeout(1000);
      
      // Take screenshot before playing animation
      await page.screenshot({ path: 'screenshots/otto-animation-selected.png', fullPage: true });
      
      // Play animation
      await page.click('button[title="Play"]', { force: true });
      await page.waitForTimeout(2000);
      
      // Take screenshot while playing
      await page.screenshot({ path: 'screenshots/otto-animation-playing.png', fullPage: true });
    }

    // Filter PropertyBinding errors
    const propertyBindingErrors = consoleMessages.filter(msg => 
      msg.includes('PropertyBinding') && msg.includes('No target node found')
    );
    
    console.log(`\n🔍 Found ${propertyBindingErrors.length} PropertyBinding errors:`);
    propertyBindingErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });

    // Also check for any other animation-related errors
    const animationErrors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('animation') && 
      (msg.includes('error') || msg.includes('warn'))
    );
    
    console.log(`\n⚠️ Found ${animationErrors.length} animation-related errors:`);
    animationErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });

    // Log all console messages for debugging
    console.log(`\n📝 All console messages (${consoleMessages.length}):`);
    consoleMessages.forEach((msg, index) => {
      if (index < 50) { // Limit to first 50 messages
        console.log(`${index + 1}. ${msg}`);
      }
    });

    // The test should document the error, not necessarily fail
    if (propertyBindingErrors.length > 0) {
      console.log(`\n❌ CONFIRMED: ${propertyBindingErrors.length} PropertyBinding errors detected`);
    } else {
      console.log(`\n✅ NO PropertyBinding errors found`);
    }
  });
});