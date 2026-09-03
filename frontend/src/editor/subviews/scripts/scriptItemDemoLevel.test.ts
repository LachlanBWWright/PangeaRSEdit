import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { createScriptItemDemoWorkspace } from "./scriptItemDemoLevel";
import { validateScriptWorkspaceAssetsAsync } from "./scriptAssetValidation";
import { createBlankLevel } from "@/data/levelTemplates/blankLevelGenerator";

const DEMO_GAMES: readonly GlobalsInterface[] = [
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  NanosaurGlobals,
  Nanosaur2Globals,
  CroMagGlobals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
];

describe("script item demo workspace", () => {
  it("creates a scripted custom model item for every supported game", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const assetPath = new URL(input, "http://localhost").pathname;
        const bytes = new Uint8Array(await readFile(`public${assetPath}`));
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        });
      }),
    );

    for (const globals of DEMO_GAMES) {
      const result = await createScriptItemDemoWorkspace(globals);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) continue;

      const definition = result.value.customObjects.find(
        (candidate) => candidate.id === "demo.script-item",
      );
      expect(definition?.visual.kind).toBe("customDisplayGroup");
      expect(
        result.value.levels[result.value.context.levelKey]?.customPlacements.some(
          (placement) => placement.objectId === "demo.script-item",
        ),
      ).toBe(true);
      const placements =
        result.value.levels[result.value.context.levelKey]?.customPlacements ?? [];
      expect(placements).toHaveLength(2);
      expect(placements.map((placement) => placement.position.x)).toEqual(
        expect.arrayContaining([-160, 160]),
      );
      const demoSource = result.value.sourceFiles[
        "Data/Scripts/src/objects/demo-script-item.lua"
      ];
      expect(demoSource?.content).toContain("math.sin");
      expect(demoSource?.content).toContain("setPositionOffset");
      expect(Object.keys(result.value.assets)).toHaveLength(1);
      const validation = await validateScriptWorkspaceAssetsAsync(
        result.value,
      );
      expect(validation.isOk()).toBe(true);
    }

    vi.unstubAllGlobals();
  });

  it("returns a typed error when the custom model cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    const result = await createScriptItemDemoWorkspace(OttoGlobals);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("Could not load script item demo asset");
    }

    vi.unstubAllGlobals();
  });

  it("adds the game-required player start record to demo level data", () => {
    const result = createBlankLevel(OttoGlobals.GAME_TYPE, {
      width: 64,
      height: 64,
      includePlayerStart: true,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.headerData?.Hedr[1000].obj.numItems).toBe(1);
      expect(result.value.itemData?.Itms[1000].obj).toEqual([
        { x: 0, z: 0, type: 0, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
      ]);
    }
  });
});
