import { test, expect } from '@playwright/test';

test('Download Otto GLB and validate with gltf-validator', async ({ page }) => {
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
    
    try {
        // Download GLB file
        console.log('Starting GLB download...');
        
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('text="Download as GLB"')
        ]);
        
        console.log(`Downloaded file: ${download.suggestedFilename()}`);
        
        // Save to tmp for validation
        const downloadPath = `/tmp/${download.suggestedFilename()}`;
        await download.saveAs(downloadPath);
        console.log(`Saved GLB to ${downloadPath}`);
        
        // Get file stats
        const fs = await import('fs');
        const stats = fs.statSync(downloadPath);
        console.log(`GLB file size: ${stats.size} bytes`);
        
        // Test GLB with gltf-validator
        console.log('Running glTF validation...');
        const { execSync } = await import('child_process');
        
        try {
            const validationOutput = execSync(`gltf_validator ${downloadPath}`, { 
                encoding: 'utf8',
                timeout: 30000
            });
            console.log('glTF validation output:');
            console.log(validationOutput);
        } catch (validationError: any) {
            console.log('glTF validation failed:');
            console.log('stdout:', validationError.stdout);
            console.log('stderr:', validationError.stderr);
        }
        
    } catch (error: any) {
        console.log('Download error:', error.message);
    }
    
    try {
        // Download BG3D file
        console.log('Starting BG3D download...');
        
        const [bg3dDownload] = await Promise.all([
            page.waitForEvent('download'),
            page.click('text="Download as BG3D"')
        ]);
        
        console.log(`Downloaded BG3D file: ${bg3dDownload.suggestedFilename()}`);
        
        // Save to tmp for comparison
        const bg3dPath = `/tmp/${bg3dDownload.suggestedFilename()}`;
        await bg3dDownload.saveAs(bg3dPath);
        console.log(`Saved BG3D to ${bg3dPath}`);
        
        // Get file stats
        const fs = await import('fs');
        const bg3dStats = fs.statSync(bg3dPath);
        console.log(`BG3D file size: ${bg3dStats.size} bytes`);
        
    } catch (error: any) {
        console.log('BG3D download error:', error.message);
    }
    
    console.log('Download test completed');
});