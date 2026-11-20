import { describe, expect, it } from "vitest";
import { ENGINE_FUNCTIONS, engineDeclarations } from "./engineLanguage";

const bindings = import.meta.glob<string>("../../../games/pangea-ports/games/PangeaSandbox/Source/lua_*.{c,cpp}", { query: "?raw", import: "default", eager: true });

describe("engine Lua assistance", () => {
  it("documents every function installed by native engine modules", () => {
    const names = new Set(ENGINE_FUNCTIONS.map((entry) => entry.name));
    const installed = Object.values(bindings).flatMap((source) => Array.from(source.matchAll(/lua_pushcfunction\([^;]+\);\s*lua_setfield\(lua,-2,"([^"]+)"\)/g), (match) => match[1])).filter((name) => name !== "__gc");
    expect(installed.length).toBeGreaterThan(35);
    expect(installed.filter((name) => !name || !names.has(name))).toEqual([]);
    const declarations = engineDeclarations();
    for (const name of installed) expect(declarations).toContain(`---@field ${name} fun(`);
    expect(ENGINE_FUNCTIONS.length).toBe(names.size);
  });

  it("exports reconstruction contracts without replacing existing actor APIs", () => {
    const signatures = new Map(ENGINE_FUNCTIONS.map((entry) => [entry.name, entry.signature]));
    expect(signatures.get("material")).toBe("actor: ObjectHandle, config: EngineMaterial");
    expect(signatures.get("meshMaterial")).toBe("id: string, material: integer, settings: EngineMeshMaterial");
    expect(signatures.get("input")).toContain("player?: integer");
    const declarations = engineDeclarations();
    expect(declarations).toContain("---@field splits? integer[]");
    expect(declarations).toContain("---@field events? {time: number, type: integer, value: integer}[]");
    expect(declarations).toContain("---@field morph? boolean");
    expect(declarations).toContain("---@field groundUp? Vector3");
    expect(declarations).toContain("---@class EnginePresentationNode");
    expect(declarations).toContain("---@class EngineWorldResources");
  });
});
