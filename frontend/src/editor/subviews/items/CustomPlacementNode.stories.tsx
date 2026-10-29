import { useEffect, useState } from "react";
import { Provider, createStore } from "jotai";
import { Layer, Stage } from "react-konva";
import Konva from "konva";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { OttoGlobals, MightyMikeGlobals, Globals } from "@/data/globals/globals";
import { fetchAsset } from "@/assets/fetchAsset";
import { ShowItemThumbnailPreviews } from "@/data/canvasView/canvasDisplaySettingsAtoms";
import { CustomPlacementNode } from "./CustomPlacementNode";
import { ShowMightyMikeItemImages } from "./MightyMikeItemMenu";
import { createScriptWorkspaceContext, loadScriptSample, type ScriptCustomObjectDefinition, type ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";

const fixtures = [
  { file: "ottomatic/models/global.bg3d", target: "models/upload.bg3d", skeleton: "" },
  { file: "bugdom1/models/Global_Models1.3dmf", target: "models/upload.3dmf", skeleton: "" },
  { file: "ottomatic/skeletons/Blob.bg3d", target: "skeletons/Blob.bg3d", skeleton: "ottomatic/skeletons/Blob.skeleton.rsrc" },
] satisfies readonly { file: string; target: string; skeleton: string }[];

function ConfiguredThumbnails({ shapes = false }: { shapes?: boolean }) {
  const [workspace, setWorkspace] = useState<ScriptWorkspaceState | null>(null);
  const [position, setPosition] = useState({ x: 75, z: 75 });
  const [store] = useState(() => {
    const next = createStore(); next.set(Globals, shapes ? MightyMikeGlobals : OttoGlobals); next.set(ShowItemThumbnailPreviews, true); next.set(ShowMightyMikeItemImages, true); return next;
  });
  useEffect(() => {
    let active = true;
    async function load() {
      const sample = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
      const original = sample.customObjects[0];
      if (!original) return;
      const assets: Record<string, ScriptWorkspaceState["assets"][string]> = {};
      const definitions: ScriptCustomObjectDefinition[] = [];
      const selected = shapes ? [{ file: "", target: "models/upload.shapes", skeleton: "" }] : fixtures;
      for (const fixture of selected) {
        const bytes = await fetchAsset(shapes ? "/data/mightymike/shapes/main.shapes" : `/games/${fixture.file}`);
        if (bytes.isErr()) return;
        const path = `Data/Scripts/assets/${fixture.target}`;
        assets[path] = { path, bytes: new Uint8Array(bytes.value), sourceName: fixture.target };
        const skeletonPath = "Data/Scripts/assets/skeletons/Blob.skeleton";
        if (fixture.skeleton) {
          const skeleton = await fetchAsset(`/games/${fixture.skeleton}`);
          if (skeleton.isErr()) return;
          assets[`${skeletonPath}.rsrc`] = { path: `${skeletonPath}.rsrc`, bytes: new Uint8Array(skeleton.value), sourceName: "Blob.skeleton.rsrc" };
        }
        definitions.push({ ...original, id: fixture.target, label: fixture.target, visual: fixture.skeleton
          ? { kind: "customSkeleton", modelPath: path, skeletonPath, scale: 1, slot: 450, animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1 }
          : { kind: "customDisplayGroup", modelPath: path, modelObject: 0, scale: 1, slot: 450 } });
      }
      if (active) setWorkspace({ ...sample, assets, customObjects: definitions });
    }
    void load(); return () => { active = false; };
  }, [shapes]);
  if (!workspace) return <p>Loading bundled native assets…</p>;
  return <Provider store={store}><Stage width={420} height={260} x={20} y={10} scaleX={1.5} scaleY={1.5}><Layer>{workspace.customObjects.map((definition, index) => <CustomPlacementNode
    key={definition.id} definition={definition} assets={workspace.assets} selected={false}
    placement={{ id: definition.id, objectId: definition.id, label: definition.label, position: { x: position.x + index * 80, y: 0, z: position.z }, levelKey: "0" }}
    onSelect={() => undefined} onMove={(_id, x, z) => setPosition({ x, z })} onHover={() => undefined}
  />)}</Layer></Stage></Provider>;
}

const meta = { title: "Editor/Custom item thumbnails", component: ConfiguredThumbnails, tags: ["test", "interaction"] } satisfies Meta<typeof ConfiguredThumbnails>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConfiguredAssetsWithoutOpeningAppearance: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const stage = Konva.stages.find((candidate) => canvasElement.contains(candidate.container()));
      expect(stage?.find("Image")).toHaveLength(3);
    }, { timeout: 30000 });
  },
};

export const ShapesUseNativeFrameOffsetsAndDragging: Story = {
  args: { shapes: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const stage = Konva.stages.find((candidate) => canvasElement.contains(candidate.container()));
      expect(stage?.find("Image")).toHaveLength(1);
    }, { timeout: 30000 });
    const stage = Konva.stages.find((candidate) => canvasElement.contains(candidate.container()));
    const image = stage?.findOne("Image");
    const group = image?.getParent();
    const mapCanvas = canvasElement.querySelector("canvas");
    expect(group).toBeDefined();
    if (!stage || !image || !group || !mapCanvas) return;
    const before = group.position();
    const absolute = image.getAbsolutePosition();
    const bounds = mapCanvas.getBoundingClientRect();
    const start = { clientX: bounds.left + absolute.x + image.width() * 0.75, clientY: bounds.top + absolute.y + image.height() * 0.75 };
    await userEvent.pointer([
      { target: mapCanvas, coords: start, keys: "[MouseLeft>]" },
      { target: mapCanvas, coords: { clientX: start.clientX + 6, clientY: start.clientY + 6 } },
      { target: mapCanvas, coords: { clientX: start.clientX + 30, clientY: start.clientY + 45 } },
      { target: mapCanvas, coords: { clientX: start.clientX + 30, clientY: start.clientY + 45 }, keys: "[/MouseLeft]" },
    ]);
    await waitFor(() => {
      expect(group.x()).toBe(before.x + 20);
      expect(group.y()).toBe(before.y + 30);
    });
  },
};
