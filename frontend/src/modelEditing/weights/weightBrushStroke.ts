import type { Group } from "three";
import { SkinnedMesh } from "three";
import { applyWeightBrush } from "./weightBrush";
import type { SkinWeightsData, WeightBrushSettings } from "./weightTypes";

export interface WeightBrushHit {
  /** UUID of the mesh that received the brush interaction. */
  readonly meshUuid: string;
  /** Local-space hit point used to measure per-vertex distance. */
  readonly localPoint: readonly [number, number, number];
}

/** Applies one weight-brush stroke to the targeted mesh within the scene. */
export function applyWeightBrushStroke(
  scene: Group,
  data: SkinWeightsData,
  settings: WeightBrushSettings,
  hit: WeightBrushHit,
): SkinWeightsData {
  if (!settings.targetBone) {
    return data;
  }

  let globalVertexOffset = 0;
  let affectedVertices: { vertexIndex: number; distance: number }[] = [];

  scene.traverse((object) => {
    if (!(object instanceof SkinnedMesh)) {
      return;
    }

    const positionAttribute = object.geometry.getAttribute("position");
    if (!positionAttribute) {
      return;
    }

    const vertexCount = positionAttribute.count;
    if (object.uuid !== hit.meshUuid) {
      globalVertexOffset += vertexCount;
      return;
    }

    const [targetX, targetY, targetZ] = hit.localPoint;
    let nearestVertex: {
      readonly vertexIndex: number;
      readonly distance: number;
    } | null = null;

    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
      const dx = positionAttribute.getX(vertexIndex) - targetX;
      const dy = positionAttribute.getY(vertexIndex) - targetY;
      const dz = positionAttribute.getZ(vertexIndex) - targetZ;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (!nearestVertex || distance < nearestVertex.distance) {
        nearestVertex = {
          vertexIndex: globalVertexOffset + vertexIndex,
          distance,
        };
      }

      if (distance <= settings.radius) {
        affectedVertices = [
          ...affectedVertices,
          {
            vertexIndex: globalVertexOffset + vertexIndex,
            distance,
          },
        ];
      }
    }

    if (affectedVertices.length === 0 && nearestVertex) {
      affectedVertices = [nearestVertex];
    }

    globalVertexOffset += vertexCount;
  });

  if (affectedVertices.length === 0) {
    return data;
  }

  return applyWeightBrush(data, affectedVertices, settings);
}
