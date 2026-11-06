import { useState } from "react";
import { createStore, Provider } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { desktopProjectAtom } from "@/platform/desktop/projectState";
import { workflowProject, installWorkflowBridge } from "@/platform/desktop/workflowFixtures.stories.support";
import { createScriptWorkspaceContext, loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "./scriptWorkspaceState";
import { scriptAuthoringSelectionAtom } from "./scriptAuthoringNavigation";
import { CustomObjectWorkspace } from "./CustomObjectWorkspace";

function BehaviorWorkspace() {
  const context = createScriptWorkspaceContext(OttoGlobals, 0);
  const [store] = useState(() => {
    const state = createStore();
    const sample = loadScriptSample(context, "hover-beacon");
    const workspace = { ...sample, customObjects: sample.customObjects.map((object) => ({ ...object, parameterDefinitions: [
      { kind: "number", id: "health", label: "Health", min: 1, max: 100, defaultValue: 10 },
    ] } satisfies typeof object)) };
    state.set(Globals, OttoGlobals);
    state.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, workspace));
    state.set(scriptAuthoringSelectionAtom, { [context.gameId]: { selectedId: workspace.customObjects[0]?.id ?? null, tab: "behavior", section: "objects" } });
    state.set(desktopProjectAtom, { ...workflowProject, files: [...workflowProject.files, ...Object.values(workspace.sourceFiles).map((file) => ({ path: file.path, hash: "fixture", size: file.content.length }))] });
    return state;
  });
  return <Provider store={store}><TooltipProvider><main className="script-workbench min-h-screen"><CustomObjectWorkspace context={context} /></main></TooltipProvider></Provider>;
}

const meta = { title: "Scripting/Object Behavior Workspace", component: BehaviorWorkspace, parameters: { layout: "fullscreen" }, tags: ["test", "interaction", "visual"] } satisfies Meta<typeof BehaviorWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopExternalEditor: Story = {
  beforeEach: installWorkflowBridge,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText("Lua source editor")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Open file externally" })).toBeEnabled();
    await expect(canvas.getByLabelText("Lua source preview")).toBeVisible();
    await expect(canvas.getAllByRole("spinbutton", { name: "Health" })).toHaveLength(1);
    await userEvent.clear(canvas.getByRole("spinbutton", { name: "Health" }));
    await userEvent.type(canvas.getByRole("spinbutton", { name: "Health" }), "30");
    await userEvent.tab();
    await expect(canvas.getByRole("spinbutton", { name: "Health" })).toHaveValue(30);
    if (window.innerWidth >= 1100) await expect(canvas.getByLabelText("Lua source preview").getBoundingClientRect().top).toBeLessThan(380);
  },
};

export const BrowserSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("spinbutton", { name: "Health" })).toHaveLength(1);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Health" }));
    await expect(canvas.getByLabelText("Setting name")).toHaveValue("Health");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
  },
};
