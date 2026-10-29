// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, test, vi } from "vitest";
import { buildPackageAcceptanceFixture, packageAcceptanceTargets } from "../fixtures/packageCustomObjectAcceptance";

vi.mock("../../src/editor/subviews/scripts/scriptLuaValidation", async () => {
  const engine = await import("../../src/editor/subviews/scripts/scriptLuaValidationEngine");
  return { validateLuaWorkspace: engine.validateLuaWorkspaceEngine };
});

test.each(packageAcceptanceTargets)("$name preserves real custom assets, behavior, parameters and placement through export/reimport", async (target) => {
  const model = Array.from(await readFile(`public/${target.model}`));
  const skeleton = target.skeleton ? Array.from(await readFile(`public/${target.skeleton}`)) : undefined;
  const fixture = await buildPackageAcceptanceFixture(target, model, skeleton);
  expect(fixture.isErr() ? fixture.error : null).toBeNull();
  if (fixture.isErr()) return;
  const { workspace, restored, files } = fixture.value;
  expect(restored.customObjects).toEqual(workspace.customObjects);
  expect(restored.levels).toEqual(workspace.levels);
  for (const source of Object.values(workspace.sourceFiles)) {
    expect(restored.sourceFiles[source.path]?.content).toBe(source.content);
  }
  for (const asset of Object.values(workspace.assets)) {
    expect(restored.assets[asset.path]?.bytes).toEqual(asset.bytes);
    expect(files.find((file) => file.path === asset.path)?.bytes).toEqual(Array.from(asset.bytes));
  }
  const dispatcher = files.find((file) => file.path === "Data/Scripts/dist/main.lua");
  expect(dispatcher).toBeDefined();
  expect(dispatcher && new TextDecoder().decode(new Uint8Array(dispatcher.bytes))).toContain('"custom.round-trip-sentinel"');
  const config = files.find((file) => file.path === "Data/Scripts/config/levels.json");
  expect(config).toBeDefined();
  expect(config && new TextDecoder().decode(new Uint8Array(config.bytes))).toContain("sentinel");
});
