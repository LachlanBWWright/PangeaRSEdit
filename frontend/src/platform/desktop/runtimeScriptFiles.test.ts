// @vitest-environment node
import "../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { buildScriptPackageFiles, createScriptWorkspaceContext, loadScriptSample } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { buildScriptPackageManifest, SCRIPT_PACKAGE_MANIFEST_PATH } from "@/editor/subviews/scripts/scriptPackageValidator";
import { buildPackArchive, readPackArchive } from "../../../../desktop/src/packArchive";
import { runtimeScriptFiles } from "./runtimeScriptFiles";
import { workflowProject } from "./workflowFixtures.stories.support";

describe("runtime-only script pack files", () => {
  it("removes source, LuaLS and editor metadata while retaining executable modules, config and package integrity", async () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const built = await buildScriptPackageFiles(workspace);
    if (built.isErr()) { expect.fail(built.error); return; }
    const files = built.value.map((file) => ({ path: file.path, bytes: Uint8Array.from(file.bytes) }));
    expect(files.some((file) => file.path.startsWith("Data/Scripts/src/"))).toBe(true);
    const result = runtimeScriptFiles([...files, { path: "Data/Terrain/EarthFarm.ter.rsrc", bytes: new Uint8Array([1]) }]);
    if (result.isErr()) { expect.fail(result.error); return; }
    expect(result.value.some((file) => /^(README|\.luarc)|Data\/Scripts\/(src|types|docs|examples)\//.test(file.path))).toBe(false);
    expect(result.value.some((file) => file.path === "Data/Scripts/dist/main.lua")).toBe(true);
    expect(result.value.some((file) => file.path.startsWith("Data/Scripts/config/placements/"))).toBe(true);
    const metadata = result.value.find((file) => file.path === "Data/Scripts/config/project.json");
    expect(metadata && new TextDecoder().decode(metadata.bytes)).not.toContain('"editor"');
    const scripts = Object.fromEntries(result.value.filter((file) => file.path.startsWith("Data/Scripts/")).map((file) => [file.path, file.bytes]));
    const manifest = result.value.find((file) => file.path === SCRIPT_PACKAGE_MANIFEST_PATH);
    expect(manifest && new TextDecoder().decode(manifest.bytes)).toBe(JSON.stringify(buildScriptPackageManifest(scripts)));
    const pack = buildPackArchive(workflowProject, [], [{ id: "farm", name: "Farm", args: ["--level", "0"], files: result.value }], false);
    if (pack.isErr()) { expect.fail(pack.error.message); return; }
    const opened = readPackArchive(pack.value);
    expect(opened.isOk()).toBe(true);
    if (opened.isErr()) return;
    expect(Object.keys(opened.value.entries).some((path) => path.startsWith("Project/") || /\/Scripts\/(src|types|docs|examples)\//.test(path))).toBe(false);
    expect(opened.value.entries["Runtime/farm/Data/Scripts/dist/main.lua"]).toBeDefined();
  });
});
