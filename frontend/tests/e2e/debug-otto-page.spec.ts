import { test, expect } from '@playwright/test';

test('Otto skeleton debug - check page content', async ({ page }) => {
    console.log('Navigating to site...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of full page
    await page.screenshot({ path: '/tmp/debug-page-content.png', fullPage: true });
    console.log('Screenshot saved to /tmp/debug-page-content.png');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get all button texts
    const buttons = await page.locator('button').allTextContents();
    console.log('All buttons found:', buttons);
    
    // Get all text that might contain "Otto"
    const ottoElements = await page.locator('*:has-text("Otto")').allTextContents();
    console.log('All elements containing "Otto":', ottoElements);
    
    // Check if any text contains "skeleton"
    const skeletonElements = await page.locator('*:has-text("skeleton")').allTextContents();
    console.log('All elements containing "skeleton":', skeletonElements);
    
    // Get all visible text on page
    const allText = await page.locator('body').textContent();
    console.log('Page contains "Load Otto":', allText?.includes('Load Otto'));
    console.log('Page contains "Skeleton":', allText?.includes('Skeleton'));
    console.log('Page contains "bg3d":', allText?.includes('bg3d'));
});