import { describe, expect, it } from "vitest";
import {
  buildScriptPeerManifest,
  compareScriptPeerManifests,
} from "./scriptPackageValidator";

function packageFiles(): Record<string, Uint8Array> {
  return {
    "Data/Scripts/config/project.json": new TextEncoder().encode("project"),
    "Data/Scripts/dist/main.lua": new TextEncoder().encode("return {}"),
  };
}

describe("script peer manifests", () => {
  it("accepts identical package identity metadata", () => {
    const local = buildScriptPeerManifest(packageFiles(), "Bugdom2-Android");
    const remote = structuredClone(local);

    expect(compareScriptPeerManifests(local, remote)).toEqual({
      value: true,
    });
  });

  it("rejects invalid peer metadata before runtime agreement", () => {
    const local = buildScriptPeerManifest(packageFiles(), "Bugdom2-Android");

    expect(compareScriptPeerManifests(local, { gameId: "Bugdom2-Android" })).toEqual({
      error: "Peer scripting manifest is invalid",
    });
  });

  it("rejects content mismatches even when the game matches", () => {
    const local = buildScriptPeerManifest(packageFiles(), "Bugdom2-Android");
    const remote = structuredClone(local);
    remote.manifest.contentHash = "00000000";

    const result = compareScriptPeerManifests(local, remote);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBe("Peer scripting manifest mismatch: contentHash");
  });
});
