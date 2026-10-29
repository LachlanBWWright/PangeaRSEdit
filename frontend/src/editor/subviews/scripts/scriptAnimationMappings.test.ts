import { describe, expect, it } from "vitest";
import { animationClipIndex, animationClipLabel, createObjectAnimationBindings, reconcileAnimationMappings } from "./scriptAnimationMappings";

describe("animation mappings on reimport", () => {
  it("preserves named actions when clip ordering changes", () => {
    const result = reconcileAnimationMappings({ idle: 0, attack: 1, bite: 1 }, [{ name: "Rest", index: 0 }, { name: "Snap", index: 1 }], [{ name: "Snap", index: 0 }, { name: "Rest", index: 1 }]);
    expect(result.match((value) => value, (issues) => issues)).toEqual({ idle: 1, attack: 0, bite: 0 });
  });

  it("reports removed clips instead of silently assigning a different animation", () => {
    const result = reconcileAnimationMappings({ attack: 1 }, [{ name: "Rest", index: 0 }, { name: "Snap", index: 1 }], [{ name: "Rest", index: 0 }]);
    expect(result.match((value) => value, (issues) => issues)).toEqual([{ action: "attack", clip: "Snap", reason: "missing" }]);
  });

  it("rejects ambiguous names and unknown previous indices", () => {
    const result = reconcileAnimationMappings({ walk: 0, jump: 5 }, [{ name: "Move", index: 0 }], [{ name: "Move", index: 0 }, { name: "Move", index: 1 }]);
    expect(result.match((value) => value, (issues) => issues)).toEqual([{ action: "walk", clip: "Move", reason: "ambiguous" }, { action: "jump", clip: "5", reason: "unknownPreviousClip" }]);
  });

  it("only accepts a clip present in the imported asset", () => {
    expect(animationClipIndex("2", [{ name: "Jump", index: 2 }])).toBe(2);
    expect(animationClipIndex("4", [{ name: "Jump", index: 2 }])).toBeUndefined();
    expect(animationClipIndex("invalid", [{ name: "Jump", index: 2 }])).toBeUndefined();
    expect(animationClipIndex("", [{ name: "Idle", index: 0 }])).toBeUndefined();
  });

  it("cannot infer identity from duplicate or unnamed source clips", () => {
    const duplicate = reconcileAnimationMappings({ walk: 0 }, [{ name: "Move", index: 0 }, { name: "Move", index: 1 }], [{ name: "Move", index: 0 }]);
    const unnamed = reconcileAnimationMappings({ walk: 0 }, [{ name: "", index: 0 }], [{ name: "", index: 0 }]);
    expect(duplicate.isErr()).toBe(true);
    expect(unnamed.isErr()).toBe(true);
  });

  it("labels unnamed native clips without claiming a behavior", () => {
    expect(animationClipLabel({ name: "", index: 2 })).toBe("Unnamed clip 3");
    expect(animationClipLabel({ name: "Leap", index: 2, duration: 0.75 })).toBe("Leap (0.75 s)");
  });

  it("creates persistent names only for unambiguous imported clips", () => {
    expect(createObjectAnimationBindings({ idle: 0, walk: 1, missing: 3, attack: 4 }, [{ name: "Rest", index: 0 }, { name: "Move", index: 1 }, { name: "Move", index: 2 }, { name: "", index: 4 }])).toEqual({ idle: "Rest" });
  });
});
