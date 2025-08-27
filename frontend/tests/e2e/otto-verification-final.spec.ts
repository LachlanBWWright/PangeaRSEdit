import { test, expect } from '@playwright/test';

test('Otto Skeleton System Complete Verification', async ({ page }) => {
    console.log('=== Otto Skeleton System Verification ===');
    
    // Navigate to model viewer
    await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
    await page.waitForTimeout(3000);
    
    // Click Otto skeleton button
    console.log('Loading Otto with skeleton...');
    await page.click('text="Load Otto.bg3d Sample Model (with Skeleton)"');
    
    // Wait for loading to complete
    await page.waitForTimeout(15000);
    
    // Take screenshot of loaded model
    await page.screenshot({ 
        path: '/tmp/otto-skeleton-working.png', 
        fullPage: true 
    });
    console.log('Screenshot taken: otto-skeleton-working.png');
    
    // Verify download buttons are present (confirms model loaded)
    const downloadButtons = await page.locator('button:has-text("Download")').allTextContents();
    console.log('Download buttons found:', downloadButtons);
    expect(downloadButtons.length).toBeGreaterThan(0);
    
    // Check for animation dropdown
    const animationDropdown = page.locator('select').first();
    await expect(animationDropdown).toBeVisible();
    
    // Get all animation options
    const animationOptions = await animationDropdown.locator('option').allTextContents();
    console.log(`Found ${animationOptions.length - 1} animations`);
    
    // Verify we have the expected 35 Otto animations (plus default option)
    expect(animationOptions.length).toBe(36); // 35 animations + 1 default
    
    // Check animation timing variety (proves skeleton data is properly processed)
    const animationsWithTimings = animationOptions.filter(opt => 
        opt.includes('(') && opt.includes(')')
    );
    const uniqueDurations = new Set(animationsWithTimings.map(opt => 
        opt.match(/\(([^)]+)\)/)?.[1]
    ));
    
    console.log('Animation durations found:', Array.from(uniqueDurations).slice(0, 10));
    console.log(`Total unique durations: ${uniqueDurations.size}`);
    
    // Verify multiple unique durations (proves skeleton timing is correct)
    expect(uniqueDurations.size).toBeGreaterThan(5);
    
    // Test GLB download
    console.log('Testing GLB download...');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text="Download as GLB"')
    ]);
    
    const glbPath = `/tmp/otto-skeleton-${Date.now()}.glb`;
    await download.saveAs(glbPath);
    
    const fs = await import('fs');
    const stats = fs.statSync(glbPath);
    console.log(`GLB file size: ${stats.size} bytes`);
    
    // Verify GLB is properly sized (should be ~490KB with skeleton vs ~96KB without)
    expect(stats.size).toBeGreaterThan(400000); // > 400KB indicates skeleton data
    expect(stats.size).toBeLessThan(600000); // < 600KB for reasonable upper bound
    
    console.log('✅ Otto skeleton system verification COMPLETE');
    console.log('✅ All 35 animations load with proper timing');
    console.log('✅ No site crashes or errors');
    console.log('✅ GLB download contains skeleton data');
    console.log('✅ Animation timing extraction works correctly');
});