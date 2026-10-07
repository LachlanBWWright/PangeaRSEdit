import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { OttoGlobals } from "@/data/globals/globals";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
} from "./scriptWorkspaceState";
import {
  getScriptBehaviorOptions,
  getScriptCustomObjectOptions,
} from "./scriptWorkspaceSelectors";
import { ScriptCustomObjectsPanel } from "./ScriptCustomObjectsPanel";
import { getNativeReplacementCompatibility } from "./scriptNativeAudit";
import { createCustomObjectFromStarter } from "./scriptObjectStarters";
import { deleteCustomObjectDefinition, duplicateCustomObjectDefinition, getCustomObjectUsageCounts } from "./scriptObjectLifecycle";
import { buildGeneratedCustomObjectId } from "./scriptWorkspaceHelpers";

function ScriptCustomObjectsPanelStory() {
  const context = createScriptWorkspaceContext(OttoGlobals, 4);
  const [workspace, setWorkspace] = useState(() =>
    loadScriptSample(context, "hover-beacon"),
  );
  const [selectedBehaviorId, setSelectedBehaviorId] = useState(
    workspace.behaviorCatalog.find((behavior) =>
      behavior.targetKinds.includes("customObject"),
    )?.id ?? "",
  );
  const [label, setLabel] = useState("Hover Beacon");
  const customObjectBehaviors = getScriptBehaviorOptions(workspace, "customObject");
  const customObjectOptions = getScriptCustomObjectOptions(workspace);
  const currentLevel = workspace.levels[context.levelKey];

  return (
    <MemoryRouter><div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <ScriptCustomObjectsPanel
        gameId={context.gameId}
        customObjectBehaviorId={selectedBehaviorId}
        onCustomObjectBehaviorIdChange={setSelectedBehaviorId}
        customObjectBehaviors={customObjectBehaviors}
        customObjectLabel={label}
        onCustomObjectLabelChange={setLabel}
        generatedCustomObjectId={buildGeneratedCustomObjectId(label, workspace.customObjects.map((definition) => definition.id))}
        customObjectOptions={customObjectOptions}
        customObjectPlacements={currentLevel?.customPlacements ?? []}
        onRemoveCustomObjectPlacement={(placementId) => {
          if (!currentLevel) return;
          setWorkspace((current) => ({
            ...current,
            levels: {
              ...current.levels,
              [context.levelKey]: {
                ...currentLevel,
                customPlacements:
                  currentLevel.customPlacements.filter(
                    (placement) => placement.id !== placementId,
                  ) ?? [],
              },
            },
          }));
        }}
        onCreateObjectScript={() => undefined}
        onExportDefinitions={() => undefined}
        onImportDefinitions={() => undefined}
        onCreateObject={() => undefined}
        onCreateFromTemplate={(starter, itemLabel) => setWorkspace((current) => createCustomObjectFromStarter(current, starter, itemLabel).unwrapOr(current))}
        onDuplicateObject={(id) => setWorkspace((current) => duplicateCustomObjectDefinition(current, id).unwrapOr(current))}
        onDeleteObject={(id) => setWorkspace((current) => deleteCustomObjectDefinition(current, id).unwrapOr(current))}
        objectUsageCounts={getCustomObjectUsageCounts(workspace)}
        assetFiles={workspace.assets}
        onUpdateObject={(definition) => {
          setWorkspace((current) => ({
            ...current,
            customObjects: current.customObjects.map((object) =>
              object.id === definition.id ? definition : object,
            ),
          }));
        }}
        onUploadAsset={() => undefined}
        selectedTerrainItem={{ index: 3, type: 12, x: 100, z: 200 }}
        terrainReplacementCompatibility={getNativeReplacementCompatibility(
          context.gameId,
          12,
          "terrain",
        )}
        replacementObjectId={null}
        onReplaceSelectedItem={() => undefined}
        onRestoreSelectedItem={() => undefined}
        selectedMapItem={null}
        mapReplacementCompatibility={null}
        mapReplacementObjectId={null}
        onReplaceSelectedMapItem={() => undefined}
        onRestoreSelectedMapItem={() => undefined}
        selectedSplineItem={null}
        splineReplacementCompatibility={null}
        splineReplacementObjectId={null}
        onReplaceSelectedSplineItem={() => undefined}
        onRestoreSelectedSplineItem={() => undefined}
      />
    </div></MemoryRouter>
  );
}

const meta = {
  title: "Scripts/Custom Objects Panel",
  component: ScriptCustomObjectsPanelStory,
  parameters: { layout: "fullscreen" },
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof ScriptCustomObjectsPanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Contact behavior" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Trigger box" }),
    );

    expect(canvas.getByLabelText("Width (X)")).toHaveValue(40);
    expect(canvas.getByLabelText("Height (Y)")).toHaveValue(40);
    expect(canvas.getByLabelText("Depth (Z)")).toHaveValue(40);
  },
};

export const CreatePickup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New item" }));
    await userEvent.clear(canvas.getByLabelText("Item name"));
    await userEvent.type(canvas.getByLabelText("Item name"), "Floating health crystal");
    await userEvent.click(canvas.getByRole("combobox", { name: "Starting behavior" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Health pickup" }));
    await userEvent.click(canvas.getByRole("button", { name: "Create item" }));
    expect(canvas.getByLabelText("Item name")).toHaveValue("Floating health crystal");
    expect(canvas.getByRole("combobox", { name: "Contact behavior" })).toHaveTextContent("Pickup");
    expect(canvas.getByLabelText("Width (X)")).toHaveValue(40);
  },
};

export const LibrarySearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Find an item"), "does not exist");
    expect(canvas.getByText("No matching items. Try another search.")).toBeVisible();
    await userEvent.clear(canvas.getByLabelText("Find an item"));
    expect(canvas.getByLabelText("Item name")).toHaveValue("Hover Beacon");
  },
};
