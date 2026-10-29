import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ResultAsync } from "neverthrow";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { createObjectDefinition } from "./scriptObjectActions";
import { UploadedObjectModelPreview } from "./UploadedObjectModelPreview";
import { CustomObjectCollision } from "./CustomObjectCollision";
import "./scriptWorkbench.css";

function UploadedCollisionInspector({ workspace }: { workspace: ScriptWorkspaceState }) {
  const [definition, setDefinition] = useState(workspace.customObjects[0]);
  const [corrupt, setCorrupt] = useState(false);
  if (!definition || definition.visual.kind !== "customSkeleton") return null;
  const modelPath = definition.visual.modelPath;
  const current = corrupt ? { ...workspace, assets: { ...workspace.assets, [modelPath]: { path: modelPath, sourceName: "damaged.bg3d", bytes: new Uint8Array([1, 2, 3]) } } } : workspace;
  return <div className="script-workbench p-4">
    <CustomObjectCollision definition={definition} gameId={workspace.context.gameId} onChange={setDefinition} />
    <UploadedObjectModelPreview definition={definition} workspace={current} />
    <button type="button" onClick={() => setCorrupt(!corrupt)}>{corrupt ? "Restore valid model" : "Use damaged model"}</button>
  </div>;
}

async function loadWorkspace(): Promise<ScriptWorkspaceState> {
  const workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null));
  const created = createObjectDefinition(workspace, "Animated Blob collision", "blank");
  if (created.isErr()) return workspace;
  const definition = created.value.state.customObjects[0];
  if (!definition) return workspace;
  const modelPath = "Data/Scripts/assets/skeletons/Blob.bg3d";
  const skeletonPath = "Data/Scripts/assets/skeletons/Blob.skeleton";
  const read = (path: string) => ResultAsync.fromPromise(fetch(path).then((response) => response.arrayBuffer()), () => "Bundled Blob asset unavailable");
  const model = await read("/games/ottomatic/skeletons/Blob.bg3d");
  const skeleton = await read("/games/ottomatic/skeletons/Blob.skeleton.rsrc");
  if (model.isErr() || skeleton.isErr()) return workspace;
  return { ...created.value.state, customObjects: [{ ...definition, collision: { kind: "preset", preset: "triggerBox", bounds: { width: 160, height: 200, depth: 160 } }, visual: { kind: "customSkeleton", modelPath, skeletonPath, scale: 1, slot: 100, animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1 } }], assets: {
    [modelPath]: { path: modelPath, sourceName: "Blob.bg3d", bytes: new Uint8Array(model.value) },
    [`${skeletonPath}.rsrc`]: { path: `${skeletonPath}.rsrc`, sourceName: "Blob.skeleton.rsrc", bytes: new Uint8Array(skeleton.value) },
  } };
}

const meta = { title: "Scripting/Uploaded Collision Model", component: UploadedCollisionInspector, args: { workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, null)) }, tags: ["test", "interaction"], loaders: [async () => ({ workspace: await loadWorkspace() })], render: (_, { loaded }) => <UploadedCollisionInspector workspace={loaded.workspace} /> } satisfies Meta<typeof UploadedCollisionInspector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RealSkeletonAndRecovery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByLabelText("Preview animation")).toBeVisible(), { timeout: 60_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Pause" }));
    await userEvent.click(canvas.getByRole("button", { name: "Use damaged model" }));
    await waitFor(() => expect(canvas.getByRole("alert")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Restore valid model" }));
    await waitFor(() => expect(canvas.getByLabelText("Preview animation")).toBeVisible(), { timeout: 60_000 });
  },
};
