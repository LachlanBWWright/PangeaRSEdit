import { describe, expect, it } from "vitest";
import {
  buildNativeIdSnippet,
  getContextualApiName,
} from "@/editor/subviews/scripts/scriptCompletionText";

describe("script completion text", () => {
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
      "${1|ottomatic.human,ottomatic.powerupPod,ottomatic.checkpoint,ottomatic.teleporter|}",
    );
  });
});
