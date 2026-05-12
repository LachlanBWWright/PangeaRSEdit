import {
  Document,
  MathUtils,
  Primitive,
  WebIO,
  type Node,
} from "@gltf-transform/core";
import {
  clearNodeTransform,
  convertPrimitiveToTriangles,
  flatten,
} from "@gltf-transform/functions";
import { err, ok, Result, ResultAsync, type Result as ResultType } from "neverthrow";
import { z } from "zod";
import { mapErr } from "@/utils/mapErr";

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const gltfBufferSchema = z.object({
  byteLength: z.number().int().nonnegative(),
  uri: z.string().optional(),
}).passthrough();

const gltfImageSchema = z.object({
  uri: z.string().optional(),
  bufferView: z.number().int().nonnegative().optional(),
}).passthrough();

const gltfJsonSchema = z.object({
  asset: z.object({
    version: z.string().min(1),
  }).passthrough(),
  buffers: z.array(gltfBufferSchema).optional(),
  images: z.array(gltfImageSchema).optional(),
  extensionsUsed: z.array(z.string().min(1)).optional(),
  extensionsRequired: z.array(z.string().min(1)).optional(),
}).passthrough();

type ParsedGltfJson = z.infer<typeof gltfJsonSchema>;

export interface GltfCompatibilityWarning {
  readonly code:
    | "extensions.optional"
    | "materials.unsupported"
    | "scenes.multiple"
    | "scene.cameras"
    | "primitives.triangulated"
    | "primitives.dropped"
    | "primitives.extra-uvs"
    | "primitives.tangents"
    | "primitives.morph-targets"
    | "primitives.extra-skinning"
    | "animations.unsupported"
    | "nodes.transform-animation";
  readonly message: string;
  readonly count?: number;
  readonly details?: readonly string[];
}

export interface GltfCompatibilityError {
  readonly code:
    | "gltf.invalid-json"
    | "gltf.read-failed"
    | "gltf.missing-dependency"
    | "gltf.unsupported-required-extension"
    | "gltf.no-convertible-meshes";
  readonly message: string;
}

export interface CompatibleGltfAsset {
  readonly document: Document;
  readonly normalizedGlb: ArrayBuffer;
  readonly warnings: readonly GltfCompatibilityWarning[];
  readonly sourceFormat: "glb" | "gltf";
}

function compatibilityError(
  code: GltfCompatibilityError["code"],
  message: string,
): GltfCompatibilityError {
  return { code, message };
}

function isGlbBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }
  return new DataView(buffer).getUint32(0, true) === 0x46546c67;
}

function isDataUri(uri: string): boolean {
  return uri.startsWith("data:");
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (const [index, character] of Array.from(binary).entries()) {
    bytes[index] = character.charCodeAt(0);
  }
  return bytes;
}

function decodeDataUri(
  uri: string,
): ResultType<Uint8Array, GltfCompatibilityError> {
  const match = /^data:([^,]*?),(.*)$/s.exec(uri);
  if (!match) {
    return err(
      compatibilityError(
        "gltf.missing-dependency",
        `Unsupported embedded data URI: ${uri.slice(0, 32)}...`,
      ),
    );
  }

  const metadata = match[1] ?? "";
  const payload = match[2] ?? "";
  if (metadata.includes(";base64")) {
    return ok(decodeBase64ToBytes(payload));
  }

  const decoded = decodeURIComponent(payload);
  return ok(new TextEncoder().encode(decoded));
}

function parseGltfJson(buffer: ArrayBuffer): ResultAsync<ParsedGltfJson, GltfCompatibilityError> {
  const text = new TextDecoder().decode(new Uint8Array(buffer));
  return ResultAsync.fromPromise(
    Promise.resolve().then(() => JSON.parse(text)),
    () =>
      compatibilityError(
        "gltf.invalid-json",
        "The .gltf file could not be parsed as JSON",
      ),
  ).andThen((value) => {
    const parsed = gltfJsonSchema.safeParse(value);
    if (!parsed.success) {
      return ResultAsync.fromPromise(
        Promise.reject(parsed.error),
        () =>
          compatibilityError(
            "gltf.invalid-json",
            "The .gltf file is missing required glTF fields",
          ),
      );
    }
    return ResultAsync.fromPromise(Promise.resolve(parsed.data), () =>
      compatibilityError("gltf.invalid-json", "Failed to validate the .gltf file"),
    );
  });
}

function getOptionalExtensionWarnings(
  json: ParsedGltfJson,
): readonly GltfCompatibilityWarning[] {
  const used = new Set(json.extensionsUsed ?? []);
  const required = new Set(json.extensionsRequired ?? []);
  const ignoredExtensions = [...used].filter((extensionName) => {
    if (required.has(extensionName)) {
      return false;
    }
    return (
      extensionName === "EXT_mesh_gpu_instancing" ||
      extensionName === "KHR_lights_punctual" ||
      extensionName === "KHR_texture_transform" ||
      extensionName.startsWith("KHR_materials_")
    );
  });

  if (ignoredExtensions.length === 0) {
    return [];
  }

  return [
    {
      code: "extensions.optional",
      message:
        "Ignored optional glTF extensions that do not map to BG3D/3DMF cleanly.",
      count: ignoredExtensions.length,
      details: ignoredExtensions,
    },
  ];
}

function getUnsupportedRequiredExtension(
  json: ParsedGltfJson,
): string | undefined {
  return (json.extensionsRequired ?? []).find(
    (extensionName) =>
      extensionName === "EXT_mesh_gpu_instancing" ||
      extensionName === "KHR_draco_mesh_compression" ||
      extensionName === "KHR_lights_punctual" ||
      extensionName === "KHR_texture_transform" ||
      (extensionName.startsWith("KHR_materials_") &&
        extensionName !== "KHR_materials_unlit"),
  );
}

async function collectInlineResources(
  json: ParsedGltfJson,
): Promise<Result<Record<string, Uint8Array>, GltfCompatibilityError>> {
  const resources: Record<string, Uint8Array> = {};
  const uris = new Set<string>();

  for (const buffer of json.buffers ?? []) {
    if (!buffer.uri) {
      return err(
        compatibilityError(
          "gltf.missing-dependency",
          "The .gltf file references a missing buffer resource",
        ),
      );
    }
    uris.add(buffer.uri);
  }

  for (const image of json.images ?? []) {
    if (image.uri) {
      uris.add(image.uri);
      continue;
    }
    if (image.bufferView === undefined) {
      return err(
        compatibilityError(
          "gltf.missing-dependency",
          "The .gltf file references an image with no embedded or external data",
        ),
      );
    }
  }

  for (const uri of uris) {
    if (!isDataUri(uri)) {
      return err(
        compatibilityError(
          "gltf.missing-dependency",
          `The .gltf file requires an external resource that is not uploaded: ${uri}`,
        ),
      );
    }
    const decoded = decodeDataUri(uri);
    if (decoded.isErr()) {
      return err(decoded.error);
    }
    resources[uri] = decoded.value;
  }

  return ok(resources);
}

function collectAnimatedNodes(document: Document): Set<Node> {
  const animatedNodes = new Set<Node>();
  for (const animation of document.getRoot().listAnimations()) {
    for (const channel of animation.listChannels()) {
      const node = channel.getTargetNode();
      if (node && channel.getTargetPath() !== "weights") {
        animatedNodes.add(node);
      }
    }
  }
  return animatedNodes;
}

function hasLocalTransform(node: Node): boolean {
  return !MathUtils.eq(node.getMatrix(), IDENTITY_MATRIX);
}

async function normalizeSceneGraph(
  document: Document,
): Promise<readonly GltfCompatibilityWarning[]> {
  const warnings: GltfCompatibilityWarning[] = [];
  const root = document.getRoot();
  const defaultScene = root.getDefaultScene() ?? root.listScenes()[0] ?? null;

  if (defaultScene && root.getDefaultScene() === null) {
    root.setDefaultScene(defaultScene);
  }

  if (root.listScenes().length > 1) {
    warnings.push({
      code: "scenes.multiple",
      message: "Used the default scene and ignored additional scenes.",
      count: root.listScenes().length - 1,
    });
  }

  if (root.listCameras().length > 0) {
    warnings.push({
      code: "scene.cameras",
      message: "Ignored glTF cameras during BG3D/3DMF conversion.",
      count: root.listCameras().length,
    });
  }

  const animatedNodes = collectAnimatedNodes(document);
  let animatedTransformCount = 0;

  await document.transform(flatten({ cleanup: false }));

  for (const scene of root.listScenes()) {
    scene.traverse((node) => {
      if (!node.getMesh() || !hasLocalTransform(node)) {
        return;
      }
      if (node.getSkin() || animatedNodes.has(node)) {
        animatedTransformCount += 1;
        return;
      }
      clearNodeTransform(node);
    });
  }

  if (animatedTransformCount > 0) {
    warnings.push({
      code: "nodes.transform-animation",
      message:
        "Some animated or skinned node transforms could not be baked safely and may be simplified.",
      count: animatedTransformCount,
    });
  }

  return warnings;
}

function collectMaterialWarnings(document: Document): readonly GltfCompatibilityWarning[] {
  let unsupportedMaterialCount = 0;
  const details = new Set<string>();

  for (const material of document.getRoot().listMaterials()) {
    if (material.getNormalTexture()) {
      unsupportedMaterialCount += 1;
      details.add("normal maps");
    }
    if (material.getEmissiveTexture()) {
      unsupportedMaterialCount += 1;
      details.add("emissive maps");
    }
    if (material.getOcclusionTexture()) {
      unsupportedMaterialCount += 1;
      details.add("occlusion maps");
    }
    if (material.getMetallicRoughnessTexture()) {
      unsupportedMaterialCount += 1;
      details.add("metallic/roughness maps");
    }
    if (
      material.getMetallicFactor() !== 1 ||
      material.getRoughnessFactor() !== 1
    ) {
      unsupportedMaterialCount += 1;
      details.add("metallic/roughness factors");
    }
    if (material.getEmissiveFactor().some((component) => component !== 0)) {
      unsupportedMaterialCount += 1;
      details.add("emissive factors");
    }
  }

  if (unsupportedMaterialCount === 0) {
    return [];
  }

  return [
    {
      code: "materials.unsupported",
      message:
        "Kept base color inputs and ignored richer glTF material features that do not map to BG3D/3DMF.",
      count: unsupportedMaterialCount,
      details: [...details],
    },
  ];
}

function normalizePrimitives(
  document: Document,
): ResultType<readonly GltfCompatibilityWarning[], GltfCompatibilityError> {
  let triangulatedCount = 0;
  let droppedCount = 0;
  let extraUvCount = 0;
  let tangentCount = 0;
  let morphTargetCount = 0;
  let extraSkinningCount = 0;
  let supportedPrimitiveCount = 0;

  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of [...mesh.listPrimitives()]) {
      if (
        primitive.getMode() === Primitive.Mode.TRIANGLE_FAN ||
        primitive.getMode() === Primitive.Mode.TRIANGLE_STRIP
      ) {
        const convertResult = Result.fromThrowable(
          () => convertPrimitiveToTriangles(primitive),
          mapErr,
        )();
        if (convertResult.isErr()) {
          mesh.removePrimitive(primitive);
          droppedCount += 1;
          continue;
        }
        triangulatedCount += 1;
      }

      if (
        primitive.getMode() !== Primitive.Mode.TRIANGLES ||
        primitive.getAttribute("POSITION") === null
      ) {
        mesh.removePrimitive(primitive);
        droppedCount += 1;
        continue;
      }

      supportedPrimitiveCount += 1;

      const semantics = primitive.listSemantics();
      if (
        semantics.some(
          (semantic) => semantic.startsWith("TEXCOORD_") && semantic !== "TEXCOORD_0",
        )
      ) {
        extraUvCount += 1;
      }
      if (semantics.includes("TANGENT")) {
        tangentCount += 1;
      }
      if (
        semantics.some(
          (semantic) =>
            (semantic.startsWith("JOINTS_") && semantic !== "JOINTS_0") ||
            (semantic.startsWith("WEIGHTS_") && semantic !== "WEIGHTS_0"),
        )
      ) {
        extraSkinningCount += 1;
      }
      if (primitive.listTargets().length > 0) {
        morphTargetCount += 1;
      }
    }
  }

  if (supportedPrimitiveCount === 0) {
    return err(
      compatibilityError(
        "gltf.no-convertible-meshes",
        "The glTF asset does not contain any triangle mesh primitives that can be converted",
      ),
    );
  }

  const warnings: GltfCompatibilityWarning[] = [];
  if (triangulatedCount > 0) {
    warnings.push({
      code: "primitives.triangulated",
      message: "Triangulated strip/fan primitives before conversion.",
      count: triangulatedCount,
    });
  }
  if (droppedCount > 0) {
    warnings.push({
      code: "primitives.dropped",
      message:
        "Ignored primitives that could not be converted to BG3D/3DMF triangles.",
      count: droppedCount,
    });
  }
  if (extraUvCount > 0) {
    warnings.push({
      code: "primitives.extra-uvs",
      message: "Ignored extra UV sets beyond TEXCOORD_0.",
      count: extraUvCount,
    });
  }
  if (tangentCount > 0) {
    warnings.push({
      code: "primitives.tangents",
      message: "Ignored tangent attributes.",
      count: tangentCount,
    });
  }
  if (morphTargetCount > 0) {
    warnings.push({
      code: "primitives.morph-targets",
      message: "Ignored morph targets.",
      count: morphTargetCount,
    });
  }
  if (extraSkinningCount > 0) {
    warnings.push({
      code: "primitives.extra-skinning",
      message: "Ignored extra skinning attribute sets beyond JOINTS_0/WEIGHTS_0.",
      count: extraSkinningCount,
    });
  }

  return ok(warnings);
}

function collectAnimationWarnings(document: Document): readonly GltfCompatibilityWarning[] {
  let unsupportedAnimationCount = 0;
  for (const animation of document.getRoot().listAnimations()) {
    for (const channel of animation.listChannels()) {
      if (channel.getTargetPath() === "weights") {
        unsupportedAnimationCount += 1;
      }
    }
  }

  if (unsupportedAnimationCount === 0) {
    return [];
  }

  return [
    {
      code: "animations.unsupported",
      message: "Ignored unsupported animation channels during conversion.",
      count: unsupportedAnimationCount,
    },
  ];
}

function cloneGlbBytes(bytes: Uint8Array): ArrayBuffer {
  const clone = new Uint8Array(bytes.byteLength);
  clone.set(bytes);
  return clone.buffer;
}

async function readDocument(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<Result<{ json: ParsedGltfJson; document: Document; sourceFormat: "glb" | "gltf" }, GltfCompatibilityError>> {
  const io = new WebIO();

  if (isGlbBuffer(buffer)) {
    const jsonResult = await ResultAsync.fromPromise(
      io.binaryToJSON(new Uint8Array(buffer)),
      () =>
        compatibilityError(
          "gltf.read-failed",
          `Failed to inspect glTF metadata from ${fileName}`,
        ),
    );
    if (jsonResult.isErr()) {
      return err(jsonResult.error);
    }
    const parsedJson = gltfJsonSchema.safeParse(jsonResult.value.json);
    if (!parsedJson.success) {
      return err(
        compatibilityError(
          "gltf.invalid-json",
          "The GLB file does not contain a valid glTF JSON chunk",
        ),
      );
    }
    const unsupportedRequiredExtension = getUnsupportedRequiredExtension(
      parsedJson.data,
    );
    if (unsupportedRequiredExtension) {
      return err(
        compatibilityError(
          "gltf.unsupported-required-extension",
          `The glTF asset requires an unsupported extension: ${unsupportedRequiredExtension}`,
        ),
      );
    }
    const documentResult = await ResultAsync.fromPromise(
      io.readJSON(jsonResult.value),
      () =>
        compatibilityError(
          "gltf.read-failed",
          `Failed to read glTF/GLB data from ${fileName}`,
        ),
    );
    if (documentResult.isErr()) {
      return err(documentResult.error);
    }
    return ok({
      json: parsedJson.data,
      document: documentResult.value,
      sourceFormat: "glb",
    });
  }

  const jsonResult = await parseGltfJson(buffer);
  if (jsonResult.isErr()) {
    return err(jsonResult.error);
  }
  const unsupportedRequiredExtension = getUnsupportedRequiredExtension(
    jsonResult.value,
  );
  if (unsupportedRequiredExtension) {
    return err(
      compatibilityError(
        "gltf.unsupported-required-extension",
        `The glTF asset requires an unsupported extension: ${unsupportedRequiredExtension}`,
      ),
    );
  }

  const resourcesResult = await collectInlineResources(jsonResult.value);
  if (resourcesResult.isErr()) {
    return err(resourcesResult.error);
  }

  const documentResult = await ResultAsync.fromPromise(
    io.readJSON({
      json: jsonResult.value,
      resources: resourcesResult.value,
    }),
    () =>
      compatibilityError(
        "gltf.read-failed",
        `Failed to read glTF data from ${fileName}`,
      ),
  );
  if (documentResult.isErr()) {
    return err(documentResult.error);
  }

  return ok({
    json: jsonResult.value,
    document: documentResult.value,
    sourceFormat: "gltf",
  });
}

export async function normalizeGltfAsset(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<Result<CompatibleGltfAsset, GltfCompatibilityError>> {
  const readResult = await readDocument(fileName, buffer);
  if (readResult.isErr()) {
    return err(readResult.error);
  }

  const unsupportedRequiredExtension = getUnsupportedRequiredExtension(
    readResult.value.json,
  );
  if (unsupportedRequiredExtension) {
    return err(
      compatibilityError(
        "gltf.unsupported-required-extension",
        `The glTF asset requires an unsupported extension: ${unsupportedRequiredExtension}`,
      ),
    );
  }

  const warnings: GltfCompatibilityWarning[] = [
    ...getOptionalExtensionWarnings(readResult.value.json),
    ...collectMaterialWarnings(readResult.value.document),
    ...collectAnimationWarnings(readResult.value.document),
  ];
  warnings.push(...(await normalizeSceneGraph(readResult.value.document)));

  const primitiveWarnings = normalizePrimitives(readResult.value.document);
  if (primitiveWarnings.isErr()) {
    return err(primitiveWarnings.error);
  }
  warnings.push(...primitiveWarnings.value);

  const glbResult = await ResultAsync.fromPromise(
    new WebIO().writeBinary(readResult.value.document),
    () =>
      compatibilityError(
        "gltf.read-failed",
        `Failed to serialize normalized GLB data for ${fileName}`,
      ),
  );
  if (glbResult.isErr()) {
    return err(glbResult.error);
  }

  return ok({
    document: readResult.value.document,
    normalizedGlb: cloneGlbBytes(glbResult.value),
    warnings,
    sourceFormat: readResult.value.sourceFormat,
  });
}

export function formatGltfCompatibilityWarnings(
  warnings: readonly GltfCompatibilityWarning[],
): string[] {
  return warnings.map((warning) => {
    const countSuffix =
      warning.count !== undefined ? ` (${warning.count})` : "";
    const detailSuffix =
      warning.details && warning.details.length > 0
        ? ` ${warning.details.join(", ")}.`
        : "";
    return `${warning.message}${countSuffix}.${detailSuffix}`.replace(/\.\./g, ".");
  });
}
