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
    expect(apis.some((api) => api.name === "pangea.object.setCollisionEnabled")).toBe(false);
    expect(apis.some((api) => api.name === "pangea.player.setHealth")).toBe(true);
  });
});
