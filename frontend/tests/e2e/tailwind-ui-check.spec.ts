import { test, expect } from '@playwright/test';

test.describe('Tailwind CSS and UI Appearance', () => {
  test('homepage loads with correct Tailwind styling', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5174/PangeaRSEdit/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot of the homepage
    await page.screenshot({
      path: '/tmp/homepage-screenshot.png',
      fullPage: true
    });

    // Check that main content is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for console errors (especially Tailwind-related)
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Reload to capture console messages
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Log console messages for review
    console.log('=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    if (consoleErrors.length > 0) {
      console.log('=== Console Errors ===');
      consoleErrors.forEach(err => console.log(err));
    }

    // Check for Tailwind classes being applied
    // Most Tailwind classes should result in some computed styles
    const mainElement = page.locator('main, #root, [role="main"]').first();
    if (await mainElement.count() > 0) {
      const computedStyles = await mainElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
        };
      });
      console.log('=== Main Element Computed Styles ===');
      console.log(JSON.stringify(computedStyles, null, 2));
    }

    // Check that there are no critical CSS errors
    const hasCriticalCssErrors = consoleErrors.some(err => 
      err.toLowerCase().includes('css') || 
      err.toLowerCase().includes('stylesheet') ||
      err.toLowerCase().includes('tailwind')
    );
    
    expect(hasCriticalCssErrors).toBe(false);
  });

  test('game selector cards have proper styling', async ({ page }) => {
    await page.goto('http://localhost:5174/PangeaRSEdit/');
    await page.waitForLoadState('networkidle');

    // Look for game selector cards or buttons
    const gameCards = page.locator('[class*="card"], [class*="button"], button').first();
    
    if (await gameCards.count() > 0) {
      await gameCards.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: '/tmp/game-selector-screenshot.png',
      });

      // Check computed styles
      const styles = await gameCards.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          padding: computed.padding,
          margin: computed.margin,
          borderRadius: computed.borderRadius,
          display: computed.display,
        };
      });
      console.log('=== Game Card Styles ===');
      console.log(JSON.stringify(styles, null, 2));
    }
  });
});
