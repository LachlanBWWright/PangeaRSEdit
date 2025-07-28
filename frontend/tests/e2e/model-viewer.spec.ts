import { test, expect } from '@playwright/test';

test.describe('Model Viewer Page', () => {
  test('should navigate to model viewer and load interface', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to be available
    await expect(page.locator('text=PangeaRS Edit')).toBeVisible();
    
    // Click on Model Viewer link
    await page.click('text=Model Viewer');
    
    // Check that we're on the model viewer page
    await expect(page.url()).toContain('/model-viewer');
    
    // Check that the main interface elements are present
    await expect(page.locator('text=Model Upload')).toBeVisible();
    await expect(page.locator('text=Drop a BG3D file here or click to select')).toBeVisible();
    await expect(page.locator('text=Load Otto.bg3d Test Model')).toBeVisible();
    await expect(page.locator('text=No Model Loaded')).toBeVisible();
  });

  test('should load Otto.bg3d test model', async ({ page }) => {
    await page.goto('/model-viewer');
    
    // Click the test model button
    await page.click('text=Load Otto.bg3d Test Model');
    
    // Wait for loading to start
    await expect(page.locator('text=Loading model...')).toBeVisible();
    
    // Wait for model to be loaded (with longer timeout for BG3D processing)
    await expect(page.locator('text=Model Controls')).toBeVisible({ timeout: 30000 });
    
    // Check that the model appears in the controls
    await expect(page.locator('text=Otto')).toBeVisible();
    
    // Check that the "No Model Loaded" message is gone
    await expect(page.locator('text=No Model Loaded')).not.toBeVisible();
  });

  test('should allow toggling model visibility', async ({ page }) => {
    await page.goto('/model-viewer');
    
    // Load the test model
    await page.click('text=Load Otto.bg3d Test Model');
    await expect(page.locator('text=Model Controls')).toBeVisible({ timeout: 30000 });
    
    // Find the checkbox for the model
    const modelCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(modelCheckbox).toBeChecked();
    
    // Toggle visibility
    await modelCheckbox.uncheck();
    await expect(modelCheckbox).not.toBeChecked();
    
    // Toggle back
    await modelCheckbox.check();
    await expect(modelCheckbox).toBeChecked();
  });

  test('should navigate back to level editor', async ({ page }) => {
    await page.goto('/model-viewer');
    
    // Click on Level Editor link
    await page.click('text=Level Editor');
    
    // Check that we're back on the level editor page
    await expect(page.url()).not.toContain('/model-viewer');
    await expect(page.locator('text=Loading Map Editor...')).toBeVisible();
  });
});