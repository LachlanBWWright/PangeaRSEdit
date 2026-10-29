import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { CustomObjectAnimations } from "./CustomObjectAnimations";
import { changeObjectVisual } from "./scriptObjectVisuals";
import { removeObjectAnimationBinding, setObjectAnimationBinding } from "./scriptAnimationMappings";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";

describe("custom object animation controls", () => {
  it("adds and removes persistent action bindings together with runtime indices", () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const sample = workspace.customObjects[0];
    expect(sample).toBeDefined();
    if (!sample) return;
    const definition = { ...changeObjectVisual(sample, "customSkeleton", workspace.context.gameId), assetId: "hover-model" };
    const updated = setObjectAnimationBinding(definition, "rise", 2, [{ name: "Rest", index: 0 }, { name: "Take off", index: 2 }]);
    expect(updated.assetAnimations).toEqual({ idle: "Rest", rise: "Take off" });
    expect(updated.visual).toMatchObject({ animations: { idle: 0, rise: 2 } });
    const removed = removeObjectAnimationBinding(updated, "rise");
    expect(removed.assetAnimations).toEqual({ idle: "Rest" });
    expect(removed.visual).toMatchObject({ animations: { idle: 0 } });
    expect(removeObjectAnimationBinding(updated, "idle")).toBe(updated);
  });

  it("assigns a named imported clip without changing the action name", async () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const sample = workspace.customObjects[0];
    expect(sample).toBeDefined();
    if (!sample) return;
    const definition = { ...changeObjectVisual(sample, "customSkeleton", workspace.context.gameId), assetId: "hover-model", assetAnimations: { idle: "Rest pose" } };
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = vi.fn();
    await act(async () => root.render(<CustomObjectAnimations definition={definition} onChange={onChange} availableClips={[{ name: "Rest pose", index: 0 }, { name: "Hover loop", index: 3 }]} />));
    const clipSelect = container.querySelector<HTMLSelectElement>(`select[id="animation-clip-${definition.id}-0"]`);
    expect(clipSelect?.textContent).toContain("Hover loop");
    if (clipSelect) await act(async () => {
      clipSelect.value = "3";
      clipSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ assetAnimations: { idle: "Hover loop" }, visual: expect.objectContaining({ animations: { idle: 3 }, initialAnimation: "idle" }) }));
    expect(container.querySelector('input[type="number"]')?.getAttribute("value")).toBe("1");
    await act(async () => root.unmount());
  });

  it("shows a missing clip without silently remapping it", async () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const sample = workspace.customObjects[0];
    expect(sample).toBeDefined();
    if (!sample) return;
    const definition = changeObjectVisual(sample, "customSkeleton", workspace.context.gameId);
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = vi.fn();
    await act(async () => root.render(<CustomObjectAnimations definition={definition} onChange={onChange} availableClips={[{ name: "Replacement", index: 2 }]} />));
    expect(container.textContent).toContain("Missing clip (native ID 0)");
    expect(container.querySelector('select[aria-invalid="true"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("keeps a removed named binding missing even when its old index is reused", async () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const sample = workspace.customObjects[0];
    expect(sample).toBeDefined();
    if (!sample) return;
    const definition = { ...changeObjectVisual(sample, "customSkeleton", workspace.context.gameId), assetId: "hover-model", assetAnimations: { idle: "Rest pose" } };
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = vi.fn();
    await act(async () => root.render(<CustomObjectAnimations definition={definition} onChange={onChange} availableClips={[{ name: "Replacement", index: 0 }]} />));
    expect(container.textContent).toContain("Missing or ambiguous clip: Rest pose");
    expect(container.querySelector<HTMLSelectElement>('select[aria-invalid="true"]')?.value).toBe("-1");
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
