import { test, expect } from '@playwright/test';

test.describe('Supertile Row/Column Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Upload a test terrain file or wait for default map to load
    // This might need to be adjusted based on how the app works
    await page.waitForTimeout(2000);
  });

  test('should display supertile dimension info', async ({ page }) => {
    // Navigate to supertiles view if needed
    // Look for supertile dimension information
    await expect(page.getByText(/Supertiles Wide:/)).toBeVisible();
    await expect(page.getByText(/Supertiles High:/)).toBeVisible();
    await expect(page.getByText(/Unique Supertiles/)).toBeVisible();
  });

  test('should show row operation buttons', async ({ page }) => {
    // Check that row operation buttons are visible
    await expect(page.getByText('Row Operations')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Top' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Bottom' })).toBeVisible();
    await expect(page.getByRole('button', { name: '- Top' })).toBeVisible();
    await expect(page.getByRole('button', { name: '- Bottom' })).toBeVisible();
  });

  test('should show column operation buttons', async ({ page }) => {
    // Check that column operation buttons are visible
    await expect(page.getByText('Column Operations')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Left' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Right' })).toBeVisible();
    await expect(page.getByRole('button', { name: '- Left' })).toBeVisible();
    await expect(page.getByRole('button', { name: '- Right' })).toBeVisible();
  });

  test('should add a row to the top', async ({ page }) => {
    // Get initial dimensions
    const initialHeightText = await page.getByText(/Supertiles High:/).textContent();
    const initialHeight = parseInt(initialHeightText?.match(/\d+/)?.[0] || '0');
    
    // Click add row to top
    await page.getByRole('button', { name: '+ Top' }).click();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Check if dimensions updated
    const newHeightText = await page.getByText(/Supertiles High:/).textContent();
    const newHeight = parseInt(newHeightText?.match(/\d+/)?.[0] || '0');
    
    expect(newHeight).toBe(initialHeight + 1);
    
    // Check for success message
    await expect(page.getByText(/Added supertile row to top/)).toBeVisible({ timeout: 5000 });
  });

  test('should add a row to the bottom', async ({ page }) => {
    // Get initial dimensions
    const initialHeightText = await page.getByText(/Supertiles High:/).textContent();
    const initialHeight = parseInt(initialHeightText?.match(/\d+/)?.[0] || '0');
    
    // Click add row to bottom
    await page.getByRole('button', { name: '+ Bottom' }).click();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Check if dimensions updated
    const newHeightText = await page.getByText(/Supertiles High:/).textContent();
    const newHeight = parseInt(newHeightText?.match(/\d+/)?.[0] || '0');
    
    expect(newHeight).toBe(initialHeight + 1);
    
    // Check for success message
    await expect(page.getByText(/Added supertile row to bottom/)).toBeVisible({ timeout: 5000 });
  });

  test('should add a column to the left', async ({ page }) => {
    // Get initial dimensions
    const initialWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const initialWidth = parseInt(initialWidthText?.match(/\d+/)?.[0] || '0');
    
    // Click add column to left
    await page.getByRole('button', { name: '+ Left' }).click();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Check if dimensions updated
    const newWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const newWidth = parseInt(newWidthText?.match(/\d+/)?.[0] || '0');
    
    expect(newWidth).toBe(initialWidth + 1);
    
    // Check for success message
    await expect(page.getByText(/Added supertile column to left/)).toBeVisible({ timeout: 5000 });
  });

  test('should add a column to the right', async ({ page }) => {
    // Get initial dimensions
    const initialWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const initialWidth = parseInt(initialWidthText?.match(/\d+/)?.[0] || '0');
    
    // Click add column to right
    await page.getByRole('button', { name: '+ Right' }).click();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Check if dimensions updated
    const newWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const newWidth = parseInt(newWidthText?.match(/\d+/)?.[0] || '0');
    
    expect(newWidth).toBe(initialWidth + 1);
    
    // Check for success message
    await expect(page.getByText(/Added supertile column to right/)).toBeVisible({ timeout: 5000 });
  });

  test('should remove a row from the top when safe to do so', async ({ page }) => {
    // First, ensure we have more than 1 row by adding one
    await page.getByRole('button', { name: '+ Top' }).click();
    await page.waitForTimeout(500);
    
    // Get current dimensions
    const currentHeightText = await page.getByText(/Supertiles High:/).textContent();
    const currentHeight = parseInt(currentHeightText?.match(/\d+/)?.[0] || '0');
    
    // Only proceed if we have more than 1 row
    if (currentHeight > 1) {
      // Click remove row from top
      await page.getByRole('button', { name: '- Top' }).click();
      
      // Wait for operation to complete
      await page.waitForTimeout(500);
      
      // Check if dimensions updated
      const newHeightText = await page.getByText(/Supertiles High:/).textContent();
      const newHeight = parseInt(newHeightText?.match(/\d+/)?.[0] || '0');
      
      expect(newHeight).toBe(currentHeight - 1);
      
      // Check for success message
      await expect(page.getByText(/Removed supertile row from top/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should remove a column from the left when safe to do so', async ({ page }) => {
    // First, ensure we have more than 1 column by adding one
    await page.getByRole('button', { name: '+ Left' }).click();
    await page.waitForTimeout(500);
    
    // Get current dimensions
    const currentWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const currentWidth = parseInt(currentWidthText?.match(/\d+/)?.[0] || '0');
    
    // Only proceed if we have more than 1 column
    if (currentWidth > 1) {
      // Click remove column from left
      await page.getByRole('button', { name: '- Left' }).click();
      
      // Wait for operation to complete
      await page.waitForTimeout(500);
      
      // Check if dimensions updated
      const newWidthText = await page.getByText(/Supertiles Wide:/).textContent();
      const newWidth = parseInt(newWidthText?.match(/\d+/)?.[0] || '0');
      
      expect(newWidth).toBe(currentWidth - 1);
      
      // Check for success message
      await expect(page.getByText(/Removed supertile column from left/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should disable remove buttons when at minimum dimensions', async ({ page }) => {
    // Check if remove buttons are disabled when we're at minimum size
    // This depends on the current map size
    const heightText = await page.getByText(/Supertiles High:/).textContent();
    const widthText = await page.getByText(/Supertiles Wide:/).textContent();
    const height = parseInt(heightText?.match(/\d+/)?.[0] || '0');
    const width = parseInt(widthText?.match(/\d+/)?.[0] || '0');
    
    if (height === 1) {
      await expect(page.getByRole('button', { name: '- Top' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '- Bottom' })).toBeDisabled();
    }
    
    if (width === 1) {
      await expect(page.getByRole('button', { name: '- Left' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '- Right' })).toBeDisabled();
    }
  });

  test('should perform complex sequence of operations', async ({ page }) => {
    // Get initial dimensions
    const initialHeightText = await page.getByText(/Supertiles High:/).textContent();
    const initialWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const initialHeight = parseInt(initialHeightText?.match(/\d+/)?.[0] || '0');
    const initialWidth = parseInt(initialWidthText?.match(/\d+/)?.[0] || '0');
    
    // Perform a sequence of operations
    await page.getByRole('button', { name: '+ Top' }).click();
    await page.waitForTimeout(300);
    
    await page.getByRole('button', { name: '+ Right' }).click();
    await page.waitForTimeout(300);
    
    await page.getByRole('button', { name: '+ Bottom' }).click();
    await page.waitForTimeout(300);
    
    await page.getByRole('button', { name: '+ Left' }).click();
    await page.waitForTimeout(300);
    
    // Check final dimensions
    const finalHeightText = await page.getByText(/Supertiles High:/).textContent();
    const finalWidthText = await page.getByText(/Supertiles Wide:/).textContent();
    const finalHeight = parseInt(finalHeightText?.match(/\d+/)?.[0] || '0');
    const finalWidth = parseInt(finalWidthText?.match(/\d+/)?.[0] || '0');
    
    expect(finalHeight).toBe(initialHeight + 2);
    expect(finalWidth).toBe(initialWidth + 2);
  });
});