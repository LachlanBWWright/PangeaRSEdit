import type { Page } from "@playwright/test";

export interface RuntimePackageFile { path: string; bytes: number[] }

export async function launchOttoPackage(page: Page, files: readonly RuntimePackageFile[]) {
  await launchGamePackage(page, "ottomatic/OttoMatic.html?level=0", files);
}

export async function launchGamePackage(page: Page, launch: string, files: readonly RuntimePackageFile[], start?: string) {
  await page.route("**/generated/pangea-ports/wasm/**/*.js*", async (route) => {
    const response = await route.fetch();
    const loader = await response.text();
    const preload = `window.Module.preRun = [...(window.Module.preRun || []), function () {
      const runtime = window.Module;
      const initialized = runtime.onRuntimeInitialized;
      runtime.onRuntimeInitialized = function () {
        for (const file of ${JSON.stringify(files)}) {
          const parts = file.path.split('/');
          for (let depth = 1; depth < parts.length; depth++) {
            const directory = '/' + parts.slice(0, depth).join('/');
            if (!runtime.FS.analyzePath(directory).exists) runtime.FS.mkdir(directory);
          }
          runtime.FS.writeFile(file.path, new Uint8Array(file.bytes));
        }
        initialized?.();
      };
    }];\n`;
    await route.fulfill({ response, body: preload + loader });
  });
  await page.goto(`generated/pangea-ports/wasm/${launch}`);
  if (start) {
    await page.waitForFunction(() => window.Module?.calledRun === true, null, { timeout: 60_000 });
    await page.locator(start).click();
  }
}
