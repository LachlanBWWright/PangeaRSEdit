// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.DOCS_BASE_URL || 'http://localhost:8765';

test.describe('Bugdom 2 GitHub Pages landing page', () => {

  test('has correct page title', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page).toHaveTitle('Bugdom 2 – WebAssembly');
  });

  test('renders header with game title', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const h1 = page.locator('header h1');
    await expect(h1).toContainText('Bugdom 2');
  });

  test('renders 10 level cards', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const cards = page.locator('.level-card');
    await expect(cards).toHaveCount(10);
  });

  test('level cards have correct level numbers and names', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const expectedLevels = [
      { n: 0, name: 'Gnome Garden' },
      { n: 1, name: 'Sidewalk' },
      { n: 2, name: 'Fido' },
      { n: 3, name: 'Plumbing' },
      { n: 4, name: 'Playroom' },
      { n: 5, name: 'Closet' },
      { n: 6, name: 'Gutter' },
      { n: 7, name: 'Garbage' },
      { n: 8, name: 'Balsa Plane' },
      { n: 9, name: 'Park' },
    ];
    const cards = page.locator('.level-card');
    for (let i = 0; i < expectedLevels.length; i++) {
      const card = cards.nth(i);
      await expect(card).toContainText(`Level ${expectedLevels[i].n}`);
      await expect(card).toContainText(expectedLevels[i].name);
    }
  });

  test('renders play overlay button', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const overlay = page.locator('#play-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Click to Play');
  });

  test('renders game iframe', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const iframe = page.locator('#game-iframe');
    await expect(iframe).toBeAttached();
    // Before clicking Play, iframe src should be empty
    await expect(iframe).toHaveAttribute('src', '');
  });

  test('clicking play button loads the game URL into iframe', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const overlay = page.locator('#play-overlay');
    await overlay.click();
    // Play overlay should be hidden after click
    await expect(page.locator('.game-loaded')).toBeVisible();
    const iframe = page.locator('#game-iframe');
    await expect(iframe).toHaveAttribute('src', 'Bugdom2.html');
  });

  test('clicking level card loads that level into iframe', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    // Click level 3 (Plumbing)
    const levelCard = page.locator('.level-card').nth(3);
    await levelCard.click();
    const iframe = page.locator('#game-iframe');
    await expect(iframe).toHaveAttribute('src', 'Bugdom2.html?level=3');
  });

  test('URL example code is populated', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const example = page.locator('#level-url-example');
    await expect(example).toContainText('?level=3');
  });

  test('JavaScript API section is present', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    // Check the cheat API section exists
    const apiSection = page.locator('h2', { hasText: 'JavaScript Cheat / Debug API' });
    await expect(apiSection).toBeVisible();
    // Check for fence collision mention
    await expect(page.locator('pre').first()).toContainText('setFenceCollisionEnabled');
  });

  test('Level File Override section is present', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const overrideSection = page.locator('h2', { hasText: 'Level File Override' });
    await expect(overrideSection).toBeVisible();
    await expect(page.locator('section').last().locator('pre')).toContainText('FS.writeFile');
  });

  test('footer contains copyright and GitHub link', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const footer = page.locator('footer');
    await expect(footer).toContainText('Pangea Software');
    const githubLink = footer.locator('a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
  });

  test('no JavaScript console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE_URL + '/');
    // Allow time for any deferred scripts
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('page is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL + '/');
    const h1 = page.locator('header h1');
    await expect(h1).toBeVisible();
    const overlay = page.locator('#play-overlay');
    await expect(overlay).toBeVisible();
  });

  test('Bugdom2.html game shell is accessible when present', async ({ request }) => {
    const resp = await request.get(BASE_URL + '/Bugdom2.html');
    if (resp.status() === 404) {
      // Game files are only available after CI build; skip gracefully
      test.skip(true, 'Bugdom2.html not yet deployed – skipping game-shell test');
    }
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    // The Emscripten shell HTML must declare a canvas element
    expect(body).toContain('<canvas');
  });

  test('Bugdom2.wasm is accessible when present', async ({ request }) => {
    const resp = await request.get(BASE_URL + '/Bugdom2.wasm');
    if (resp.status() === 404) {
      test.skip(true, 'Bugdom2.wasm not yet deployed – skipping WASM file test');
    }
    expect(resp.status()).toBe(200);
    // WASM files start with the magic bytes \0asm
    const buf = await resp.body();
    expect(buf[0]).toBe(0x00);
    expect(buf[1]).toBe(0x61); // 'a'
    expect(buf[2]).toBe(0x73); // 's'
    expect(buf[3]).toBe(0x6d); // 'm'
  });

  test('Bugdom2.js loader is accessible when present', async ({ request }) => {
    const resp = await request.get(BASE_URL + '/Bugdom2.js');
    if (resp.status() === 404) {
      test.skip(true, 'Bugdom2.js not yet deployed – skipping loader test');
    }
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    // Emscripten-generated loader should reference the WASM file
    expect(body).toContain('Bugdom2.wasm');
  });

});

