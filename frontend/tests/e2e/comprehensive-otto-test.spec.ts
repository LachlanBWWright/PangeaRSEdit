import { test, expect } from '@playwright/test';

test('Comprehensive Otto skeleton test with console logging', async ({ page }) => {
    // Capture console logs
    const consoleLogs: any[] = [];
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleLogs.push({ type, text });
        console.log(`[${type.toUpperCase()}] ${text}`);
    });

    // Capture network errors
    page.on('requestfailed', request => {
        console.log(`[NETWORK FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log('Navigating to site...');
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Click Model Viewer tab
    console.log('Clicking Model Viewer...');
    await page.click('text="Model Viewer"');
    await page.waitForTimeout(2000);
    
    // Take screenshot before clicking Otto button
    await page.screenshot({ path: '/tmp/before-otto-click.png', fullPage: true });
    console.log('Screenshot taken before Otto click');
    
    // Click Otto skeleton button
    console.log('Clicking Otto skeleton button...');
    await page.click('text="Load Otto.bg3d Sample Model (with Skeleton)"');
    
    // Wait longer for potential loading/errors
    console.log('Waiting for Otto model loading (10 seconds)...');
    await page.waitForTimeout(10000);
    
    // Take screenshot after loading wait
    await page.screenshot({ path: '/tmp/after-otto-wait.png', fullPage: true });
    console.log('Screenshot taken after Otto loading wait');
    
    // Check for any error messages on the page
    const errorElements = await page.locator('*:has-text("error"), *:has-text("Error"), *:has-text("failed"), *:has-text("Failed")').allTextContents();
    if (errorElements.length > 0) {
        console.log('Error messages found on page:', errorElements);
    }
    
    // Look for loading indicators
    const loadingElements = await page.locator('*:has-text("loading"), *:has-text("Loading")').allTextContents();
    if (loadingElements.length > 0) {
        console.log('Loading indicators found:', loadingElements);
    }
    
    // Check the model status
    const modelStatusText = await page.locator('body').textContent();
    console.log('Page contains "No Model Loaded":', modelStatusText?.includes('No Model Loaded'));
    console.log('Page contains "Download":', modelStatusText?.includes('Download'));
    
    // Look for any canvas elements (3D viewer)
    const canvasElements = await page.locator('canvas').count();
    console.log('Number of canvas elements found:', canvasElements);
    
    // Check for download buttons
    const downloadButtons = await page.locator('button:has-text("Download")').allTextContents();
    console.log('Download buttons found:', downloadButtons);
    
    // Log all console messages
    console.log('\n=== CONSOLE LOGS SUMMARY ===');
    consoleLogs.forEach(log => {
        console.log(`[${log.type}] ${log.text}`);
    });
    
    // Check if there were any errors in console
    const errors = consoleLogs.filter(log => log.type === 'error');
    const warnings = consoleLogs.filter(log => log.type === 'warning');
    
    console.log(`\nFound ${errors.length} console errors and ${warnings.length} warnings`);
    
    if (errors.length > 0) {
        console.log('\n=== CONSOLE ERRORS ===');
        errors.forEach(error => console.log(error.text));
    }
    
    if (warnings.length > 0) {
        console.log('\n=== CONSOLE WARNINGS ===');
        warnings.forEach(warning => console.log(warning.text));
    }
    
    console.log('Test completed');
});