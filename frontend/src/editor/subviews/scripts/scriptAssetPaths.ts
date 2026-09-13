import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

export interface ScriptAssetPaths {
  readonly assetPath: string;
  readonly manifestPath: string;
  readonly sourcePath?: string;
}

function sanitizeAssetFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
}

export function buildScriptAssetPaths(
  definition: ScriptCustomObjectDefinition,
  fileName: string,
  role: "model" | "skeleton",
): ScriptAssetPaths | null {
  const sanitized = sanitizeAssetFileName(fileName);
  const lowerName = sanitized.toLowerCase();
  if (role === "model") {
    const isNativeModel = lowerName.endsWith(".bg3d") || lowerName.endsWith(".3dmf") || lowerName.endsWith(".shapes");
    const isModernModel = lowerName.endsWith(".gltf") || lowerName.endsWith(".glb");
    if (!isNativeModel && !isModernModel) return null;
    if (definition.visual.kind === "customSkeleton" && !lowerName.endsWith(".bg3d") && !lowerName.endsWith(".3dmf")) {
      return null;
    }
    const directory = definition.visual.kind === "customSkeleton" ? "skeletons" : "models";
    if (isModernModel) {
      const stem = sanitized.replace(/\.(?:gltf|glb)$/i, "");
      if (stem.length === 0) return null;
      const extension = lowerName.endsWith(".glb") ? "glb" : "gltf";
      const nativePath = `Data/Scripts/assets/${directory}/${stem}-${extension}.bg3d`;
      return {
        assetPath: nativePath,
        manifestPath: nativePath,
        sourcePath: `Data/Scripts/assets/source/${stem}.${extension}`,
      };
    }
    const path = `Data/Scripts/assets/${directory}/${sanitized}`;
    return { assetPath: path, manifestPath: path };
  }
  if (!sanitized.endsWith(".rsrc")) return null;
  const baseName = sanitized.replace(/(?:\.skeleton)?\.rsrc$/i, "");
  const manifestPath = `Data/Scripts/assets/skeletons/${baseName}.skeleton`;
  return { assetPath: `${manifestPath}.rsrc`, manifestPath };
}

export function applyUploadedAssetPath(
  definition: ScriptCustomObjectDefinition,
  path: string,
  role: "model" | "skeleton",
): ScriptCustomObjectDefinition {
  if (definition.visual.kind === "customDisplayGroup" && role === "model") {
    return { ...definition, visual: { ...definition.visual, modelPath: path } };
  }
  if (definition.visual.kind !== "customSkeleton") return definition;
  return role === "model"
    ? { ...definition, visual: { ...definition.visual, modelPath: path } }
    : { ...definition, visual: { ...definition.visual, skeletonPath: path } };
}
