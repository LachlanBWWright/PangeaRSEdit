import { useState } from "react";
import { createStore, Provider } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ResultAsync } from "neverthrow";
import type { SpriteAsset } from "@pangea/desktop-contracts";
import { parseShapesFile, shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import { desktopProjectAtom } from "@/platform/desktop/projectState";
import { workflowProject } from "@/platform/desktop/workflowFixtures.stories.support";
import type { SpriteData } from "../types";
import { LinkedSpriteSource } from "./LinkedSpriteSource";

const palette = { name: "Native index preview", colors: Array.from({ length: 256 }, (_, index) => ({ r: index, g: index, b: index })) };
const asset: SpriteAsset = { version: 1, id: "11111111-1111-4111-8111-111111111111", name: "Linked native shape", nativePath: "Assets/sprites/main.shapes", shapeIndex: 0,
  source: { mode: "managed", imagePath: "AuthoringSources/main/source.png", metadataPath: "AuthoringSources/main/source.json", authoringPath: null, fingerprint: "a".repeat(64) },
  frames: [], importedAt: "2026-10-23T00:00:00Z" };

function Workspace({ data, shapeIndex }: { readonly data: SpriteData; readonly shapeIndex: number }) {
  const [current, setCurrent] = useState(data);
  const [store] = useState(() => {
    const result = createStore();
    result.set(desktopProjectAtom, { ...workflowProject, manifest: { ...workflowProject.manifest, game: "MightyMike" }, files: [{ path: asset.nativePath, hash: "shape", size: data.sourceBytes.byteLength }] });
    return result;
  });
  return <Provider store={store}><div className="max-w-lg bg-gray-900 p-4 text-white"><LinkedSpriteSource data={current} palette={palette} selectedShapeIndex={shapeIndex} nativePath={asset.nativePath}
    onSaved={(expected, replacement) => setCurrent((previous) => previous === expected ? replacement : previous)} /></div></Provider>;
}

const meta = {
  title: "Pages/Sprite Editor/Linked source", component: Workspace,
  args: { data: { type: "sprites", filename: "main", sourceBytes: new ArrayBuffer(0), data: { colorTable: [], shapes: [] } }, shapeIndex: 0 },
  loaders: [async () => {
    const fetched = await ResultAsync.fromPromise(fetch("/data/mightymike/shapes/main.shapes").then((response) => response.arrayBuffer()), () => "Cannot load bundled Shapes fixture");
    if (fetched.isErr()) return { error: fetched.error };
    const parsed = parseShapesFile(fetched.value);
    if (parsed.isErr()) return { error: parsed.error };
    const shape = parsed.value.shapes.find((entry) => entry.frames.length > 0 && entry.frames.length <= 8);
    if (!shape) return { error: "Bundled Shapes fixture has no small animation" };
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(...shape.frames.map((frame) => frame.header.width));
    const rowHeight = Math.max(...shape.frames.map((frame) => frame.header.height));
    canvas.height = rowHeight * shape.frames.length;
    const frames: { filename: string; frame: { x: number; y: number; w: number; h: number }; duration: number }[] = [];
    for (const [index, frame] of shape.frames.entries()) {
      const image = shapeFrameToCanvas(frame, palette.colors);
      if (image.isErr()) return { error: image.error };
      canvas.getContext("2d")?.drawImage(image.value, 0, index * rowHeight);
      frames.push({ filename: `Frame ${index + 1}`, frame: { x: 0, y: index * rowHeight, w: frame.header.width, h: frame.header.height }, duration: 100 });
    }
    const png = await ResultAsync.fromPromise(fetch(canvas.toDataURL("image/png")).then((response) => response.arrayBuffer()), () => "Cannot encode fixture sheet");
    if (png.isErr()) return { error: png.error };
    const linked = { ...asset, shapeIndex: shape.shapeIndex };
    window.pangeaDesktop = { onProjectChange: () => () => undefined, onTransfer: () => () => undefined, request: async (request) => {
      if (request.operation === "sprites.list") return { ok: true, value: [linked] };
      if (request.operation === "sprites.read") return { ok: true, value: { asset: linked, imageBytes: new Uint8Array(png.value), metadataBytes: new TextEncoder().encode(JSON.stringify({ frames })), fingerprint: linked.source.fingerprint } };
      if (request.operation === "sprites.commit") return { ok: true, value: { ...workflowProject, revision: "reimported" } };
      return { ok: true, value: undefined };
    } };
    return { data: { type: "sprites", filename: "main", data: parsed.value, sourceBytes: fetched.value }, shapeIndex: shape.shapeIndex };
  }],
  render: (_args, { loaded }) => loaded.error ? <p role="alert">{loaded.error}</p> : <Workspace data={loaded.data} shapeIndex={loaded.shapeIndex} />,
} satisfies Meta<typeof Workspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PreviewNativeReimport: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Preview reimport" }));
    await expect(await canvas.findByLabelText("Converted linked sprite preview")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Accept conversion and save sprite" }));
    await expect(canvas.queryByRole("button", { name: "Accept conversion and save sprite" })).not.toBeInTheDocument();
  },
};
