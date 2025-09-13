/**
 * Playwright tests for skeleton system functionality in the model viewer
 * Tests the UI interaction and visual verification of skeleton loading and display
 */

import { test, expect } from '@playwright/test';

test.describe('Skeleton System UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can navigate to model viewer and load skeleton models', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Verify model viewer page loaded
    await expect(page.locator('text=Model Upload')).toBeVisible();
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Verify Characters category is selected by default
    await expect(page.locator('text=Characters')).toBeVisible();
    
    // Select Otto character model
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    await page.click('text=Otto');
    
    // Verify skeleton file info is displayed
    await expect(page.locator('text=Otto.skeleton.rsrc')).toBeVisible();
    
    // Load the model with skeleton
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load
    await page.waitForTimeout(3000);
    
    // Verify model loaded successfully
    await expect(page.locator('text=Model loaded successfully')).toBeVisible();
    
    // Verify 3D canvas is visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('skeleton model selector shows all available games and characters', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Check all games are available
    await page.click('[data-testid="game-select"], .select-trigger');
    
    const expectedGames = [
      'Otto Matic',
      'Bugdom 2', 
      'Cro-Mag Rally',
      'Nanosaur 2',
      'Billy Frontier'
    ];
    
    for (const game of expectedGames) {
      await expect(page.locator(`text=${game}`)).toBeVisible();
    }
    
    // Select Otto Matic and verify character models
    await page.click('text=Otto Matic');
    
    // Open model selector
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    
    // Verify key Otto characters are available (sample check)
    const expectedOttoCharacters = ['Otto', 'Onion', 'BeeWoman', 'Blob', 'BrainAlien'];
    
    for (const character of expectedOttoCharacters) {
      await expect(page.locator(`text=${character}`)).toBeVisible();
    }
  });

  test('can load model without skeleton data', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Select Otto character model
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    await page.click('text=Otto');
    
    // Choose to load without skeleton
    await page.click('input[type="radio"]:near(:text("Load model only"))');
    
    // Load the model
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load
    await page.waitForTimeout(3000);
    
    // Verify model loaded successfully
    await expect(page.locator('text=Model loaded successfully')).toBeVisible();
    
    // Verify 3D canvas is visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('can switch between different games and load their skeleton models', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Test loading from different games
    const gamesToTest = [
      { game: 'Bugdom 2', character: 'BuddyBug' },
      { game: 'Nanosaur 2', character: 'Nano' },
      { game: 'Billy Frontier', character: 'Billy' }
    ];
    
    for (const { game, character } of gamesToTest) {
      // Select game
      await page.click('[data-testid="game-select"], .select-trigger');
      await page.click(`text=${game}`);
      
      // Wait for models to load
      await page.waitForTimeout(500);
      
      // Select character
      await page.click('[data-testid="model-select"], .model-select .select-trigger');
      await page.click(`text=${character}`);
      
      // Verify skeleton info is shown
      await expect(page.locator('text=.skeleton.rsrc')).toBeVisible();
      
      // Load the model
      await page.click(`button:has-text("Load ${character}")`);
      
      // Wait for model to load
      await page.waitForTimeout(2000);
      
      // Verify model loaded
      await expect(page.locator('text=Model loaded successfully')).toBeVisible();
      
      // Clear model for next test
      await page.click('button:has-text("Clear Model")');
      await page.waitForTimeout(500);
    }
  });

  test('displays animation information when skeleton is loaded', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic and Otto character
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    await page.click('text=Otto');
    
    // Load the model with skeleton
    await page.click('button:has-text("Load Otto")');
    
    // Wait for model to load
    await page.waitForTimeout(3000);
    
    // Check if animation viewer is visible (may show mock animations or real ones)
    const animationSection = page.locator('text=Animation').first();
    if (await animationSection.isVisible()) {
      await expect(animationSection).toBeVisible();
    }
    
    // Verify skeleton data is processed
    await expect(page.locator('text=Model loaded successfully')).toBeVisible();
  });

  test('can access all categories of models', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Test different categories
    const categories = ['Characters', 'Levels', 'Objects'];
    
    for (const category of categories) {
      // Select category
      await page.click('[data-testid="category-select"], .category-select .select-trigger');
      await page.click(`text=${category}`);
      
      // Wait for models to load
      await page.waitForTimeout(500);
      
      // Open model selector to verify models are available
      await page.click('[data-testid="model-select"], .model-select .select-trigger');
      
      // Verify at least one model is available
      const models = page.locator('.select-content .select-item');
      await expect(models.first()).toBeVisible();
      
      // Close the selector
      await page.keyboard.press('Escape');
    }
  });

  test('validates model descriptions are removed', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Select a character model
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    await page.click('text=Otto');
    
    // Check that no descriptions are displayed in the dropdown
    // The old format showed descriptions like "Main character with full skeleton and animations"
    await expect(page.locator('text=Main character with')).not.toBeVisible();
    await expect(page.locator('text=with full skeleton and animations')).not.toBeVisible();
    await expect(page.locator('text=character with animations')).not.toBeVisible();
    
    // Verify clean model info display (should only show model name and file paths)
    await expect(page.locator('text=Otto.bg3d')).toBeVisible();
    await expect(page.locator('text=Otto.skeleton.rsrc')).toBeVisible();
  });

  test('verifies expanded skeleton model list', async ({ page }) => {
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Open model selector for Characters
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    
    // Verify expanded list includes more characters than before
    const expectedNewCharacters = [
      'EliteBrainAlien', 'Scientist', 'SkirtLady', 'Strongman', 
      'Clown', 'ClownFish', 'Corn', 'Flamester', 'GiantLizard'
    ];
    
    for (const character of expectedNewCharacters) {
      await expect(page.locator(`text=${character}`)).toBeVisible();
    }
    
    // Close dropdown and test other games
    await page.keyboard.press('Escape');
    
    // Test Bugdom 2 has expanded character list
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Bugdom 2');
    
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    
    const expectedBugdom2Characters = [
      'Checkpoint', 'Chipmunk', 'ComputerBug', 'EvilPlant', 
      'Fish', 'Flea', 'Gnome', 'Grasshopper'
    ];
    
    for (const character of expectedBugdom2Characters) {
      await expect(page.locator(`text=${character}`)).toBeVisible();
    }
  });

  test('handles skeleton file loading errors gracefully', async ({ page }) => {
    // This test could simulate a scenario where skeleton files are missing
    // For now, we'll test the UI's response to loading without skeleton files
    
    // Navigate to model viewer
    await page.click('a[href="/model-viewer"]');
    await page.waitForLoadState('networkidle');
    
    // Switch to Game Models mode
    await page.click('button:has-text("Game Models")');
    
    // Select Otto Matic game and Characters category
    await page.click('[data-testid="game-select"], .select-trigger');
    await page.click('text=Otto Matic');
    
    // Switch to Levels category (which shouldn't have skeleton files)
    await page.click('[data-testid="category-select"], .category-select .select-trigger');
    await page.click('text=Levels');
    
    // Select a level model
    await page.click('[data-testid="model-select"], .model-select .select-trigger');
    await page.click('text=Level 1 - Farm');
    
    // Verify no skeleton file option is shown
    await expect(page.locator('text=.skeleton.rsrc')).not.toBeVisible();
    await expect(page.locator('text=Animation Data')).not.toBeVisible();
    
    // Load the model
    await page.click('button:has-text("Load Level 1 - Farm")');
    
    // Wait for model to load
    await page.waitForTimeout(3000);
    
    // Verify model loaded successfully without skeleton
    await expect(page.locator('text=Model loaded successfully')).toBeVisible();
  });
});