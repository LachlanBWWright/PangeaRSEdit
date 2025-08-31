import { test, expect } from '@playwright/test';
import { validateBytes } from 'gltf-validator';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Otto GLB glTF Validation', () => {
  test('should generate valid Otto GLB and check for PropertyBinding issues', async ({ page }) => {
    console.log('🔧 Testing Otto GLB generation and validation...');
    
    // Navigate to the application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    await page.click('text=Model Viewer');
    await page.waitForTimeout(2000);
    
    // Switch to Game Models mode  
    await page.click('button:has-text("Game Models")');
    await page.waitForTimeout(1000);
    
    // Select Otto Matic
    await page.locator('[role="combobox"]:has-text("Select a game")').click();
    await page.locator('[role="option"]:has-text("Otto Matic")').click();
    await page.waitForTimeout(1000);
    
    // Select Otto model
    await page.locator('[role="combobox"]:has-text("Select a model")').click();
    await page.locator('[role="option"]:has-text("Otto")').first().click();
    await page.waitForTimeout(1000);
    
    console.log('🔄 Loading Otto with skeleton data...');
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load completely
    await page.waitForTimeout(10000);
    
    // Look for download GLB button
    const downloadButton = page.locator('button:has-text("Download GLB")').or(
      page.locator('button:has-text("GLB")')
    );
    
    const hasDownloadButton = await downloadButton.count() > 0;
    console.log(`📥 Download button found: ${hasDownloadButton}`);
    
    if (hasDownloadButton) {
      // Set up download handler
      const downloadPromise = page.waitForDownload();
      
      // Click download
      await downloadButton.click();
      
      // Wait for download to complete
      const download = await downloadPromise;
      const downloadPath = path.join(__dirname, 'downloads', 'otto-skeleton.glb');
      
      // Ensure downloads directory exists
      const downloadDir = path.dirname(downloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // Save the downloaded file
      await download.saveAs(downloadPath);
      console.log(`💾 Downloaded GLB to: ${downloadPath}`);
      
      // Validate the GLB file using gltf-validator
      console.log('🔍 Validating GLB with gltf-validator...');
      
      try {
        const glbBuffer = fs.readFileSync(downloadPath);
        const result = await validateBytes(glbBuffer);
        
        console.log('📊 glTF Validation Results:');
        console.log(`  Errors: ${result.issues.numErrors}`);
        console.log(`  Warnings: ${result.issues.numWarnings}`);  
        console.log(`  Infos: ${result.issues.numInfos}`);
        console.log(`  Hints: ${result.issues.numHints}`);
        
        if (result.issues.numErrors > 0) {
          console.log('\n🔴 Validation Errors:');
          result.issues.messages.forEach((issue, index) => {
            if (issue.severity === 0) { // Error
              console.log(`  ${index + 1}. ${issue.code}: ${issue.message}`);
              if (issue.pointer) console.log(`     at ${issue.pointer}`);
            }
          });
        }
        
        if (result.issues.numWarnings > 0) {
          console.log('\n⚠️ Validation Warnings:');
          result.issues.messages.forEach((issue, index) => {
            if (issue.severity === 1) { // Warning  
              console.log(`  ${index + 1}. ${issue.code}: ${issue.message}`);
              if (issue.pointer) console.log(`     at ${issue.pointer}`);
            }
          });
        }
        
        // Check specifically for skin-related issues
        const skinIssues = result.issues.messages.filter(issue => 
          issue.code.includes('SKIN') || 
          issue.code.includes('NODE') ||
          issue.message.toLowerCase().includes('skin') ||
          issue.message.toLowerCase().includes('joint')
        );
        
        if (skinIssues.length > 0) {
          console.log('\n🦴 Skin/Joint-related Issues:');
          skinIssues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue.code}: ${issue.message}`);
            if (issue.pointer) console.log(`     at ${issue.pointer}`);
          });
        }
        
        // Log basic file info
        console.log('\n📋 File Info:');
        console.log(`  File size: ${glbBuffer.length} bytes`);
        console.log(`  Generator: ${result.validatedAsset?.asset?.generator || 'Unknown'}`);
        console.log(`  Nodes: ${result.validatedAsset?.nodes?.length || 0}`);
        console.log(`  Meshes: ${result.validatedAsset?.meshes?.length || 0}`);
        console.log(`  Skins: ${result.validatedAsset?.skins?.length || 0}`);
        console.log(`  Animations: ${result.validatedAsset?.animations?.length || 0}`);
        
        // Check for specific structural issues that might cause PropertyBinding errors
        if (result.validatedAsset?.skins && result.validatedAsset.skins.length > 0) {
          const skin = result.validatedAsset.skins[0];
          console.log(`\n🦴 Skin Details:`);
          console.log(`  Joints: ${skin.joints?.length || 0}`);
          console.log(`  Skeleton: ${skin.skeleton !== undefined ? `Node ${skin.skeleton}` : 'None'}`);
          console.log(`  Inverse Bind Matrices: ${skin.inverseBindMatrices !== undefined ? 'Present' : 'Missing'}`);
        }
        
        if (result.validatedAsset?.animations && result.validatedAsset.animations.length > 0) {
          console.log(`\n🎬 Animation Details:`);
          result.validatedAsset.animations.forEach((anim, index) => {
            console.log(`  Animation ${index}: ${anim.channels?.length || 0} channels, ${anim.samplers?.length || 0} samplers`);
          });
        }
        
        // Summary assessment
        if (result.issues.numErrors === 0 && result.issues.numWarnings === 0) {
          console.log('\n✅ GLB validation passed with no errors or warnings');
        } else if (result.issues.numErrors === 0) {
          console.log('\n⚠️ GLB validation passed but has warnings');
        } else {
          console.log('\n❌ GLB validation failed with errors');
        }
        
      } catch (error) {
        console.error('❌ Error during GLB validation:', error);
      }
      
    } else {
      console.log('❌ No download button found - skeleton may not have loaded properly');
    }
  });
});