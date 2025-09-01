/**
 * Simple manual test to debug Otto browser loading
 */
import { chromium } from 'playwright';

async function testOttoLoading() {
  console.log('Starting manual browser test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages and errors
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded successfully');
    
    // Take a screenshot first
    await page.screenshot({ path: '/tmp/before_otto_load.png' });
    console.log('Screenshot saved: /tmp/before_otto_load.png');
    
    // Click the "Load Otto with Skeleton Data" button
    console.log('Looking for Otto button...');
    const ottoButton = page.locator('button:has-text("Load Otto with Skeleton Data")');
    await ottoButton.waitFor({ timeout: 10000 });
    console.log('Found Otto button, clicking...');
    
    await ottoButton.click();
    
    // Wait a bit and see what happens
    await page.waitForTimeout(5000);
    
    // Take another screenshot
    await page.screenshot({ path: '/tmp/after_otto_load.png' });
    console.log('Screenshot saved: /tmp/after_otto_load.png');
    
    // Check for errors in the page
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[data-error], .error, .text-red-500');
      return Array.from(errorElements).map(el => el.textContent);
    });
    
    if (errors.length > 0) {
      console.log('Found errors on page:', errors);
    } else {
      console.log('No visible errors found');
    }
    
    // Check if model viewer shows anything
    const modelContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? 'Canvas found' : 'No canvas found';
    });
    console.log('Model content:', modelContent);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  } finally {
    await browser.close();
  }
}

testOttoLoading().catch(console.error);