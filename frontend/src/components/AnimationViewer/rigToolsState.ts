import { Group, SkinnedMesh } from "three";
import type { SkinWeightsData } from "@/modelEditing/weights/weightTypes";

export interface BoneInfluenceRow {
  boneName: string;
  vertexCount: number;
  weightedSum: number;
}

export function collectBoneInfluenceRows(
  scene: Group | undefined,
): BoneInfluenceRow[] {
  if (!scene) {
    return [];
  }

  const totals = new Map<
    string,
    { vertexCount: number; weightedSum: number }
  >();

  scene.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.skeleton) {
      return;
    }

    const geometry = object.geometry;
    const skinIndex = geometry.getAttribute("skinIndex");
    const skinWeight = geometry.getAttribute("skinWeight");
    if (!skinIndex || !skinWeight) {
      return;
    }

    const vertexCount = Math.min(skinIndex.count, skinWeight.count);
    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
      for (let influenceIndex = 0; influenceIndex < 4; influenceIndex += 1) {
        const weight =
          influenceIndex === 0
            ? skinWeight.getX(vertexIndex)
            : influenceIndex === 1
              ? skinWeight.getY(vertexIndex)
              : influenceIndex === 2
                ? skinWeight.getZ(vertexIndex)
                : skinWeight.getW(vertexIndex);
        const boneIndex =
          influenceIndex === 0
            ? skinIndex.getX(vertexIndex)
            : influenceIndex === 1
              ? skinIndex.getY(vertexIndex)
              : influenceIndex === 2
                ? skinIndex.getZ(vertexIndex)
                : skinIndex.getW(vertexIndex);
        if (!Number.isFinite(weight) || weight <= 0) {
          continue;
        }

        const boneName = object.skeleton?.bones?.[boneIndex]?.name;
        if (!boneName) {
          continue;
        }

        const current = totals.get(boneName) ?? {
          vertexCount: 0,
          weightedSum: 0,
        };
        totals.set(boneName, {
          vertexCount: current.vertexCount + 1,
          weightedSum: current.weightedSum + weight,
        });
      }
    }
  });

  return Array.from(totals.entries())
    .map(([boneName, total]) => ({
      boneName,
      vertexCount: total.vertexCount,
      weightedSum: total.weightedSum,
    }))
    .sort((left, right) => right.weightedSum - left.weightedSum);
}

export function pinSelectedBoneRow(
  rows: BoneInfluenceRow[],
  selectedBoneName: string,
): BoneInfluenceRow[] {
  if (!selectedBoneName) {
    return rows;
  }

  const selectedRow = rows.find((row) => row.boneName === selectedBoneName);
  if (!selectedRow) {
    return rows;
  }

  return [
    selectedRow,
    ...rows.filter((row) => row.boneName !== selectedBoneName),
  ];
}

export function collectBoneInfluenceRowsFromSkinData(
  data: SkinWeightsData,
): BoneInfluenceRow[] {
  const totals = new Map<
    string,
    { vertexCount: number; weightedSum: number }
  >();

  for (const vertex of data.vertices) {
    for (const influence of vertex.influences) {
      const current = totals.get(influence.boneName) ?? {
        vertexCount: 0,
        weightedSum: 0,
      };
      totals.set(influence.boneName, {
        vertexCount: current.vertexCount + 1,
        weightedSum: current.weightedSum + influence.weight,
      });
    }
  }

  return Array.from(totals.entries())
    .map(([boneName, total]) => ({
      boneName,
      vertexCount: total.vertexCount,
      weightedSum: total.weightedSum,
    }))
    .sort((left, right) => right.weightedSum - left.weightedSum);
}
