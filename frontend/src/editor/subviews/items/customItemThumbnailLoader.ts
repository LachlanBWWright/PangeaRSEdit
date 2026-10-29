import { err, Result, ResultAsync, type Result as TypedResult } from "neverthrow";
import { AnimationMixer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { parseBG3D, type BG3DParseResult } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseBG3DWithSkeleton } from "@/modelParsers/bg3dWithSkeleton";
import { parseShapesFile, shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { getAssetState } from "@/assets/assetState";
import type { Game } from "@/data/globals/globals";
import type { ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";
import { convertUploadedModel } from "../scripts/scriptUploadedModel";
import { disposeScriptModel } from "../scripts/scriptModelDisposal";
import { validateParsedNativeModel } from "../scripts/scriptAssetValidation";
import { selectNativeModelObject } from "../scripts/scriptNativeModelObjects";
import { loadCustomThumbnailBytes, type CustomThumbnailSource } from "./customItemThumbnailSource";
import { renderCustomItemThumbnail, type CustomItemThumbnail } from "./customItemThumbnailScene";

const caches = new WeakMap<ScriptWorkspaceState["assets"], Map<string, Promise<TypedResult<CustomItemThumbnail, string>>>>();
let generationQueue = Promise.resolve();

function renderShape(buffer: ArrayBuffer, source: CustomThumbnailSource): TypedResult<CustomItemThumbnail, string> {
  return parseShapesFile(buffer).andThen((file) => {
    const frame = file.shapes[source.modelObject]?.frames[0];
    if (!frame) return err("The configured Shapes object has no frame.");
    const palette = gMightyMikePalette.getPaletteAsRGBA();
    const colors = Array.from({ length: 256 }, (_, index) => ({ r: palette[index * 4] ?? 0, g: palette[index * 4 + 1] ?? 0, b: palette[index * 4 + 2] ?? 0 }));
    return shapeFrameToCanvas(frame, colors).map((image) => ({ image, offsetX: frame.header.offsetX * source.scale, offsetY: frame.header.offsetY * source.scale, scale: source.scale }));
  });
}

async function generate(game: Game, source: CustomThumbnailSource, assets: ScriptWorkspaceState["assets"]): Promise<TypedResult<CustomItemThumbnail, string>> {
  const bytes = await loadCustomThumbnailBytes(game, source.modelPath, assets);
  if (bytes.isErr()) return err(bytes.error);
  if (source.modelPath.toLowerCase().endsWith(".shapes")) return renderShape(bytes.value, source);
  let parsed: TypedResult<BG3DParseResult, string>;
  if (source.skeletonPath) {
    const skeleton = await loadCustomThumbnailBytes(game, `${source.skeletonPath}.rsrc`, assets);
    if (skeleton.isErr()) return err(skeleton.error);
    parsed = await parseBG3DWithSkeleton(bytes.value, skeleton.value);
  } else {
    parsed = source.modelPath.toLowerCase().endsWith(".3dmf") ? parse3DMF(bytes.value) : parseBG3D(bytes.value);
    parsed = parsed.andThen((model) => selectNativeModelObject(model, source.modelObject));
  }
  if (parsed.isErr()) return err(parsed.error);
  const validation = validateParsedNativeModel(parsed.value, source.modelPath);
  if (validation.length) return err(validation.join("; "));
  const created = Result.fromThrowable(() => new Worker(new URL("../../../modelParsers/bg3dGltfWorker.ts", import.meta.url), { type: "module" }), () => "Could not start thumbnail conversion.")();
  if (created.isErr()) return err(created.error);
  const worker = created.value;
  const converted = await convertUploadedModel(worker, parsed.value, new AbortController().signal);
  worker.terminate();
  if (converted.isErr()) return err(converted.error);
  const loaded = await ResultAsync.fromPromise(new GLTFLoader().parseAsync(converted.value, ""), () => "Could not read thumbnail model.");
  if (loaded.isErr()) return err(loaded.error);
  const mixer = new AnimationMixer(loaded.value.scene);
  const clip = loaded.value.animations[source.animation];
  if (clip) { mixer.clipAction(clip).play(); mixer.update(0); }
  const thumbnail = renderCustomItemThumbnail(loaded.value.scene);
  mixer.stopAllAction(); mixer.uncacheRoot(loaded.value.scene);
  disposeScriptModel(loaded.value.scene);
  return thumbnail;
}

export function loadCustomItemThumbnail(game: Game, source: CustomThumbnailSource, assets: ScriptWorkspaceState["assets"]): Promise<TypedResult<CustomItemThumbnail, string>> {
  const cache = caches.get(assets) ?? new Map<string, Promise<TypedResult<CustomItemThumbnail, string>>>();
  caches.set(assets, cache);
  const key = `${game}:${getAssetState().revision}:${JSON.stringify(source)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (cache.size >= 128) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
  const pending = generationQueue.then(() => generate(game, source, assets)).then((result) => {
    if (result.isErr()) cache.delete(key);
    return result;
  });
  generationQueue = pending.then(() => undefined);
  cache.set(key, pending);
  return pending;
}
