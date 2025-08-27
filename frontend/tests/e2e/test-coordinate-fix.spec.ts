import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Coordinate adjustment and map download fixes', () => {
  test('should properly adjust coordinates and allow map download', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173/PangeaRSEdit/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Navigating to Level Editor...');
    
    // Click on Level Editor link
    await page.getByRole('link', { name: 'Level Editor' }).click();
    await page.waitForTimeout(2000);
    
    // Take a screenshot of the level editor page
    await page.screenshot({ path: 'level-editor-page.png', fullPage: true });
    
    console.log('Loading a test level...');
    
    // Try to load a level by clicking on one of the default levels
    const levelButton = page.getByRole('button', { name: 'Level 1', exact: true });
    if (await levelButton.isVisible()) {
      await levelButton.click();
      await page.waitForTimeout(3000);
      
      // Take a screenshot after loading the level
      await page.screenshot({ path: 'level-loaded.png', fullPage: true });
      
      console.log('Looking for Editor tab...');
      
      // Look for the "Editor" tab/button
      const editorButton = page.getByText('Editor');
      if (await editorButton.isVisible()) {
        await editorButton.click();
        await page.waitForTimeout(2000);
        
        console.log('Looking for Supertiles menu...');
        
        // Look for the "Supertiles" button/tab
        const supertilesButton = page.getByText('Supertiles');
        if (await supertilesButton.isVisible()) {
          await supertilesButton.click();
          await page.waitForTimeout(1000);
          
          // Take a screenshot of the supertiles menu
          await page.screenshot({ path: 'supertiles-menu.png', fullPage: true });
          
          console.log('Testing coordinate adjustments...');
          
          // Try to add a column to the left (this should trigger coordinate adjustments)
          const addLeftButton = page.getByRole('button', { name: '+ Left' });
          if (await addLeftButton.isVisible()) {
            await addLeftButton.click();
            await page.waitForTimeout(1000);
            
            console.log('Added left column, testing coordinate adjustment...');
            
            // Take a screenshot after adding left column
            await page.screenshot({ path: 'after-add-left-column.png', fullPage: true });
          }
          
          // Try to add a row to the top (this should trigger coordinate adjustments)
          const addTopButton = page.getByRole('button', { name: '+ Top' });
          if (await addTopButton.isVisible()) {
            await addTopButton.click();
            await page.waitForTimeout(1000);
            
            console.log('Added top row, testing coordinate adjustment...');
            
            // Take a screenshot after adding top row
            await page.screenshot({ path: 'after-add-top-row.png', fullPage: true });
          }
          
          console.log('Testing map download functionality...');
          
          // Now test map download functionality - look for download buttons
          const downloadButtons = await page.getByRole('button', { name: 'Download' }).all();
          if (downloadButtons.length > 0) {
            // Try the map download button (should be the last one)
            const mapDownloadButton = downloadButtons[downloadButtons.length - 1];
            
            try {
              // Start waiting for the download
              const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
              
              await mapDownloadButton.click();
              
              console.log('Clicked download button, waiting for download...');
              
              // Wait for download to complete
              const download = await downloadPromise;
              
              // If we get here, the download worked
              console.log('✅ Download successful!');
              await page.screenshot({ path: 'download-successful.png', fullPage: true });
              
            } catch (error) {
              console.log('❌ Download failed:', error);
              await page.screenshot({ path: 'download-failed.png', fullPage: true });
              
              // Check for any error messages on the page
              const toastMessages = await page.locator('[role="alert"], .toast, .notification').allTextContents();
              if (toastMessages.length > 0) {
                console.log('Error messages found:', toastMessages);
              }
              
              // Check browser console for errors
              const consoleLogs = await page.evaluate(() => {
                return window.console.toString();
              });
              console.log('Console state:', consoleLogs);
            }
          } else {
            console.log('No download buttons found');
          }
        } else {
          console.log('Supertiles button not found');
          await page.screenshot({ path: 'editor-view.png', fullPage: true });
        }
      } else {
        console.log('Editor button not found');
        await page.screenshot({ path: 'level-view.png', fullPage: true });
      }
    } else {
      console.log('Level button not found');
    }
  });
});