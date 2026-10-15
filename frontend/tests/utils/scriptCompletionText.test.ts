import { describe, expect, it } from "vitest";
import {
  buildApiCompletionInsertText,
  buildApiSignature,
  buildNativeIdSnippet,
  getContextualApiName,
  nativeIdInsertText,
} from "@/editor/subviews/scripts/scriptCompletionText";
import { SCRIPTING_CONTRACT } from "@/editor/subviews/scripts/scriptContract";
import { getAvailableApiFunctions } from "@/editor/subviews/scripts/scriptApiAvailability";
import { AUTHORITATIVE_API_SCHEMA } from "@/editor/subviews/scripts/scriptApiSchema";

describe("script completion text", () => {
  it("inserts numeric IDs as numbers and aliases as escaped strings", () => {
    expect(nativeIdInsertText("6")).toBe("6");
    expect(nativeIdInsertText('game."item')).toBe('"game.\\"item"');
  });
  it("does not duplicate the pangea namespace", () => {
    expect(getContextualApiName("pangea.", "pangea.spawn.native")).toBe(
      "spawn.native",
    );
    expect(
      getContextualApiName("pangea.spawn.", "pangea.spawn.native"),
    ).toBe("native");
    expect(getContextualApiName("", "pangea.spawn.native")).toBe(
      "pangea.spawn.native",
    );
    expect(getContextualApiName("pangea.world.ray", "pangea.world.raycast")).toBe("raycast");
    expect(getContextualApiName("pangea.wor", "pangea.world.raycast")).toBe("world.raycast");
  });

  it("offers the supported native IDs as a snippet choice", () => {
    expect(
      buildNativeIdSnippet([
        "ottomatic.human",
        "ottomatic.powerupPod",
        "ottomatic.checkpoint",
        "ottomatic.teleporter",
      ]),
    ).toBe(
      '${1|"ottomatic.human","ottomatic.powerupPod","ottomatic.checkpoint","ottomatic.teleporter"|}',
    );
  });
  it("renders API completion signatures from the validated contract", () => {
    const api = SCRIPTING_CONTRACT.api.apis.find(
      (candidate) => candidate.name === "pangea.object.setActive",
    );
    expect(api).toBeDefined();
    if (!api) return;
    expect(buildApiCompletionInsertText(api, (name) => name)).toBe(
      "pangea.object.setActive(${1:handle}, ${2:active})",
    );
  });

  it("renders readable parameter and return types for signature help", () => {
    const api = SCRIPTING_CONTRACT.api.apis.find(
      (candidate) => candidate.name === "pangea.object.setPosition",
    );
    expect(api).toBeDefined();
    if (!api) return;
    expect(buildApiSignature(api)).toBe(
      "pangea.object.setPosition(handle: ObjectHandle, position: Vector3): boolean",
    );
  });

  it("omits unsupported APIs from game-specific completion", () => {
    const apis = getAvailableApiFunctions(
      "MightyMike-Android",
      AUTHORITATIVE_API_SCHEMA.apis,
    );
    expect(apis.some((api) => api.name === "pangea.player.setForm")).toBe(false);
    expect(apis.some((api) => api.name === "pangea.player.setHealth")).toBe(true);
  });

  it("offers gameplay APIs with structured signatures within their namespace", () => {
    const apis = getAvailableApiFunctions("MightyMike-Android", AUTHORITATIVE_API_SCHEMA.apis);
    const sweep = apis.find((api) => api.name === "pangea.world.sweepBox");
    const state = apis.find((api) => api.name === "pangea.player.setState");
    expect(sweep).toBeDefined();
    expect(state).toBeDefined();
    if (!sweep || !state) return;
    expect(buildApiSignature(sweep)).toBe("pangea.world.sweepBox(bounds: WorldBounds, delta: Vector3, category: string, ignore: ObjectHandle?): CollisionHit|nil");
    expect(buildApiSignature(state)).toBe("pangea.player.setState(playerNum: number, key: string, value: number|boolean): CommandResult");
    expect(buildApiCompletionInsertText(sweep, (name) => getContextualApiName("pangea.world.", name))).toBe("sweepBox(${1:bounds}, ${2:delta}, ${3:category}, ${4:ignore})");
  });

  it("offers native player operations with typed options and live relationship results", () => {
    const apis = getAvailableApiFunctions("Nanosaur2-Android", AUTHORITATIVE_API_SCHEMA.apis);
    const fire = apis.find((api) => api.name === "pangea.player.fire");
    const deliver = apis.find((api) => api.name === "pangea.player.deliver");
    const relations = apis.find((api) => api.name === "pangea.player.relations");
    expect(fire).toBeDefined();
    expect(deliver).toBeDefined();
    expect(relations).toBeDefined();
    if (!fire || !deliver || !relations) return;
    expect(buildApiSignature(fire)).toBe("pangea.player.fire(playerNum: number, options: PlayerOperationOptions?): GameplayOperationResult");
    expect(buildApiSignature(deliver)).toBe("pangea.player.deliver(playerNum: number, target: ObjectHandle?): GameplayOperationResult");
    expect(buildApiSignature(relations)).toBe("pangea.player.relations(playerNum: number): PlayerRelations|nil");
    expect(buildApiCompletionInsertText(fire, (name) => getContextualApiName("pangea.player.", name))).toBe("fire(${1:playerNum}, ${2:options})");
  });
});
