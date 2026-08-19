import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { AnimationClip, NumberKeyframeTrack } from "three";
import { useAnimationCrud } from "./useAnimationCrud";
import type { AnimationInfo } from "./types";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

type CrudParams = Parameters<typeof useAnimationCrud>[0];
type CrudHandlers = ReturnType<typeof useAnimationCrud>;

const defaultHandlers: CrudHandlers = {
  handleUpdateAnimation: () => undefined,
  handleCreateAnimation: () => undefined,
  handleLoopModeChange: () => undefined,
  handleApplyDuration: () => undefined,
  handleDeleteAnimation: () => undefined,
  handleAnimationSelectionChange: () => undefined,
  handleApplyEditorChanges: () => undefined,
};

function Harness({ params, handlersRef }: { params: CrudParams; handlersRef: { current: CrudHandlers } }) {
  const handlers = useAnimationCrud(params);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers, handlersRef]);
  return null;
}

function makeAnimation(name: string, duration = 2): AnimationInfo {
  return {
    name,
    duration,
    index: 0,
    clip: new AnimationClip(name, duration, [
      new NumberKeyframeTrack("Bone.position", [0, duration], [0, 1, 2, 3, 4, 5]),
    ]),
    loop: true,
  };
}

function createHarness(initial: AnimationInfo[], overrides: Partial<CrudParams> = {}) {
  let draftAnimations: AnimationInfo[] | null = initial;
  let selected: number | null = 0;
  let editName = "Edited";
  let editDurationInput = "2";
  const setDraftAnimations: CrudParams["setDraftAnimations"] = (next) => {
    draftAnimations = typeof next === "function" ? next(draftAnimations) : next;
  };
  const setSelectedAnimation: CrudParams["setSelectedAnimation"] = (next) => {
    selected = typeof next === "function" ? next(selected) : next;
  };
  const setEditName: CrudParams["setEditName"] = (next) => {
    editName = typeof next === "function" ? next(editName) : next;
  };
  const setEditDurationInput: CrudParams["setEditDurationInput"] = (next) => {
    editDurationInput = typeof next === "function" ? next(editDurationInput) : next;
  };
  const noop = () => undefined;
  const params: CrudParams = {
    editableAnimations: initial,
    baseAnimations: initial,
    selectedAnimation: selected,
    selectedAnimationInfo: selected === null ? null : initial[selected] ?? null,
    editName,
    editDurationInput,
    newAnimationName: "",
    newAnimationDurationInput: "1.5",
    durationMode: "scale",
    autoNameCounterRef: { current: 1 },
    setDraftAnimations,
    setSelectedAnimation,
    setEditName,
    setEditDurationInput,
    setSelectedBoneName: noop,
    setSelectedTrackProperty: noop,
    setSelectedKeyframeIndex: noop,
    setIsCreatingKeyframe: noop,
    setKeyframeTimeInput: noop,
    setKeyframeValueInputs: noop,
    setKeyframeError: noop,
    setDurationError: noop,
    resetKeyframeHistory: noop,
    clearEventSelection: noop,
    dropAnimationEvents: noop,
    ...overrides,
  };
  const container = document.createElement("div");
  const root = createRoot(container);
  const handlersRef = { current: defaultHandlers };
  act(() => root.render(createElement(Harness, { params, handlersRef })));
  return {
    root,
    handlers: handlersRef.current,
    getAnimations: () => draftAnimations ?? [],
    getSelected: () => selected,
    getEditName: () => editName,
    getEditDurationInput: () => editDurationInput,
  };
}

function closeHarness(root: Root) {
  act(() => root.unmount());
}

describe("useAnimationCrud", () => {
  it("updates the selected animation using a trimmed fallback name", () => {
    const harness = createHarness([makeAnimation("Walk")], { editName: "   " });
    act(() => harness.handlers.handleUpdateAnimation());
    expect(harness.getAnimations()[0]?.name).toBe("Animation 1");
    expect(harness.getAnimations()[0]?.clip.name).toBe("Animation 1");
    closeHarness(harness.root);
  });

  it("creates a new animation and rejects invalid duration input", () => {
    const errors: (string | null)[] = [];
    const harness = createHarness([makeAnimation("Walk")], {
      newAnimationDurationInput: "0",
      setDurationError: (next) => errors.push(typeof next === "function" ? next(null) : next),
    });
    act(() => harness.handlers.handleCreateAnimation(null));
    expect(harness.getAnimations()).toHaveLength(1);
    expect(errors.at(-1)).toContain("Invalid duration");
    closeHarness(harness.root);
  });

  it("creates a named animation from a source clip and increments unnamed names", () => {
    const harness = createHarness([makeAnimation("Walk")]);
    act(() => harness.handlers.handleCreateAnimation(0));
    expect(harness.getAnimations()).toHaveLength(2);
    expect(harness.getAnimations()[1]).toMatchObject({ name: "Animation 1", index: 1, duration: 1.5 });
    expect(harness.getAnimations()[1]?.clip).not.toBe(harness.getAnimations()[0]?.clip);
    closeHarness(harness.root);
  });

  it("scales and truncates keyframe tracks without mutating the source clip", () => {
    const source = makeAnimation("Walk", 2);
    const originalTimes = Array.from(source.clip.tracks[0]?.times ?? []);
    const harness = createHarness([source], { editDurationInput: "4", durationMode: "scale" });
    act(() => harness.handlers.handleApplyDuration());
    expect(Array.from(harness.getAnimations()[0]?.clip.tracks[0]?.times ?? [])).toEqual([0, 4]);
    expect(Array.from(source.clip.tracks[0]?.times ?? [])).toEqual(originalTimes);
    closeHarness(harness.root);
  });

  it("deletes the selected animation, reindexes, and clears dependent state", () => {
    const dropped: number[] = [];
    let resetCount = 0;
    const harness = createHarness([makeAnimation("Walk"), makeAnimation("Run")], {
      dropAnimationEvents: (index) => dropped.push(index),
      resetKeyframeHistory: () => { resetCount += 1; },
    });
    act(() => harness.handlers.handleDeleteAnimation());
    expect(harness.getAnimations()).toHaveLength(1);
    expect(harness.getAnimations()[0]?.index).toBe(0);
    expect(harness.getSelected()).toBeNull();
    expect(dropped).toEqual([0]);
    expect(resetCount).toBe(1);
    closeHarness(harness.root);
  });

  it("clears selection or selects an animation and its first bone", () => {
    const harness = createHarness([makeAnimation("Walk")]);
    act(() => harness.handlers.handleAnimationSelectionChange("none"));
    expect(harness.getSelected()).toBeNull();
    act(() => harness.handlers.handleAnimationSelectionChange("0"));
    expect(harness.getSelected()).toBe(0);
    expect(harness.getEditName()).toBe("Walk");
    expect(harness.getEditDurationInput()).toBe("2");
    closeHarness(harness.root);
  });
});
