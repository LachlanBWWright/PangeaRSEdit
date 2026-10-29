import * as fs from "node:fs/promises";
import path from "node:path";
import { convertModelFiles, inspectModelFile, nativeFormat, readNativeAsset, validateNativeSkeleton } from "@pangea/model-codec/node";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AssetImportRecipe, GameId, HostError } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import { exportBlend } from "./blenderConversion.ts";

export interface AssetConversionProgress {
  stage: "blender" | "convert" | "preview" | "complete";
  message: string;
}
export interface AssetConversionOptions {
  sourcePath: string;
  game: GameId;
  stagingDirectory: string;
  skeletonPath?: string;
  blenderExecutable?: string;
  allowLossy?: boolean;
  recipe?: AssetImportRecipe;
  signal: AbortSignal;
  onProgress: (progress: AssetConversionProgress) => void;
}
export interface ConvertedAsset {
  modelPath: string;
  skeletonPath: string | null;
  previewPath: string;
  files: readonly string[];
  animationClips: readonly string[];
  animationEvents: { time: number; type: number; value: number }[][];
  warnings: readonly string[];
  materials: { index: number; name: string }[];
}
const targets: Record<GameId, string | null> = {
  OttoMatic: "ottomatic", Bugdom: "bugdom", Bugdom2: "bugdom2", Nanosaur: "nanosaur",
  Nanosaur2: "nanosaur2", CroMagRally: "cromag", BillyFrontier: "billyfrontier", MightyMike: null,
};
const inspectionSchema = z.object({ animations: z.array(z.object({ name: z.string(), events: z.array(z.object({
  time: z.number(), type: z.number(), value: z.number(),
})).optional() })),
  meshes: z.array(z.object({ primitives: z.number().int().nonnegative(), vertices: z.number().int().nonnegative() })) });
const cancelled = () => err(failure("Asset import cancelled", "cancelled"));

function animationNames(animations: readonly { name: string }[]): Result<string[], HostError> {
  const names = animations.map((animation, index) => animation.name.trim() || `Animation ${index + 1}`);
  if (new Set(names).size !== names.length)
    return err(failure("Animation names collide in the converted model. Give each clip a distinct name in the authoring source before importing.", "conversion"));
  return ok(names);
}

async function prepareInput(options: AssetConversionOptions): Promise<Result<string, HostError>> {
  if (path.extname(options.sourcePath).toLowerCase() !== ".blend") return ok(options.sourcePath);
  if (!options.blenderExecutable) return err(failure("Configure Blender to import .blend files, or export a GLB manually.", "configuration"));
  options.onProgress({ stage: "blender", message: "Exporting Blender source to GLB" });
  const output = path.join(options.stagingDirectory, "blender-source.glb");
  return (await exportBlend(options.sourcePath, output, options.blenderExecutable, options.signal, options.recipe?.blenderCollection)).map(() => output);
}

async function preserveNative(input: string, modelPath: string, skeletonPath: string,
  selectedSkeleton: string | undefined, game: GameId): Promise<Result<{ files: readonly string[]; warnings: readonly string[] }, HostError>> {
  const loaded = await readNativeAsset(input, { skeleton: selectedSkeleton });
  if (loaded.isErr()) return err(failure(loaded.error, "conversion"));
  const target = targets[game];
  if (!target) return err(failure("This game does not support 3D models", "unsupported"));
  const validated = validateNativeSkeleton(loaded.value.parsed.skeleton, target);
  if (validated.isErr()) return err(failure(validated.error, "conversion"));
  const source = loaded.value.inputs[0];
  if (!source) return err(failure("Native asset has no model file", "conversion"));
  const copied = await io(() => fs.copyFile(source, modelPath, fs.constants.COPYFILE_EXCL), "Cannot stage native model");
  if (copied.isErr()) return err(copied.error);
  const skeleton = loaded.value.inputs[1];
  if (!skeleton) return ok({ files: [modelPath], warnings: [] });
  const companion = await io(() => fs.copyFile(skeleton, skeletonPath, fs.constants.COPYFILE_EXCL), "Cannot stage native skeleton");
  return companion.map(() => ({ files: [modelPath, skeletonPath], warnings: [] }));
}

export async function convertAsset(options: AssetConversionOptions): Promise<Result<ConvertedAsset, HostError>> {
  if (options.signal.aborted) return cancelled();
  const target = targets[options.game];
  if (!target) return err(failure("Mighty Mike uses Shapes assets rather than 3D models", "unsupported"));
  const created = await io(() => fs.mkdir(options.stagingDirectory, { recursive: true }), "Cannot create conversion staging directory");
  if (created.isErr()) return err(created.error);
  const prepared = await prepareInput(options);
  if (prepared.isErr()) return err(prepared.error);
  if (options.signal.aborted) return cancelled();
  const input = prepared.value;
  const format = options.game === "Bugdom" || options.game === "Nanosaur" ? "3dmf" : "bg3d";
  const modelPath = path.join(options.stagingDirectory, `model.${format}`);
  const skeletonPath = path.join(options.stagingDirectory, "model.skeleton.rsrc");
  const previewPath = path.join(options.stagingDirectory, "preview.glb");
  const recipe = options.recipe;
  const sourceInspection = await inspectModelFile(input, { skeleton: options.skeletonPath });
  if (sourceInspection.isErr()) return err(failure(sourceInspection.error, "conversion"));
  const sourceMaterials = z.object({ materialNames: z.array(z.string()) }).safeParse(sourceInspection.value);
  if (!sourceMaterials.success) return err(failure("Model inspection returned invalid material names", "conversion"));
  const transform = recipe && (recipe.scale !== 1 || recipe.rotation.some((angle) => angle !== 0))
    ? { scale: recipe.scale, rotationDegrees: recipe.rotation } : undefined;
  options.onProgress({ stage: "convert", message: `Preparing ${format.toUpperCase()} for ${options.game}` });
  if (options.signal.aborted) return cancelled();
  const hasAdjustments = (recipe?.materialMappings?.length ?? 0) > 0 || (recipe?.animationEvents?.length ?? 0) > 0;
  const converted = nativeFormat(input) === format && !transform && !hasAdjustments
    ? await preserveNative(input, modelPath, skeletonPath, options.skeletonPath, options.game)
    : (await convertModelFiles(input, modelPath, { target, skeleton: options.skeletonPath, allowLossy: options.allowLossy ?? false, transform, appearance: recipe }))
      .mapErr((message) => failure(message, "conversion"));
  if (converted.isErr()) return err(converted.error);
  if (options.signal.aborted) return cancelled();
  options.onProgress({ stage: "preview", message: "Building preview from converted game files" });
  const companion = converted.value.files.includes(skeletonPath) ? skeletonPath : null;
  const preview = await convertModelFiles(modelPath, previewPath, { skeleton: companion ?? undefined });
  if (preview.isErr()) return err(failure(preview.error, "conversion"));
  const inspected = await inspectModelFile(previewPath);
  if (inspected.isErr()) return err(failure(inspected.error, "conversion"));
  const inspection = inspectionSchema.safeParse(inspected.value);
  if (!inspection.success) return err(failure("Model inspection returned invalid animation information", "conversion"));
  if (!inspection.data.meshes.some((mesh) => mesh.primitives > 0 && mesh.vertices > 0))
    return err(failure("Conversion produced no drawable geometry. Check the selected Blender collection and exported meshes.", "conversion"));
  const clips = animationNames(inspection.data.animations);
  if (clips.isErr()) return err(clips.error);
  if (options.signal.aborted) return cancelled();
  if (input !== options.sourcePath) {
    const removed = await io(() => fs.rm(input), "Cannot remove intermediate Blender export");
    if (removed.isErr()) return err(removed.error);
  }
  options.onProgress({ stage: "complete", message: "Converted model ready for review" });
  return ok({ modelPath, skeletonPath: companion, previewPath, files: [...converted.value.files, previewPath],
    animationClips: clips.value, warnings: converted.value.warnings,
    animationEvents: inspection.data.animations.map((animation) => animation.events ?? []),
    materials: sourceMaterials.data.materialNames.map((name, index) => ({ name, index })) });
}
