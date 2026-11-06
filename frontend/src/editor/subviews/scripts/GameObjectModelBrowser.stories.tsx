import { useState } from "react";
import { createStore, Provider } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CustomObjectAppearance } from "./CustomObjectAppearance";
import { createScriptWorkspaceContext, loadScriptSample, updateCustomObjectDefinition, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { changeObjectVisual } from "./scriptObjectVisuals";
import "./scriptWorkbench.css";

function CatalogAppearance() {
  const [store] = useState(() => { const next = createStore(); next.set(Globals, OttoGlobals); return next; });
  const [workspace, setWorkspace] = useState<ScriptWorkspaceState>(() => {
    const sample = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    return { ...sample, customObjects: sample.customObjects.map((definition) => changeObjectVisual(definition, "nativeDisplayGroup", sample.context.gameId)) };
  });
  const definition = workspace.customObjects[0];
  if (!definition) return null;
  return <Provider store={store}><TooltipProvider><main className="script-workbench mx-auto max-w-5xl p-5">
    <CustomObjectAppearance workspace={workspace} definition={definition} update={setWorkspace} uploading={false} onUpload={() => undefined}
      onChange={(next) => setWorkspace((state) => updateCustomObjectDefinition(state, next))} />
  </main></TooltipProvider></Provider>;
}

const meta = { title: "Scripting/Game Model Library", component: CatalogAppearance, parameters: { layout: "fullscreen" }, tags: ["test", "interaction", "visual"] } satisfies Meta<typeof CatalogAppearance>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteLevelBank: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    const chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.selectOptions(chooser.getByRole("combobox", { name: "Model file" }), "/PangeaRSEdit/games/ottomatic/models/level1_farm.bg3d");
    await expect(await chooser.findByText("37 objects · choose the geometry to use")).toBeVisible();
    for (let page = 0; page < 3; page++) await userEvent.click(chooser.getByRole("button", { name: "Next models" }));
    await userEvent.click(chooser.getByRole("button", { name: "Select Object 37" }));
    await userEvent.click(chooser.getByRole("button", { name: "Use Object 37" }));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await userEvent.click(canvas.getByText("Available in this level"));
    await expect(canvas.getByText(/Object 36 exists/)).toBeVisible();
    await userEvent.click(canvas.getByText("Native asset details"));
    await expect(canvas.getByRole("combobox", { name: "Model bank" })).toHaveValue("levelSpecific");
    await expect(canvas.getByRole("spinbutton", { name: "Model object ID" })).toHaveValue(36);
  },
};

export const NamedSkeleton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    const chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.selectOptions(chooser.getByRole("combobox", { name: "Model file" }), "/PangeaRSEdit/games/ottomatic/skeletons/Onion.bg3d");
    await expect(await chooser.findByText("Animated skeleton")).toBeVisible();
    await userEvent.click(chooser.getByRole("button", { name: "Use Onion" }));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await userEvent.click(canvas.getByText("Native asset details"));
    await expect(canvas.getByRole("spinbutton", { name: "Native skeleton ID" })).toHaveValue(3);
    await userEvent.click(canvas.getByText("Available in this level"));
    await expect(canvas.getByText(/native gameplay loader loads Skeletons\/Onion/)).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Preview animation" })).toBeVisible(), { timeout: 30_000 });
    await userEvent.selectOptions(await canvas.findByRole("combobox", { name: "Initial animation" }), "1");
    await expect(canvas.getByRole("combobox", { name: "Preview animation" })).toHaveValue("1");
    if (window.innerWidth >= 1100) await expect(canvas.getByRole("spinbutton", { name: "Model scale" }).getBoundingClientRect().top).toBeLessThan(650);
  },
};

export const CopyUnavailableSkeleton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    const chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.selectOptions(chooser.getByRole("combobox", { name: "Model file" }), "/PangeaRSEdit/games/ottomatic/skeletons/Blob.bg3d");
    await expect(await chooser.findByText(/Not loaded in this level/)).toBeVisible();
    await expect(chooser.getByRole("button", { name: "Use Blob" })).toBeDisabled();
    await userEvent.click(chooser.getByRole("button", { name: "Include assets and use" }));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await userEvent.click(await canvas.findByText("Asset files"));
    await waitFor(() => expect(canvas.getByText("Added: Data/Scripts/assets/skeletons/catalog-blob.bg3d")).toBeVisible(), { timeout: 30_000 });
    await expect(canvas.getByText("Added: Data/Scripts/assets/skeletons/catalog-blob.skeleton.rsrc")).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Initial action" })).toHaveValue("idle");
  },
};

export const BrowsingDoesNotApply: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const current = canvasElement.querySelector(".object-appearance-name")?.textContent;
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    const chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.selectOptions(chooser.getByRole("combobox", { name: "Model file" }), "/PangeaRSEdit/games/ottomatic/skeletons/Onion.bg3d");
    await expect(await chooser.findByRole("button", { name: "Use Onion" })).toBeEnabled();
    await expect(canvasElement.querySelector(".object-appearance-name")?.textContent).toBe(current);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await expect(canvas.getByRole("button", { name: "Change model" })).toHaveFocus();
    await expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument();
  },
};

export const CandidateChooser: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }));
    const chooser = within(await within(document.body).findByRole("dialog"));
    await userEvent.selectOptions(chooser.getByRole("combobox", { name: "Model file" }), "/PangeaRSEdit/games/ottomatic/skeletons/Onion.bg3d");
    await expect(await chooser.findByText("Candidate preview")).toBeVisible();
    await expect(chooser.getByText(/Current:/)).toBeVisible();
  },
};
