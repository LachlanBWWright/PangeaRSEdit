import type { AnimationInfo, ModelSourceKind } from "@/components/AnimationViewer";
import type { ModelNode } from "@/pages/ModelViewer/types";
import type { SkinWeightsData } from "@/modelEditing/weights/weightTypes";

export function getModelSourceKind(fileName: string): ModelSourceKind {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".3dmf")) return "3dmf";
  if (lowerName.endsWith(".bg3d")) return "bg3d";
  if (lowerName.endsWith(".glb")) return "glb";
  return "unknown";
}

export function renameAnimationBone(
  animation: AnimationInfo,
  currentName: string,
  nextName: string,
): AnimationInfo {
  const cloned = animation.clip.clone();
  cloned.tracks.forEach((track) => {
    if (track.name.startsWith(`${currentName}.`)) {
      track.name = `${nextName}.${track.name.slice(currentName.length + 1)}`;
    }
  });
  return { ...animation, clip: cloned };
}

export function renameModelNodeBone(
  node: ModelNode,
  currentName: string,
  nextName: string,
): ModelNode {
  return {
    ...node,
    name: node.name === currentName ? nextName : node.name,
    children: node.children?.map((child) =>
      renameModelNodeBone(child, currentName, nextName),
    ),
  };
}

export function collectBoneRows(
  scene: import("three").Group | undefined,
  skinData: SkinWeightsData | null,
  collectWeightedRows: (
    scene: import("three").Group | undefined,
  ) => { boneName: string; vertexCount: number; weightedSum: number }[],
  collectWeightedRowsFromSkinData: (
    data: SkinWeightsData,
  ) => { boneName: string; vertexCount: number; weightedSum: number }[],
  collectBoneNames: (scene: import("three").Group) => string[],
): { boneName: string; vertexCount: number; weightedSum: number }[] {
  const weightedRows = skinData
    ? collectWeightedRowsFromSkinData(skinData)
    : collectWeightedRows(scene);
  const weightedNames = new Set(weightedRows.map((row) => row.boneName));
  const unweightedRows = scene
    ? collectBoneNames(scene)
        .filter((name) => !weightedNames.has(name))
        .map((boneName) => ({ boneName, vertexCount: 0, weightedSum: 0 }))
    : [];
  return [...weightedRows, ...unweightedRows];
}

export function removeAnimationBone(
  animation: AnimationInfo,
  removedName: string,
): AnimationInfo {
  const clip = animation.clip.clone();
  clip.tracks = clip.tracks.filter(
    (track) => !track.name.startsWith(`${removedName}.`),
  );
  return { ...animation, clip };
}

export function getEffectiveModelBaseName(modelBaseName: string): string {
  return modelBaseName.trim() || "model";
}
