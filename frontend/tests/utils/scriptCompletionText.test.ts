import { describe, expect, it } from "vitest";
import {
  buildNativeIdSnippet,
  getContextualApiName,
  nativeIdInsertText,
} from "@/editor/subviews/scripts/scriptCompletionText";

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
});
