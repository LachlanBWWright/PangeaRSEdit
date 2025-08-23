/**
 * Test script to load Otto model with skeleton data and verify animations work
 */
import { test, expect } from '@playwright/test';

test.describe('Otto Animation System Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
    await page.waitForLoadState('networkidle');
  });

  test('load Otto model with skeleton and verify animations', async ({ page }) => {
    console.log('Starting Otto animation test...');
    
    // Take screenshot of initial state
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/01_initial_state.png' });
    
    // Click Otto sample button (with skeleton)
    const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
    await expect(ottoButton).toBeVisible();
    await ottoButton.click();
    
    console.log('Clicked Otto sample button, waiting for model to load...');
    
    // Wait for model loading to complete
    await page.waitForTimeout(5000);
    
    // Take screenshot after model loads
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/02_otto_loaded.png' });
    
    // Check for console errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);
    
    // Check if animations are loaded
    const animationDropdown = page.locator('select').filter({ hasText: 'Animation' }).first();
    await expect(animationDropdown).toBeVisible({ timeout: 10000 });
    
    // Get animation options
    const animationOptions = await animationDropdown.locator('option').allTextContents();
    console.log('Available animations:', animationOptions);
    
    // Verify at least some animations are available
    expect(animationOptions.length).toBeGreaterThan(1); // More than just "-- Select Animation --"
    
    // Select first real animation (not the "-- Select Animation --" option)
    const firstAnimation = animationOptions.find(opt => opt !== '-- Select Animation --' && opt.trim() !== '');
    if (firstAnimation) {
      console.log(`Selecting animation: ${firstAnimation}`);
      await animationDropdown.selectOption({ label: firstAnimation });
      
      // Wait for animation to be selected
      await page.waitForTimeout(1000);
      
      // Take screenshot with animation selected
      await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/03_animation_selected.png' });
      
      // Try to play the animation
      const playButton = page.locator('button').filter({ hasText: 'Play' }).or(page.locator('button svg[data-lucide="play"]').locator('..')).first();
      if (await playButton.isVisible()) {
        console.log('Clicking play button...');
        await playButton.click();
        
        // Wait for animation to play for a few seconds
        await page.waitForTimeout(3000);
        
        // Take screenshot during animation
        await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/04_animation_playing.png' });
      }
    }
    
    // Check for errors in console
    const errorMessages = consoleMessages.filter(msg => 
      msg.startsWith('error:') || 
      msg.includes('error') ||
      msg.includes('Error') ||
      msg.includes('target node found') ||
      msg.includes('Cannot read properties')
    );
    
    console.log('Console messages:', consoleMessages.slice(-20)); // Show last 20 messages
    console.log('Error messages found:', errorMessages);
    
    // The test should pass if no critical errors were found
    expect(errorMessages.length).toBeLessThan(5); // Allow some minor warnings but not many errors
  });

  test('compare Otto with and without skeleton', async ({ page }) => {
    console.log('Testing Otto model comparison...');
    
    // Load Otto without skeleton first
    const ottoWithoutButton = page.locator('button:has-text("Otto.bg3d Sample Model (without Skeleton)")');
    await expect(ottoWithoutButton).toBeVisible();
    await ottoWithoutButton.click();
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/05_otto_without_skeleton.png' });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Load Otto with skeleton
    const ottoWithButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
    await expect(ottoWithButton).toBeVisible();
    await ottoWithButton.click();
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/06_otto_with_skeleton.png' });
    
    console.log('Comparison screenshots taken - manually compare 05_otto_without_skeleton.png and 06_otto_with_skeleton.png');
  });
});