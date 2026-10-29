import { useState } from "react";
import { createStore, Provider } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { CustomObjectAppearance } from "@/editor/subviews/scripts/CustomObjectAppearance";
import { changeObjectVisual } from "@/editor/subviews/scripts/scriptObjectVisuals";
import { createScriptWorkspaceContext, loadScriptSample } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";
import { workflowProject } from "./workflowFixtures.stories.support";
import { installModelAssetStoryBridge, storyModelAsset } from "./modelAssets.stories.support";
import { CustomObjectCollision } from "@/editor/subviews/scripts/CustomObjectCollision";
import { ProjectObjectCollisionModelPreview } from "./ProjectObjectCollisionModelPreview";
import { applyProjectAsset } from "./projectModelAssignment";
import { projectAssetSchema } from "@pangea/desktop-contracts";
import { z } from "zod";
import { desktopRequest } from "./client";

function ObjectAppearanceStory({ collision = false }: { collision?: boolean }) {
  const [workspace, setWorkspace] = useState(() => {
    const sample = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    return { ...sample, customObjects: sample.customObjects.map((definition) => {
      if (!collision) return changeObjectVisual(definition, "customDisplayGroup", sample.context.gameId);
      const assigned = applyProjectAsset(definition, storyModelAsset);
      return { ...(assigned.isOk() ? assigned.value : definition), collision: { kind: "preset", preset: "triggerBox", bounds: { width: 161, height: 101, depth: 43 } } } satisfies typeof definition;
    }) };
  });
  const definition = workspace.customObjects[0];
  if (!definition) return null;
  if (collision) return <div className="workbench-section mx-auto max-w-4xl p-6"><CustomObjectCollision definition={definition} gameId={workspace.context.gameId} onChange={(next) => setWorkspace({ ...workspace, customObjects: [next] })} /><ProjectObjectCollisionModelPreview definition={definition} /></div>;
  return <div className="workbench-section mx-auto max-w-4xl p-6"><CustomObjectAppearance workspace={workspace}
    definition={definition}
    uploading={false} onUpload={() => undefined} onChange={(next) => setWorkspace({ ...workspace, customObjects: workspace.customObjects.map((entry) => entry.id === next.id ? next : entry) })} /></div>;
}

const meta = {
  title: "Desktop/Custom object model assets", component: ObjectAppearanceStory,
  tags: ["test", "interaction", "visual"], parameters: { layout: "fullscreen" },
  beforeEach: () => installModelAssetStoryBridge(),
  decorators: [(Story) => {
    const store = createStore();
    store.set(Globals, OttoGlobals);
    store.set(desktopProjectAtom, workflowProject);
    store.set(desktopProjectDirtyAtom, true);
    return <Provider store={store}><Story /></Provider>;
  }],
} satisfies Meta<typeof ObjectAppearanceStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InspectLinkedAnimatedCollision: Story = {
  args: { collision: true },
  beforeEach: () => installModelAssetStoryBridge(false, [storyModelAsset]),
  play: async ({ canvasElement }) => {
    const ui = within(canvasElement);
    expect(ui.getByRole("img", { name: /Front.*160 by 100/ })).toBeVisible();
    await expect(await ui.findByText("Collision: 160 × 100 × 42 units, centered at origin")).toBeVisible();
    await waitFor(() => expect(ui.getByRole("region", { name: "Converted model preview" }).querySelector("canvas")).toBeVisible(), { timeout: 20000 });
    await userEvent.clear(ui.getByLabelText("Collision width"));
    await userEvent.type(ui.getByLabelText("Collision width"), "201");
    await userEvent.tab();
    expect(ui.getByText("Collision: 200 × 100 × 42 units, centered at origin")).toBeVisible();
    await userEvent.click(ui.getByRole("button", { name: "Pause" }));
    expect(ui.getByRole("button", { name: "Play" })).toBeVisible();
  },
};

export const ImportWhileAuthoring: Story = {
  play: async ({ canvasElement }) => {
    const ui = within(canvasElement);
    await userEvent.click(await ui.findByRole("button", { name: "Import model…" }));
    await expect(await ui.findByRole("button", { name: "Used by this object" })).toBeVisible();
    await expect(within(ui.getByLabelText("Standing clip")).getByRole("option", { name: "Slide" })).toBeInTheDocument();
    await expect(ui.queryByRole("button", { name: "Save project before importing" })).not.toBeInTheDocument();
    await userEvent.selectOptions(ui.getByLabelText("Preview animation"), "1");
    await userEvent.click(ui.getByRole("button", { name: "Pause" }));
    await expect(ui.getByRole("button", { name: "Play" })).toBeVisible();
    await userEvent.click(ui.getByRole("button", { name: "Remove GotHit action" }));
    await userEvent.type(ui.getByLabelText("New action name"), "walk");
    await userEvent.click(ui.getByRole("button", { name: "Add action" }));
    await userEvent.selectOptions(ui.getByLabelText("walk clip"), "1");
    await expect(ui.getByLabelText("walk clip")).toHaveValue("1");
    await userEvent.click(ui.getByText("Import settings", { selector: "summary" }));
    await userEvent.selectOptions(ui.getByLabelText("Transparency blending"), "yes");
    await userEvent.click(ui.getByLabelText("Override material color"));
    await userEvent.click(ui.getByRole("button", { name: "Add Event" }));
    await userEvent.clear(ui.getByLabelText("Event 1 time"));
    await userEvent.type(ui.getByLabelText("Event 1 time"), "15");
    await userEvent.click(ui.getByRole("button", { name: /^Reimport$/ }));
    await waitFor(async () => {
      const assets = await desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema));
      await expect(assets.isOk() ? assets.value[0]?.recipe.materialMappings : undefined).toEqual([{ material: "Material_0000", alwaysBlend: true, diffuseColor: [1, 1, 1, 1] }]);
      await expect(assets.isOk() ? assets.value[0]?.recipe.animationEvents : undefined).toEqual([{ clip: "Standing", events: [{ time: 15, type: 0, value: 0 }] }]);
    });
  },
};

export const ReviewBeforeAssignment: Story = {
  beforeEach: () => installModelAssetStoryBridge(true),
  play: async ({ canvasElement }) => {
    const ui = within(canvasElement);
    await userEvent.click(await ui.findByRole("button", { name: "Import model…" }));
    await expect(await ui.findByText(/Skin weights were simplified/)).toBeVisible();
    const accept = ui.getByRole("button", { name: "Accept conversion and use asset" });
    await waitFor(() => expect(accept).toBeEnabled(), { timeout: 20000 });
    await userEvent.click(accept);
    await expect(await ui.findByRole("button", { name: "Used by this object" })).toBeVisible();
  },
};
