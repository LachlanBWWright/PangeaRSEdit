import { describe, expect, it } from "vitest";
import { AnimationClip, Group, NumberKeyframeTrack } from "three";
import type { AnimationInfo } from "@/components/AnimationViewer";
import {
  collectBoneRows,
  getEffectiveModelBaseName,
  getModelSourceKind,
  removeAnimationBone,
  renameAnimationBone,
  renameModelNodeBone,
} from "./modelViewerState";

function animationWithTracks(): AnimationInfo {
  return {
    name: "walk",
    duration: 1,
    index: 0,
    clip: new AnimationClip("walk", 1, [
      new NumberKeyframeTrack("Old.position", [0], [1]),
      new NumberKeyframeTrack("Other.position", [0], [1]),
    ]),
  };
}

describe("ModelViewer state helpers", () => {
  it("detects supported model source kinds case-insensitively", () => {
    expect(getModelSourceKind("MODEL.BG3D")).toBe("bg3d");
    expect(getModelSourceKind("model.3dmf")).toBe("3dmf");
    expect(getModelSourceKind("model.glb")).toBe("glb");
    expect(getModelSourceKind("model.obj")).toBe("unknown");
  });

  it("normalizes blank model names", () => {
    expect(getEffectiveModelBaseName("  dragon  ")).toBe("dragon");
    expect(getEffectiveModelBaseName(" \t")).toBe("model");
  });

  it("renames matching animation tracks without changing unrelated tracks", () => {
    const renamed = renameAnimationBone(animationWithTracks(), "Old", "New");
    expect(renamed.clip.tracks.map((track) => track.name)).toEqual([
      "New.position",
      "Other.position",
    ]);
  });

  it("removes only tracks belonging to a deleted bone", () => {
    const remaining = removeAnimationBone(animationWithTracks(), "Old");
    expect(remaining.clip.tracks.map((track) => track.name)).toEqual([
      "Other.position",
    ]);
  });

  it("renames nested model hierarchy nodes", () => {
    const renamed = renameModelNodeBone(
      {
        name: "Root",
        type: "group",
        visible: true,
        children: [{ name: "Old", type: "node", visible: true }],
      },
      "Old",
      "New",
    );
    expect(renamed.children?.[0]?.name).toBe("New");
  });

  it("combines weighted and unweighted scene bones", () => {
    const scene = new Group();
    const weighted = [{ boneName: "Weighted", vertexCount: 2, weightedSum: 1 }];
    const rows = collectBoneRows(
      scene,
      null,
      () => weighted,
      () => [],
      () => ["Weighted", "Unweighted"],
    );
    expect(rows).toEqual([
      ...weighted,
      { boneName: "Unweighted", vertexCount: 0, weightedSum: 0 },
    ]);
  });
});
