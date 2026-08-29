import { err, ok, Result, ResultAsync } from "neverthrow";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import type { SkeletonResource } from "@/python/structSpecs/skeleton/skeletonInterface";
import type { BG3DGeometry, BG3DGroup, BG3DParseResult } from "@/modelParsers/parseBG3D";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { convertGltfAsset } from "./scriptAssetConversion";
import type {
  ScriptCustomObjectDefinition,
  ScriptWorkspaceState,
} from "./scriptWorkspaceStateTypes";

const MAX_ASSET_BYTES = 16 * 1024 * 1024;

interface ParsedAsset {
  readonly kind: "bg3d" | "3dmf" | "shapes" | "skeleton" | "gltf";
  readonly objectCount?: number;
  readonly animationCount?: number;
  readonly jointCount?: number;
  readonly limbCount?: number;
  readonly skeletonResource?: SkeletonResource;
}

function validateGeometry(
  geometry: BG3DGeometry,
  materialCount: number,
  path: string,
): readonly string[] {
  const errors: string[] = [];
  for (const materialIndex of geometry.layerMaterialNum.slice(0, geometry.numMaterials)) {
    if (
      !Number.isInteger(materialIndex) ||
      materialIndex < -1 ||
      (materialIndex !== -1 && materialIndex >= materialCount)
    ) {
      errors.push(
        `${path}: geometry references invalid material index ${String(materialIndex)} (available materials: ${String(materialCount)})`,
      );
    }
  }
  if (!geometry.vertices || !geometry.triangles) return errors;
  for (const triangle of geometry.triangles) {
    for (const vertexIndex of triangle) {
      if (
        !Number.isInteger(vertexIndex) ||
        vertexIndex < 0 ||
        vertexIndex >= geometry.vertices.length
      ) {
        errors.push(
          `${path}: geometry references invalid vertex index ${String(vertexIndex)} (available vertices: ${String(geometry.vertices.length)})`,
        );
      }
    }
  }
  return errors;
}

function validateGroup(
  group: BG3DGroup,
  materialCount: number,
  path: string,
): readonly string[] {
  return group.children.flatMap((child, index) => {
    const childPath = `${path}.child${String(index)}`;
    if ("children" in child) {
      return validateGroup(child, materialCount, childPath);
    }
    return validateGeometry(child, materialCount, childPath);
  });
}

export function validateParsedNativeModel(
  parsed: BG3DParseResult,
  path: string,
): readonly string[] {
  const materialErrors = parsed.materials.flatMap((material, materialIndex) => {
    const errors: string[] = [];
    if ((material.flags & 1) !== 0 && material.textures.length === 0) {
      errors.push(`${path}: material ${String(materialIndex)} is textured but has no texture data`);
    }
    for (const [textureIndex, texture] of material.textures.entries()) {
      const texturePath = `${path}.material${String(materialIndex)}.texture${String(textureIndex)}`;
      if (
        !Number.isInteger(texture.width) ||
        !Number.isInteger(texture.height) ||
        texture.width <= 0 ||
        texture.height <= 0
      ) {
        errors.push(`${texturePath}: texture dimensions must be positive integers`);
      }
      if (
        !Number.isInteger(texture.bufferSize) ||
        texture.bufferSize < 0 ||
        texture.pixels.byteLength !== texture.bufferSize
      ) {
        errors.push(`${texturePath}: texture byte length does not match its declared buffer size`);
      }
    }
    return errors;
  });
  return materialErrors.concat(parsed.groups.flatMap((group, index) =>
    validateGroup(group, parsed.materials.length, `${path}.group${String(index)}`),
  ));
}

export function validateScriptAssetPath(path: string): Result<true, string> {
  if (!path.startsWith("Data/Scripts/assets/")) {
    return err(`Custom asset path must be under Data/Scripts/assets/: ${path}`);
  }
  if (path.includes("\\") || path.includes("..")) {
    return err(`Custom asset path contains unsafe traversal characters: ${path}`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    return err(`Custom asset path contains an empty or relative segment: ${path}`);
  }
  return ok(true);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function assetKind(path: string): "bg3d" | "3dmf" | "shapes" | "skeleton" | "gltf" | null {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".bg3d")) return "bg3d";
  if (lowerPath.endsWith(".3dmf")) return "3dmf";
  if (lowerPath.endsWith(".shapes")) return "shapes";
  if (lowerPath.endsWith(".skeleton") || lowerPath.endsWith(".skeleton.rsrc")) return "skeleton";
  if (lowerPath.endsWith(".gltf") || lowerPath.endsWith(".glb")) return "gltf";
  return null;
}

function validateAssetBytes(path: string, bytes: Uint8Array): Result<ParsedAsset, string> {
  const pathResult = validateScriptAssetPath(path);
  if (pathResult.isErr()) return err(pathResult.error);
  const kind = assetKind(path);
  if (kind === null) return err(`Unsupported custom asset format: ${path}`);
  if (bytes.byteLength === 0) return err(`Custom asset is empty: ${path}`);
  if (bytes.byteLength > MAX_ASSET_BYTES) return err(`Custom asset exceeds 16 MiB: ${path}`);
  if (kind === "gltf") {
    return err(`glTF assets require asynchronous conversion preflight: ${path}`);
  }

  const buffer = toArrayBuffer(bytes);
  if (kind === "skeleton") {
    return err(`Skeleton resources require asynchronous validation preflight: ${path}`);
  }

  if (kind === "bg3d" || kind === "3dmf") {
    const parsed = Result.fromThrowable(
      () => kind === "bg3d" ? parseBG3D(buffer) : parse3DMF(buffer),
      () => `Could not read ${kind === "3dmf" ? "3DMF" : "BG3D"} asset: ${path}`,
    )();
    if (parsed.isErr()) return err(parsed.error);
    if (parsed.value.isErr()) return err(`${path}: ${parsed.value.error}`);
    const structuralErrors = validateParsedNativeModel(parsed.value.value, path);
    if (structuralErrors.length > 0) return err(structuralErrors.join("; "));
    return ok({
      kind,
      objectCount: parsed.value.value.groups.length,
      animationCount: parsed.value.value.skeleton?.numAnims,
      jointCount: parsed.value.value.skeleton?.numJoints,
      limbCount: parsed.value.value.skeleton?.num3DMFLimbs,
    });
  }

  const parsed = Result.fromThrowable(
    () => parseShapesFile(buffer),
    () => `Could not read Shapes asset: ${path}`,
  )();
  if (parsed.isErr()) return err(parsed.error);
  if (parsed.value.isErr()) return err(`${path}: ${parsed.value.error}`);
  return ok({ kind, objectCount: parsed.value.value.shapes.length });
}

async function validateAssetBytesAsync(
  path: string,
  bytes: Uint8Array,
): Promise<Result<ParsedAsset, string>> {
  const kind = assetKind(path);
  if (kind === "gltf") {
    const converted = await convertGltfAsset(path, bytes);
    if (converted.isErr()) return err(converted.error);
    const parsedNative = Result.fromThrowable(
      () => parseBG3D(toArrayBuffer(converted.value.nativeBytes)),
      () => `Could not read converted BG3D asset: ${path}`,
    )();
    if (parsedNative.isErr()) return err(parsedNative.error);
    if (parsedNative.value.isErr()) {
      return err(`${path}: converted BG3D is invalid: ${parsedNative.value.error}`);
    }
    const structuralErrors = validateParsedNativeModel(parsedNative.value.value, path);
    if (structuralErrors.length > 0) return err(structuralErrors.join("; "));
    return ok({
      kind: "gltf",
      objectCount: parsedNative.value.value.groups.length,
      animationCount: parsedNative.value.value.skeleton?.numAnims,
      jointCount: parsedNative.value.value.skeleton?.numJoints,
      limbCount: parsedNative.value.value.skeleton?.num3DMFLimbs,
    });
  }
  if (kind !== "skeleton") {
    return validateAssetBytes(path, bytes);
  }
  const pathResult = validateScriptAssetPath(path);
  if (pathResult.isErr()) return err(pathResult.error);
  if (bytes.byteLength === 0) return err(`Custom asset is empty: ${path}`);
  if (bytes.byteLength > MAX_ASSET_BYTES) {
    return err(`Custom asset exceeds 16 MiB: ${path}`);
  }

  const parsed = await ResultAsync.fromPromise(
    parseSkeletonRsrc(toArrayBuffer(bytes)),
    () => `Could not read skeleton resource: ${path}`,
  );
  if (parsed.isErr()) return err(parsed.error);
  if (Object.keys(parsed.value.Hedr).length === 0) {
    return err(`Skeleton resource has no header: ${path}`);
  }
  if (Object.keys(parsed.value.Bone).length === 0) {
    return err(`Skeleton resource has no bones: ${path}`);
  }
  const header = Object.values(parsed.value.Hedr)[0];
  if (!header) return err(`Skeleton resource has no readable header: ${path}`);
  if (
    !Number.isFinite(header.obj.numJoints) ||
    !Number.isInteger(header.obj.numJoints) ||
    header.obj.numJoints <= 0 ||
    !Number.isFinite(header.obj.numAnims) ||
    !Number.isInteger(header.obj.numAnims) ||
    header.obj.numAnims < 0 ||
    !Number.isFinite(header.obj.num3DMFLimbs) ||
    !Number.isInteger(header.obj.num3DMFLimbs) ||
    header.obj.num3DMFLimbs < 0
  ) {
    return err(`Skeleton resource has invalid header metadata: ${path}`);
  }
  return ok({
    kind,
    animationCount: header.obj.numAnims,
    jointCount: header.obj.numJoints,
    limbCount: header.obj.num3DMFLimbs,
    skeletonResource: parsed.value,
  });
}

function referencedAssetPaths(
  definition: ScriptCustomObjectDefinition,
): readonly string[] {
  if (definition.visual.kind === "customDisplayGroup") return [definition.visual.modelPath];
  if (definition.visual.kind === "customSkeleton") {
    return [definition.visual.modelPath, `${definition.visual.skeletonPath}.rsrc`];
  }
  return [];
}

function validateDefinitionAssets(
  definition: ScriptCustomObjectDefinition,
  assets: Readonly<Record<string, { readonly bytes: Uint8Array }>>,
  allowedKinds: readonly ("bg3d" | "3dmf" | "shapes" | "skeleton")[] | null,
): readonly string[] {
  const errors: string[] = [];
  for (const path of referencedAssetPaths(definition)) {
    const asset = assets[path];
    if (!asset) {
      errors.push(`Custom object '${definition.label}' references missing asset: ${path}`);
      continue;
    }
    const parsed = validateAssetBytes(path, asset.bytes);
    if (parsed.isErr()) {
      errors.push(`Custom object '${definition.label}': ${parsed.error}`);
      continue;
    }
    const isAllowedKind =
      parsed.value.kind !== "gltf" &&
      (allowedKinds === null || allowedKinds.includes(parsed.value.kind));
    if (allowedKinds !== null && !isAllowedKind) {
      errors.push(
        `Custom object '${definition.label}' uses ${parsed.value.kind} asset '${path}', which is unavailable for this game`,
      );
      continue;
    }
    if (
      definition.visual.kind === "customDisplayGroup" &&
      path === definition.visual.modelPath &&
      parsed.value.objectCount !== undefined &&
      definition.visual.modelObject >= parsed.value.objectCount
    ) {
      errors.push(
        `Custom object '${definition.label}' selects model object ${String(definition.visual.modelObject)}, but ${path} contains ${String(parsed.value.objectCount)} objects`,
      );
    }
  }
  return errors;
}

async function validateDefinitionAssetsAsync(
  definition: ScriptCustomObjectDefinition,
  assets: Readonly<Record<string, { readonly bytes: Uint8Array }>>,
  allowedKinds: readonly ("bg3d" | "3dmf" | "shapes" | "skeleton")[] | null,
): Promise<readonly string[]> {
  const errors: string[] = [];
  const parsedAssets = new Map<string, ParsedAsset>();
  for (const path of referencedAssetPaths(definition)) {
    const asset = assets[path];
    if (!asset) {
      errors.push(`Custom object '${definition.label}' references missing asset: ${path}`);
      continue;
    }
    const parsed = await validateAssetBytesAsync(path, asset.bytes);
    if (parsed.isErr()) {
      errors.push(`Custom object '${definition.label}': ${parsed.error}`);
      continue;
    }
    parsedAssets.set(path, parsed.value);
    const isAllowedKind =
      parsed.value.kind !== "gltf" &&
      (allowedKinds === null || allowedKinds.includes(parsed.value.kind));
    if (allowedKinds !== null && !isAllowedKind) {
      errors.push(
        `Custom object '${definition.label}' uses ${parsed.value.kind} asset '${path}', which is unavailable for this game`,
      );
      continue;
    }
    if (
      definition.visual.kind === "customDisplayGroup" &&
      path === definition.visual.modelPath &&
      parsed.value.objectCount !== undefined &&
      definition.visual.modelObject >= parsed.value.objectCount
    ) {
      errors.push(
        `Custom object '${definition.label}' selects model object ${String(definition.visual.modelObject)}, but ${path} contains ${String(parsed.value.objectCount)} objects`,
      );
    }
    if (
      definition.visual.kind === "customSkeleton" &&
      path === `${definition.visual.skeletonPath}.rsrc` &&
      parsed.value.animationCount !== undefined
    ) {
      const animationCount = parsed.value.animationCount;
      const initialAnimationIndex =
        definition.visual.animations[definition.visual.initialAnimation];
      if (initialAnimationIndex === undefined) {
        errors.push(
          `Custom object '${definition.label}' selects missing initial animation '${definition.visual.initialAnimation}'`,
        );
      }
      for (const [animationName, animationIndex] of Object.entries(
        definition.visual.animations,
      )) {
        if (animationIndex >= animationCount) {
          errors.push(
            `Custom object '${definition.label}' maps animation '${animationName}' to index ${String(animationIndex)}, but the skeleton contains ${String(animationCount)} animations`,
          );
        }
      }
    }
  }
  if (definition.visual.kind === "customSkeleton") {
    const modelPath = definition.visual.modelPath;
    const skeletonPath = `${definition.visual.skeletonPath}.rsrc`;
    const model = parsedAssets.get(modelPath);
    const skeleton = parsedAssets.get(skeletonPath);
    if (model && skeleton) {
      const modelAsset = assets[modelPath];
      const skeletonResource = skeleton.skeletonResource;
      if (
        modelAsset &&
        skeletonResource &&
        (model.kind === "bg3d" || model.kind === "3dmf")
      ) {
        const pairedParse = parseBG3DWithSkeletonResource(
          toArrayBuffer(modelAsset.bytes),
          skeletonResource,
        );
        if (pairedParse.isErr()) {
          errors.push(
            `Custom object '${definition.label}' cannot load model ${modelPath} with skeleton ${skeletonPath}: ${pairedParse.error}`,
          );
        }
      }
      if (
        model.jointCount !== undefined &&
        skeleton.jointCount !== undefined &&
        model.jointCount > 0 &&
        skeleton.jointCount > 0 &&
        model.jointCount !== skeleton.jointCount
      ) {
        errors.push(
          `Custom object '${definition.label}' uses incompatible model and skeleton assets: ${modelPath} has ${String(model.jointCount)} joints, but ${skeletonPath} has ${String(skeleton.jointCount)}`,
        );
      }
      if (
        model.limbCount !== undefined &&
        skeleton.limbCount !== undefined &&
        model.limbCount > 0 &&
        skeleton.limbCount > 0 &&
        model.limbCount !== skeleton.limbCount
      ) {
        errors.push(
          `Custom object '${definition.label}' uses incompatible model and skeleton assets: ${modelPath} has ${String(model.limbCount)} limbs, but ${skeletonPath} has ${String(skeleton.limbCount)}`,
        );
      }
      if (
        model.animationCount !== undefined &&
        skeleton.animationCount !== undefined &&
        model.animationCount > 0 &&
        skeleton.animationCount > 0 &&
        model.animationCount !== skeleton.animationCount
      ) {
        errors.push(
          `Custom object '${definition.label}' uses incompatible animation tables: ${modelPath} has ${String(model.animationCount)} animations, but ${skeletonPath} has ${String(skeleton.animationCount)}`,
        );
      }
    }
  }
  return errors;
}

export function validateScriptWorkspaceAssets(
  state: Pick<ScriptWorkspaceState, "customObjects" | "assets"> &
    Partial<Pick<ScriptWorkspaceState, "context">>,
): Result<true, string> {
  const errors = Object.values(state.assets).flatMap((asset) => {
    const parsed = validateAssetBytes(asset.path, asset.bytes);
    return parsed.isErr() ? [parsed.error] : [];
  });
  const allowedKinds = state.context
    ? (SCRIPTING_CONTRACT.games[state.context.gameId]?.assetKinds ?? null)
    : null;
  for (const definition of state.customObjects) {
    errors.push(
      ...validateDefinitionAssets(definition, state.assets, allowedKinds),
    );
  }
  return errors.length > 0 ? err(errors.join("; ")) : ok(true);
}

export async function validateScriptWorkspaceAssetsAsync(
  state: Pick<ScriptWorkspaceState, "customObjects" | "assets"> &
    Partial<Pick<ScriptWorkspaceState, "context">>,
): Promise<Result<true, string>> {
  const errors: string[] = [];
  for (const asset of Object.values(state.assets)) {
    const parsed = await validateAssetBytesAsync(asset.path, asset.bytes);
    if (parsed.isErr()) errors.push(parsed.error);
  }
  const allowedKinds = state.context
    ? (SCRIPTING_CONTRACT.games[state.context.gameId]?.assetKinds ?? null)
    : null;
  for (const definition of state.customObjects) {
    errors.push(
      ...(await validateDefinitionAssetsAsync(
        definition,
        state.assets,
        allowedKinds,
      )),
    );
  }
  return errors.length > 0 ? err(errors.join("; ")) : ok(true);
}

export function validateUploadedScriptAsset(
  path: string,
  bytes: Uint8Array,
): Result<true, string> {
  return validateAssetBytes(path, bytes).map(() => true);
}

export async function validateUploadedScriptAssetAsync(
  path: string,
  bytes: Uint8Array,
): Promise<Result<true, string>> {
  return (await validateAssetBytesAsync(path, bytes)).map(() => true);
}

export function validateScriptPackageAssets(
  files: Readonly<Record<string, Uint8Array>>,
): Result<true, string> {
  const errors: string[] = [];
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith("Data/Scripts/assets/")) continue;
    const parsed = validateAssetBytes(path, bytes);
    if (parsed.isErr()) errors.push(parsed.error);
  }
  return errors.length > 0 ? err(errors.join("; ")) : ok(true);
}

export async function validateScriptPackageAssetsAsync(
  files: Readonly<Record<string, Uint8Array>>,
): Promise<Result<true, string>> {
  const errors: string[] = [];
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith("Data/Scripts/assets/")) continue;
    const parsed = await validateAssetBytesAsync(path, bytes);
    if (parsed.isErr()) errors.push(parsed.error);
  }
  return errors.length > 0 ? err(errors.join("; ")) : ok(true);
}
