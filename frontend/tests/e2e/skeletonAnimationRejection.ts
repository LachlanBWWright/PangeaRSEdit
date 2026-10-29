import { expect, type Page } from "@playwright/test";

export async function expectSkeletonAnimationRejection(page: Page, levelNum: number): Promise<void> {
  const results = await page.evaluate((level) => {
    const runtime = window.Module;
    if (!runtime?.FS?.readFile || !runtime.FS.writeFile || !runtime.ccall) return null;
    const path = "Data/Scripts/config/levels.json";
    const original = new TextDecoder().decode(runtime.FS.readFile(path));
    const invalid = original.replace('"idle":0', '"idle":999');
    if (invalid === original) return null;
    runtime.FS.writeFile(path, new TextEncoder().encode(invalid));
    const invalidConfig = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
    const rejected = runtime.ccall("PangeaScript_ProbeScriptedObjectJS", "number",
      ["string", "number", "number", "number"], ["browser-custom-object", 0, 0, 0]);
    runtime.FS.writeFile(path, new TextEncoder().encode(original));
    const restoredConfig = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
    const recovered = runtime.ccall("PangeaScript_ProbeScriptedObjectJS", "number",
      ["string", "number", "number", "number"], ["browser-custom-object", 0, 0, 0]);
    return { invalidConfig, rejected, restoredConfig, recovered };
  }, levelNum);
  expect(results).toEqual({ invalidConfig: 0, rejected: 4, restoredConfig: 0, recovered: 0 });
}
