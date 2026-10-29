import { describe, expect, it } from "vitest";
import { OttoGlobals, Game } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { createObjectDefinition } from "./scriptObjectActions";
import { getCollisionPreviewBounds } from "./scriptCollisionPreview";
import { getNativeModelGuidance, isScriptGlobalModelFile } from "./scriptNativeModelGuidance";
import { Group } from "three";
import { createNativeDefinitionScene } from "./scriptNativeModelScene";

const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null)), "Collision probe", "blank");
const base = created.isOk() ? created.value.state.customObjects[0] : undefined;

describe("native collision inspection", () => {
  it.each([
    ["OttoMatic-Android", 0, 100, 42],
    ["Bugdom-android", 0, 100, 42],
    ["Nanosaur-android", 0, 100, 42],
    ["CroMagRally-Android", 2, 102, 44],
    ["Bugdom2-Android", 0.1, 101, 43],
    ["Nanosaur2-Android", 0.1, 101, 43],
    ["BillyFrontier-Android", 0.1, 101, 43],
    ["MightyMike-Android", 2, 102, 0],
  ])("matches explicit native extents in %s", (gameId, width, height, depth) => {
    expect(base).toBeDefined();
    if (!base) return;
    const definition = { ...base, collision: { kind: "preset", preset: "solidBox", bounds: { width: 0.1, height: 101, depth: 43 } } } satisfies Parameters<typeof getCollisionPreviewBounds>[0];
    expect(getCollisionPreviewBounds(definition, gameId)).toEqual({ width, height, depth, planar: gameId === "MightyMike-Android" });
  });

  it("does not invent dimensions when the native engine derives them", () => {
    if (!base) return;
    expect(getCollisionPreviewBounds({ ...base, collision: { kind: "preset", preset: "solidBox" } }, "OttoMatic-Android")).toBeNull();
  });

  it("uses the same centered, rounded dimensions for desktop project assets", () => {
    if (!base) return;
    const definition = { ...base, collision: { kind: "preset", preset: "solidBox", bounds: { width: 161, height: 101, depth: 43 } } } satisfies Parameters<typeof getCollisionPreviewBounds>[0];
    expect(getCollisionPreviewBounds(definition, "OttoMatic")).toEqual(getCollisionPreviewBounds(definition, "OttoMatic-Android"));
    expect(getCollisionPreviewBounds(definition, "OttoMatic")).toMatchObject({ width: 160, height: 100, depth: 42 });
    expect(getCollisionPreviewBounds({ ...definition, visual: { kind: "nativeActor", spawnId: "enemy", scale: 1 } }, "OttoMatic")).toBeNull();
  });

  it("previews only the native model instead of a composed terrain actor", () => {
    const actor = new Group();
    const raw = new Group();
    const rawGeometry = new Group();
    rawGeometry.position.y = -15;
    raw.add(rawGeometry);
    raw.position.y = 250;
    raw.scale.setScalar(3);
    actor.add(raw, new Group());
    const preview = createNativeDefinitionScene(actor);
    expect(preview.children).toHaveLength(1);
    expect(preview.children[0]?.position.y).toBe(0);
    expect(preview.children[0]?.scale.x).toBe(1);
    expect(preview.children[0]?.children[0]?.position.y).toBe(-15);
    expect(raw.position.y).toBe(250);
  });

  it("keeps Bugdom's second global bank out of the first bank picker", () => {
    expect(isScriptGlobalModelFile(Game.BUGDOM, "global1.3dmf")).toBe(true);
    expect(isScriptGlobalModelFile(Game.BUGDOM, "global2.3dmf")).toBe(false);
    expect(isScriptGlobalModelFile(Game.NANOSAUR, "Global_Models.3dmf")).toBe(true);
  });

  it("prompts for a target level and checks actual skeleton load lists", () => {
    if (!base) return;
    expect(getNativeModelGuidance(Game.OTTO_MATIC, { ...base, visual: { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 0, scale: 1, slot: 450 } }, null)).toMatch(/Select a target gameplay level/);
    expect(getNativeModelGuidance(Game.OTTO_MATIC, { ...base, visual: { kind: "nativeSkeleton", skeletonType: 0, scale: 1, slot: 450, initialAnimation: 0, animationSpeed: 1 } }, 0)).toMatch(/Otto/);
  });
});
