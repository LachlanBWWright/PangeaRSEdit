import { test, expect } from '@playwright/test';

test('Check Model Viewer page and find Otto buttons', async ({ page }) => {
    console.log('Navigating to site...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Click Model Viewer tab
    console.log('Clicking Model Viewer...');
    await page.click('text="Model Viewer"');
    await page.waitForTimeout(2000);
    
    // Take screenshot of Model Viewer page
    await page.screenshot({ path: '/tmp/model-viewer-content.png', fullPage: true });
    console.log('Model Viewer page screenshot taken');
    
    // Get all buttons and their text
    const allButtons = await page.locator('button').allTextContents();
    console.log('All buttons on Model Viewer page:', allButtons);
    
    // Look for Otto-related text
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "Otto":', bodyText?.includes('Otto'));
    console.log('Page contains "skeleton":', bodyText?.includes('skeleton'));
    console.log('Page contains "bg3d":', bodyText?.includes('bg3d'));
    
    // Try to find Otto skeleton button with different approaches
    console.log('Looking for Otto skeleton button...');
    
    // Check for buttons containing "Otto" and "skeleton"
    const ottoButtons = await page.locator('button:has-text("Otto")').allTextContents();
    console.log('Buttons containing "Otto":', ottoButtons);
    
    const skeletonButtons = await page.locator('button:has-text("skeleton")').allTextContents();
    console.log('Buttons containing "skeleton":', skeletonButtons);
    
    // Look for the specific button text
    const specificButtons = await page.locator('button:has-text("Load Otto.bg3d Sample Model")').allTextContents();
    console.log('Buttons with "Load Otto.bg3d Sample Model":', specificButtons);
    
    // Try to find any element with "Load Otto" text
    const ottoElements = await page.locator('*:has-text("Load Otto")').allTextContents();
    console.log('Elements containing "Load Otto":', ottoElements.slice(0, 5)); // First 5 to avoid too much output
    
    // If we find the button, try to interact with it
    try {
        const ottoSkeletonButton = page.locator('text="Load Otto.bg3d Sample Model (with Skeleton)"');
        
        if (await ottoSkeletonButton.isVisible()) {
            console.log('Found Otto skeleton button! Clicking it...');
            await ottoSkeletonButton.click();
            
            // Wait for loading
            await page.waitForTimeout(5000);
            
            // Take screenshot after clicking
            await page.screenshot({ path: '/tmp/after-otto-click.png', fullPage: true });
            console.log('Screenshot taken after clicking Otto button');
            
            // Check for download buttons
            const downloadButtons = await page.locator('button:has-text("Download")').allTextContents();
            console.log('Download buttons found:', downloadButtons);
            
        } else {
            console.log('Otto skeleton button not visible');
        }
        
    } catch (error) {
        console.log('Error finding Otto skeleton button:', error.message);
    }
    
    // Check console logs for any errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('Console error:', msg.text());
        }
    });
    
    console.log('Test completed');
});