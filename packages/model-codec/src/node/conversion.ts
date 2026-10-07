import { basename, extname, resolve } from "node:path";
import { Document } from "@gltf-transform/core";
import { errAsync, ok, okAsync, type ResultAsync } from "neverthrow";
import { bg3dParsedToGLTF, gltfToBG3D } from "../modelParsers/parsedBg3dGitfConverter";
import { bg3dParsedToBG3D, type BG3DParseResult } from "../modelParsers/parseBG3D";
import { bg3dParsedTo3DMF } from "../modelParsers/parse3dmf";
import { bg3dSkeletonToSkeletonResource } from "../modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "../modelParsers/skeletonBinaryExport";
import { BG3D_EXPORT_TARGETS } from "../modelParsers/bg3dExportTargets";
import { nativeFormat, readNativeAsset, isSkeletonPath } from "./native";
import { prepareGltfFiles, prepareNativeDocument, readGltf, type OutputFile } from "./gltf";
import { writeOutputFiles } from "./files";

export interface ModelConversionOptions {
  readonly skeleton?: string;
  readonly model?: string;
  readonly skeletonOutput?: string;
  readonly target?: string;
  readonly allowLossy?: boolean;
  readonly force?: boolean;
}
export interface ModelConversionReport { readonly files: readonly string[]; readonly warnings: readonly string[]; }
interface LoadedModel { readonly document: Document; readonly parsed?: BG3DParseResult; readonly inputs: readonly string[]; }

function loadModel(input: string, options: ModelConversionOptions): ResultAsync<LoadedModel, string> {
  if (nativeFormat(input) || isSkeletonPath(input)) return readNativeAsset(input, options).map((asset) => ({ document: bg3dParsedToGLTF(asset.parsed), parsed: asset.parsed, inputs: asset.inputs }));
  if (![".gltf", ".glb"].includes(extname(input).toLowerCase())) return errAsync(`Unsupported input format: ${input}`);
  if (options.model || options.skeleton) return errAsync("glTF already contains its geometry and skin. --model/--skeleton apply to native inputs.");
  return readGltf(input).map((document) => ({ document, inputs: [input] }));
}

function prepareNativeFiles(parsed: BG3DParseResult, output: string, options: ModelConversionOptions): ResultAsync<readonly OutputFile[], string> {
  const format = nativeFormat(output);
  if (!format) return errAsync("Native output must be .bg3d, .3dmf or .3df.");
  const targetId = options.target ?? (format === "3dmf" ? "bugdom" : "ottomatic");
  const target = BG3D_EXPORT_TARGETS.find((candidate) => candidate.id === targetId);
  if (!target) return errAsync(`Unknown target '${targetId}'. Choose ${BG3D_EXPORT_TARGETS.map((candidate) => candidate.id).join(", ")}.`);
  if ((target.companionExtension === "bg3d") !== (format === "bg3d")) return errAsync(`Target ${targetId} requires ${target.companionExtension === "bg3d" ? "BG3D" : "3DMF"} geometry.`);
  const bytes = format === "bg3d" ? ok(bg3dParsedToBG3D(parsed)) : bg3dParsedTo3DMF(parsed);
  if (bytes.isErr()) return errAsync(bytes.error);
  const files: OutputFile[] = [{ path: output, bytes: new Uint8Array(bytes.value) }];
  if (!parsed.skeleton) return options.skeletonOutput ? errAsync("The input has no skeleton to export.") : okAsync(files);
  const stem = basename(output, extname(output));
  const resource = bg3dSkeletonToSkeletonResource(parsed.skeleton, undefined, undefined, undefined, undefined, stem, target);
  const skeletonBytes = skeletonResourceToBinary(resource);
  if (skeletonBytes.isErr()) return errAsync(skeletonBytes.error);
  files.push({ path: options.skeletonOutput ?? output.slice(0, -extname(output).length) + ".skeleton.rsrc", bytes: new Uint8Array(skeletonBytes.value) });
  return okAsync(files);
}

export function convertModelFiles(input: string, output: string, options: ModelConversionOptions = {}): ResultAsync<ModelConversionReport, string> {
  if (resolve(input) === resolve(output)) return errAsync("Input and output must be different files.");
  const outputExtension = extname(output).toLowerCase();
  if (!nativeFormat(output) && outputExtension !== ".glb" && outputExtension !== ".gltf") return errAsync(`Unsupported output format: ${output}`);
  if (!nativeFormat(output) && (options.skeletonOutput || options.target)) return errAsync("--target and --skeleton-output apply only to native output.");
  return loadModel(input, options).andThen((asset) => {
    if (!nativeFormat(output)) return prepareGltfFiles(asset.document, output).andThen((files) => writeOutputFiles(files, asset.inputs, options.force ?? false)).map((files) => ({ files, warnings: [] }));
    const normalized = asset.parsed ? okAsync({ document: asset.document, warnings: [] }) : prepareNativeDocument(asset.document, options.allowLossy ?? false);
    return normalized.andThen((prepared) => prepareNativeFiles(asset.parsed ?? gltfToBG3D(prepared.document), output, options)
      .andThen((files) => writeOutputFiles(files, asset.inputs, options.force ?? false))
      .map((files) => ({ files, warnings: prepared.warnings })));
  });
}

export function inspectModelFile(input: string, options: ModelConversionOptions = {}): ResultAsync<Record<string, unknown>, string> {
  return loadModel(input, options).map((asset) => {
    const root = asset.document.getRoot();
    return {
      input, companions: asset.inputs.filter((path) => path !== input),
      scenes: root.listScenes().length,
      meshes: root.listMeshes().map((mesh) => ({ name: mesh.getName(), primitives: mesh.listPrimitives().length, vertices: mesh.listPrimitives().reduce((count, primitive) => count + (primitive.getAttribute("POSITION")?.getCount() ?? 0), 0) })),
      materials: root.listMaterials().length, textures: root.listTextures().length,
      skins: root.listSkins().map((skin) => ({ name: skin.getName(), joints: skin.listJoints().length })),
      animations: root.listAnimations().map((animation) => ({ name: animation.getName(), channels: animation.listChannels().length })),
    };
  });
}
