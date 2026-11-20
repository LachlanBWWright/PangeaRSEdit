import { describe, expect, it } from "vitest";
import { strFromU8 } from "fflate";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { buildFullApiReference } from "./scriptFullApiReference";
import { buildScriptDocumentationFiles } from "./scriptDocumentation";
import { buildScriptIdeSupportFiles } from "./scriptIdePackage";
import { SCRIPT_GUIDES, portableScriptGuide } from "./scriptGuides";
import { scriptGuideBlocks, scriptGuideSections } from "./scriptGuideBlocks";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { MightyMikeGlobals, NanosaurGlobals } from "@/data/globals/globals";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";

describe("full Lua API documentation", () => {
  const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0));
  it("exports resource module types and the shared object-services guide", () => {
    const declarations = buildScriptTypeDeclarationFiles(state);
    const runtime = declarations.find((file) => file.path.endsWith("pangea-runtime.lua"))?.content;
    expect(runtime).toContain("---@class PangeaResourcesApi");
    expect(runtime).toContain("---@field resources PangeaResourcesApi");
    expect(runtime).toContain("---@field object ObjectHandle|nil");
    expect(runtime).toContain("---@class ControlLeaseResult : ObjectCommandResult");
    expect(runtime).toContain("---@field spatial PangeaSpatialApi");
    expect(runtime).toContain("---@field combat PangeaCombatApi");
    expect(runtime).toContain("---@class GroundPlacementOptions");
    expect(runtime).toContain("---@class CombatAttribution");
    expect(runtime).toContain("---@field attackKind AttackKind");
    expect(runtime).toContain("attribution: CombatAttribution|nil");
    expect(runtime).toContain("---@field off fun(self:ResourceGroup, subscription:integer):boolean");
    expect(runtime).toContain("---@alias CrossingShape SphereCrossing|BoxCrossing|CheckpointCrossing");
    expect(runtime).toContain("---@field list fun(options: PlayerListOptions|nil): PangeaPlayerSnapshot[]");
    expect(declarations.find((file) => file.path === "Data/Scripts/types/pangea/resources.lua")?.content).toContain("---@type PangeaResourcesApi");
    expect(SCRIPT_GUIDES.find((guide) => guide.file === "object-services.md")?.content).toContain("keepOnOwnerDestroy");
  });
  it("covers every contract function, hook and object method with inherited types", () => {
    const reference = buildFullApiReference(state);
    for (const api of AUTHORITATIVE_API_SCHEMA.apis) expect(reference).toContain(`### ${api.name}\n`);
    for (const hook of AUTHORITATIVE_API_SCHEMA.hooks) expect(reference).toContain(`### ${hook.name}\n`);
    for (const event of SCRIPTING_CONTRACT.objectEvents) expect(reference).toContain(`### ${event.handler}\n`);
    expect(reference).toContain("gameId string");
    expect(reference).toContain("applyDamage boolean|nil");
    expect(reference).toContain("ctx: AnimationMarkerObjectFrameContext");
    expect(reference).toContain("Selected game: not advertised.");
  });

  it("exports every guide and complete reference in IDE packages with portable links", () => {
    const files = buildScriptIdeSupportFiles(state);
    for (const guide of SCRIPT_GUIDES) expect(files.some((file) => file.path === `Data/Scripts/docs/${guide.file}`)).toBe(true);
    const reference = files.find((file) => file.path === "Data/Scripts/docs/API.md");
    expect(reference && strFromU8(reference.bytes)).toContain("pangea.object.setPositionResult");
    expect(buildScriptDocumentationFiles(state)).toHaveLength(SCRIPT_GUIDES.length + 1);
    expect(portableScriptGuide("[Runtime](scripting-runtime.md#hooks) [Source](../src/file.c)")).toBe("[Runtime](scripting-runtime.md#hooks) Source (repository source: `../src/file.c`)");
  });

  it("renders prose, code and type unions without evaluating HTML", () => {
    const blocks = scriptGuideBlocks("## Results\n\nRead `ctx`.\n\n```lua\nreturn { handled = false }\n```\n\n| Type | Meaning |\n| --- | --- |\n| `Handle|nil` | Optional |\n");
    expect(blocks).toContainEqual({ kind: "code", language: "lua", text: "return { handled = false }" });
    expect(blocks).toContainEqual({ kind: "table", rows: [["Type", "Meaning"], ["`Handle|nil`", "Optional"]] });
    expect(scriptGuideSections("# Guide\n\nIntro\n\n## Runtime rules\n\nDetails").map((section) => section.anchor)).toEqual(["", "runtime-rules"]);
    expect(scriptGuideBlocks("<script>unsafe()</script>")).toEqual([{ kind: "paragraph", text: "<script>unsafe()</script>" }]);
  });

  it("uses the selected game's lifecycle in the IDE starter", () => {
    const area = ensureScriptWorkspace({}, createScriptWorkspaceContext(MightyMikeGlobals, 0));
    const example = buildScriptIdeSupportFiles(area).find((file) => file.path.endsWith("examples/hello.lua"));
    expect(example && strFromU8(example.bytes)).toContain("function entry.onAreaStart(ctx)");
  });
});
