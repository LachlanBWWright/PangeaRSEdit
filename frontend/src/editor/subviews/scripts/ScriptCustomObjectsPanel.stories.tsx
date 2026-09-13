import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
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
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <ScriptCustomObjectsPanel
        gameId={context.gameId}
        customObjectBehaviorId={selectedBehaviorId}
        onCustomObjectBehaviorIdChange={setSelectedBehaviorId}
        customObjectBehaviors={customObjectBehaviors}
        customObjectLabel={label}
        onCustomObjectLabelChange={setLabel}
        generatedCustomObjectId="custom.hover-beacon"
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
    </div>
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
      canvas.getByRole("combobox", { name: "Hover Beacon collision" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Trigger box" }),
    );

    expect(canvas.getByLabelText("Hover Beacon collision width")).toHaveValue(1);
    expect(canvas.getByLabelText("Hover Beacon collision height")).toHaveValue(1);
    expect(canvas.getByLabelText("Hover Beacon collision depth")).toHaveValue(1);
  },
};
