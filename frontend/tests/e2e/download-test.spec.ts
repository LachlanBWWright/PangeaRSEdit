import { test, expect } from '@playwright/test';

test('Check download buttons after Otto loads', async ({ page }) => {
    console.log('Navigating to site...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Click Model Viewer tab
    console.log('Clicking Model Viewer...');
    await page.click('text="Model Viewer"');
    await page.waitForTimeout(2000);
    
    // Click Otto skeleton button
    console.log('Clicking Otto skeleton button...');
    await page.click('text="Load Otto.bg3d Sample Model (with Skeleton)"');
    
    // Wait for model to process
    console.log('Waiting for model to process (15 seconds)...');
    await page.waitForTimeout(15000);
    
    // Check all buttons on the page
    const allButtons = await page.locator('button').allTextContents();
    console.log('All buttons on page:', allButtons);
    
    // Check for download buttons specifically
    const downloadButtons = await page.locator('button:has-text("Download")').allTextContents();
    console.log('Download buttons found:', downloadButtons);
    
    // Check for GLB download button
    const glbButton = await page.locator('button:has-text("GLB")').allTextContents();
    console.log('GLB buttons found:', glbButton);
    
    // Check for BG3D download button  
    const bg3dButton = await page.locator('button:has-text("BG3D")').allTextContents();
    console.log('BG3D buttons found:', bg3dButton);
    
    // Try to find and click download buttons if they exist
    try {
        // Look for download as GLB button
        const glbDownloadButton = page.locator('text="Download as GLB"');
        if (await glbDownloadButton.isVisible()) {
            console.log('Found "Download as GLB" button - clicking it...');
            
            // Set up download handler
            const downloadPromise = page.waitForDownload();
            await glbDownloadButton.click();
            const download = await downloadPromise;
            
            console.log(`Downloaded GLB file: ${download.suggestedFilename()}`);
            
            // Save to tmp for validation
            await download.saveAs(`/tmp/${download.suggestedFilename()}`);
            console.log(`Saved GLB to /tmp/${download.suggestedFilename()}`);
        } else {
            console.log('Download as GLB button not found');
        }
        
        // Look for download as BG3D button
        const bg3dDownloadButton = page.locator('text="Download as BG3D"');
        if (await bg3dDownloadButton.isVisible()) {
            console.log('Found "Download as BG3D" button - clicking it...');
            
            // Set up download handler
            const downloadPromise = page.waitForDownload();
            await bg3dDownloadButton.click();
            const download = await downloadPromise;
            
            console.log(`Downloaded BG3D file: ${download.suggestedFilename()}`);
            
            // Save to tmp for validation
            await download.saveAs(`/tmp/${download.suggestedFilename()}`);
            console.log(`Saved BG3D to /tmp/${download.suggestedFilename()}`);
        } else {
            console.log('Download as BG3D button not found');
        }
        
    } catch (error) {
        console.log('Error finding/clicking download buttons:', error.message);
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/tmp/final-otto-state.png', fullPage: true });
    console.log('Final screenshot taken');
    
    console.log('Test completed');
});