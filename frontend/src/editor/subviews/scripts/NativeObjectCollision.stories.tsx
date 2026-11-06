import { useState } from "react";
import { createStore, Provider } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createScriptWorkspaceContext, loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "./scriptWorkspaceState";
import { scriptAuthoringSelectionAtom } from "./scriptAuthoringNavigation";
import { CustomObjectWorkspace } from "./CustomObjectWorkspace";

function NativeCollisionWorkspace({ skeleton = false }: { skeleton?: boolean }) {
  const context = createScriptWorkspaceContext(OttoGlobals, 0);
  const [store] = useState(() => {
    const next = createStore();
    const sample = loadScriptSample(context, "hover-beacon");
    const workspace = { ...sample, customObjects: sample.customObjects.map((object) => ({ ...object,
      visual: skeleton ? { kind: "nativeSkeleton", skeletonType: 3, initialAnimation: 1, animationSpeed: 1.5, scale: 2, slot: 450 }
        : { kind: "nativeDisplayGroup", group: "levelSpecific", modelObject: 36, scale: 1, slot: 450 },
      collision: { kind: "preset", preset: "triggerBox", bounds: { width: 160, height: 200, depth: 160 } },
    } satisfies typeof object)) };
    next.set(Globals, OttoGlobals);
    next.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, workspace));
    next.set(scriptAuthoringSelectionAtom, { [context.gameId]: { selectedId: workspace.customObjects[0]?.id ?? null, tab: "collision", section: "objects" } });
    return next;
  });
  return <Provider store={store}><TooltipProvider><CustomObjectWorkspace context={context} /></TooltipProvider></Provider>;
}

const meta = { title: "Scripting/Native Object Collision", component: NativeCollisionWorkspace, parameters: { layout: "fullscreen" }, tags: ["test", "interaction", "visual"] } satisfies Meta<typeof NativeCollisionWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteLevelModel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("region", { name: "Uploaded model collision preview" }).querySelector("canvas")).toBeVisible(), { timeout: 30_000 });
    await expect(canvas.getByRole("region", { name: "Collision bounds preview" })).toBeVisible();
  },
};

export const AnimatedNativeSkeleton: Story = {
  args: { skeleton: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Preview animation" })).toHaveValue("1"), { timeout: 30_000 });
    await expect(canvas.getByRole("region", { name: "Uploaded model collision preview" }).querySelector("canvas")).toBeVisible();
  },
};
