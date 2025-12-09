import React from "react";
import {
  FenceData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/ottoMaticLevelData";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { getFenceColor } from "@/data/fences/getFenceColor";

interface FenceGeometryProps {
  fenceData: FenceData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const FENCE_POST_HEIGHT = 300; // Example height, adjust as needed

// Import helper functions from separate files to avoid Fast Refresh warnings
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";

export const FenceGeometry: React.FC<FenceGeometryProps> = ({
  fenceData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);

  if (
    !fenceData.Fenc ||
    !fenceData.Fenc[1000] ||
    !fenceData.FnNb ||
    !headerData.Hedr?.[1000]?.obj ||
    !terrainData.YCrd?.[1000]?.obj
  ) {
    return null;
  }

  const fences = fenceData.Fenc[1000].obj;
  const fenceNubsByFenceIdx = fenceData.FnNb;

  return (
    <group name="fences">
      {fences.map((fence, fenceIdx) => {
        const nubListKey = 1000 + fenceIdx; // FnNb keys are typically base (1000) + index
        const nubsData = fenceNubsByFenceIdx[nubListKey];

        if (!nubsData || !nubsData.obj || nubsData.obj.length < 2) {
          return null; // Not enough nubs to form a segment
        }
        const nubs = nubsData.obj;

        // Get fence type from fence data for game-specific coloring
        const fenceType = fence?.fenceType || 0;
        const fenceColor = getFenceColor(globals, fenceType, fenceIdx);

        const fenceSegments = [];
        for (let i = 0; i < nubs.length - 1; i++) {
          const nubA_raw = nubs[i];
          const nubB_raw = nubs[i + 1];
          if (!nubA_raw || !nubB_raw) continue;

          // Raw (uncentered, TILE_SIZE-scaled) coordinates
          const rawX1 =
            nubA_raw[0] * (globals.TILE_INGAME_SIZE / globals.TILE_SIZE);
          const rawZ1 =
            nubA_raw[1] * (globals.TILE_INGAME_SIZE / globals.TILE_SIZE);
          const rawX2 =
            nubB_raw[0] * (globals.TILE_INGAME_SIZE / globals.TILE_SIZE);
          const rawZ2 =
            nubB_raw[1] * (globals.TILE_INGAME_SIZE / globals.TILE_SIZE);

          // Get terrain height at endpoints
          const terrainY1 = getTerrainHeightAtPoint(
            nubA_raw[0],
            nubA_raw[1],
            headerData,
            terrainData,
            globals,
          );
          const terrainY2 = getTerrainHeightAtPoint(
            nubB_raw[0],
            nubB_raw[1],
            headerData,
            terrainData,
            globals,
          );

          // 3D endpoints (bottom and top)
          const A = [rawX1, terrainY1, rawZ1];
          const B = [rawX2, terrainY2, rawZ2];
          const At = [rawX1, terrainY1 + FENCE_POST_HEIGHT, rawZ1];
          const Bt = [rawX2, terrainY2 + FENCE_POST_HEIGHT, rawZ2];

          // Vertices: A (bottom left), B (bottom right), At (top left), Bt (top right)
          const vertices = [
            ...A, // 0
            ...B, // 1
            ...At, // 2
            ...Bt, // 3
          ];
          // Indices for two triangles: (A, B, At) and (B, Bt, At)
          const indices = [0, 1, 2, 1, 3, 2];

          fenceSegments.push(
            <mesh key={`fence-${fenceIdx}-segment-${i}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array(vertices)}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array(indices)}
                  count={indices.length}
                  itemSize={1}
                />
              </bufferGeometry>
              <meshStandardMaterial color={fenceColor} side={2} />
            </mesh>,
          );
        }
        return <group key={`fence-group-${fenceIdx}`}>{fenceSegments}</group>;
      })}
    </group>
  );
};
