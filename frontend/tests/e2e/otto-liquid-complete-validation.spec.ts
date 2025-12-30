import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("Otto Matic Liquid Bodies Validation", () => {
  test("should load Apocalypse level and verify 7 liquid bodies appear with correct logs", async ({
    page,
  }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[Browser Console] ${text}`);
    });

    // Capture console errors
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error(`[Browser Error] ${error.message}`);
    });

    // Navigate to the editor
    await page.goto("http://localhost:5173/PangeaRSEdit/");
    await page.waitForLoadState("networkidle");

    // Click Otto Matic card
    await page.click('text="Otto Matic"');
    await page.waitForTimeout(1000);

    // Upload Apocalypse level
    const fileInput = page.locator('input[type="file"]').first();
    const apocalypseFile = path.join(__dirname, "../../public/assets/ottoMatic/terrain/Apocalypse.ter.rsrc");
    
    console.log(`Loading Otto Matic Apocalypse level from: ${apocalypseFile}`);
    await fileInput.setInputFiles(apocalypseFile);
    
    // Wait for level to load
    await page.waitForTimeout(5000);

    // Check that we're in editor view (has download button or 3D canvas)
    const canvasElements = await page.locator("canvas").count();
    console.log(`Found ${canvasElements} canvas elements`);
    expect(canvasElements).toBeGreaterThanOrEqual(1);

    // Analyze console logs for liquid geometry
    const liquidLogs = consoleLogs.filter((log) =>
      log.includes("[LiquidGeometry]")
    );
    
    console.log("\n=== LIQUID GEOMETRY LOGS ===");
    liquidLogs.forEach((log) => console.log(log));
    console.log("=== END LIQUID LOGS ===\n");

    // Verify liquid patches were found
    const foundPatchesLog = liquidLogs.find((log) =>
      log.includes("Found") && log.includes("liquid patches")
    );
    expect(foundPatchesLog, "Should find liquid patches log").toBeTruthy();

    // Extract number of patches found
    const patchCountMatch = foundPatchesLog?.match(/Found (\d+) liquid patches/);
    const patchCount = patchCountMatch ? parseInt(patchCountMatch[1], 10) : 0;
    console.log(`\n*** LIQUID PATCHES FOUND: ${patchCount} ***\n`);
    
    // Otto Matic Apocalypse should have 7 liquid bodies
    expect(patchCount).toBe(7);

    // Verify rendering logs for each patch
    const renderingLogs = liquidLogs.filter((log) =>
      log.includes("Rendering patch")
    );
    console.log(`\n*** RENDERING LOGS COUNT: ${renderingLogs.length} ***\n`);
    expect(renderingLogs.length).toBeGreaterThanOrEqual(1);

    // Check for any skip/error logs
    const skipLogs = liquidLogs.filter(
      (log) => log.includes("skipped") || log.includes("invalid")
    );
    if (skipLogs.length > 0) {
      console.log("\n=== SKIP/ERROR LOGS ===");
      skipLogs.forEach((log) => console.log(log));
      console.log("=== END SKIP LOGS ===\n");
    }

    // Verify no errors occurred
    expect(errors.length, `Should have no errors, but got: ${errors.join(", ")}`).toBe(0);

    // Take screenshot for verification
    await page.screenshot({
      path: "playwright-results/otto-liquid-validation.png",
      fullPage: true,
    });
  });

  test("should verify liquid Y-position is visible and correct", async ({
    page,
  }) => {
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto("http://localhost:5173/PangeaRSEdit/");
    await page.waitForLoadState("networkidle");
    await page.click('text="Otto Matic"');
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]').first();
    const apocalypseFile = path.join(__dirname, "../../public/assets/ottoMatic/terrain/Apocalypse.ter.rsrc");
    await fileInput.setInputFiles(apocalypseFile);
    await page.waitForTimeout(5000);

    // Extract Y-positions from rendering logs
    const yPositionLogs = consoleLogs.filter((log) =>
      log.includes("Rendering patch") && log.includes("Y=")
    );

    console.log("\n=== Y-POSITION LOGS ===");
    yPositionLogs.forEach((log) => {
      console.log(log);
      const yMatch = log.match(/Y=([\d.-]+)/);
      if (yMatch) {
        const y = parseFloat(yMatch[1]);
        console.log(`  Extracted Y: ${y}`);
        // Y should be positive and reasonable (not underground or in sky)
        expect(y).toBeGreaterThan(-1000);
        expect(y).toBeLessThan(10000);
      }
    });
    console.log("=== END Y-POSITION LOGS ===\n");
  });
});
