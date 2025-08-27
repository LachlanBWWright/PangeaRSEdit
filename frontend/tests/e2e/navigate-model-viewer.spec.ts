import { test, expect } from '@playwright/test';

test('Navigate to Model Viewer and test Otto skeleton', async ({ page }) => {
    console.log('Navigating to site...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of main page
    await page.screenshot({ path: '/tmp/main-page.png', fullPage: true });
    console.log('Main page screenshot taken');
    
    // Look for Model Viewer navigation link
    console.log('Looking for Model Viewer navigation...');
    
    // Check if there's a Model Viewer tab/link/button
    const modelViewerLink = await page.locator('text="Model Viewer"').first();
    
    if (await modelViewerLink.isVisible()) {
        console.log('Found Model Viewer link, clicking it...');
        await modelViewerLink.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot after navigation
        await page.screenshot({ path: '/tmp/model-viewer-page.png', fullPage: true });
        console.log('Model Viewer page screenshot taken');
        
        // Look for Otto skeleton button
        const ottoButton = await page.locator('text*="Otto"').and(page.locator('text*="skeleton"')).first();
        
        if (await ottoButton.isVisible()) {
            console.log('Found Otto skeleton button!');
            
            // Click the Otto skeleton button
            await ottoButton.click();
            console.log('Clicked Otto skeleton button');
            
            // Wait for loading
            await page.waitForTimeout(5000);
            
            // Take screenshot after loading
            await page.screenshot({ path: '/tmp/otto-loaded.png', fullPage: true });
            console.log('Otto loaded screenshot taken');
            
            // Check for console errors
            const logs = [];
            page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
            
            // Look for download buttons
            const glbButton = await page.locator('text="Download as GLB"').first();
            const bg3dButton = await page.locator('text="Download as BG3D"').first();
            
            if (await glbButton.isVisible()) {
                console.log('GLB download button is visible');
            } else {
                console.log('GLB download button NOT visible');
            }
            
            if (await bg3dButton.isVisible()) {
                console.log('BG3D download button is visible');
            } else {
                console.log('BG3D download button NOT visible');
            }
            
        } else {
            console.log('Otto skeleton button not found');
            
            // Get all buttons and text to see what's available
            const allButtons = await page.locator('button').allTextContents();
            console.log('Available buttons:', allButtons);
            
            const allText = await page.locator('body').textContent();
            console.log('Page contains "Otto":', allText?.includes('Otto'));
            console.log('Page contains "skeleton":', allText?.includes('skeleton'));
        }
        
    } else {
        console.log('Model Viewer link not found on main page');
        
        // Try to find any navigation elements
        const navLinks = await page.locator('a, button').allTextContents();
        console.log('All navigation elements:', navLinks);
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/tmp/final-state.png', fullPage: true });
    console.log('Final state screenshot taken');
});