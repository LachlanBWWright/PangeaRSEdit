import React from "react";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";

interface FenceGeometryProps {
  data: ottoMaticLevel;
}

const FENCE_POST_HEIGHT = 10; // Example height, adjust as needed
const FENCE_THICKNESS = 0.5; // Example thickness

// Helper function to get terrain height at a specific world (x, z)
// This is a simplified nearest-neighbor lookup. Interpolation would be more accurate.
// MODIFIED: Now expects centered world coordinates
const getTerrainHeightAtPoint = (
  centeredWorldX: number, // Renamed from worldX
  centeredWorldZ: number, // Renamed from worldZ
  data: ottoMaticLevel,
  globals: GlobalsInterface,
): number => {
  const header = data.Hedr[1000].obj;
  const yCoords = data.YCrd[1000].obj;

  // Convert centered world coordinates to uncentered (0-indexed) world coordinates
  const uncenteredWorldX = centeredWorldX + (header.mapWidth * 1) / 2;
  const uncenteredWorldZ = centeredWorldZ + (header.mapHeight * 1) / 2;

  // Original logic using uncenteredWorldX and uncenteredWorldZ
  const gx = Math.max(
    0,
    // Use uncenteredWorldX here
    Math.min(header.mapWidth, Math.round(uncenteredWorldX / 1)),
  );
  const gz = Math.max(
    0,
    // Use uncenteredWorldZ here
    Math.min(header.mapHeight, Math.round(uncenteredWorldZ / 1)),
  );

  const yIndex = gz * (header.mapWidth + 1) + gx;

  if (yCoords && yIndex >= 0 && yIndex < yCoords.length) {
    return yCoords[yIndex] * 1;
  }
  // Fallback if out of bounds, or if YCrd is not available.
  return header.minY * 1; // Use minY as a fallback
};

export const FenceGeometry: React.FC<FenceGeometryProps> = ({ data }) => {
  const globals = useAtomValue(Globals);

  if (
    !data.Fenc ||
    !data.Fenc[1000] ||
    !data.FnNb ||
    !data.Hedr?.[1000]?.obj ||
    !data.YCrd?.[1000]?.obj
  ) {
    return null;
  }

  const fences = data.Fenc[1000].obj;
  const fenceNubsByFenceIdx = data.FnNb;

  return (
    <group name="fences">
      {fences.map((_, fenceIdx) => {
        const nubListKey = 1000 + fenceIdx; // FnNb keys are typically base (1000) + index
        const nubsData = fenceNubsByFenceIdx[nubListKey];

        if (!nubsData || !nubsData.obj || nubsData.obj.length < 2) {
          return null; // Not enough nubs to form a segment
        }
        const nubs = nubsData.obj;

        const fenceSegments = [];
        for (let i = 0; i < nubs.length - 1; i++) {
          const nubA_raw = nubs[i]; // These are [rawX, rawZ] in uncentered, TILE_SIZE-scaled system
          const nubB_raw = nubs[i + 1];

          // Raw (uncentered, TILE_SIZE-scaled) coordinates
          const rawX1 = nubA_raw[0];
          const rawZ1 = nubA_raw[1];
          const rawX2 = nubB_raw[0];
          const rawZ2 = nubB_raw[1];

          // Get terrain height using centered coordinates
          const terrainY1 = getTerrainHeightAtPoint(
            rawX1,
            rawZ1,
            data,
            globals,
          );
          const terrainY2 = getTerrainHeightAtPoint(
            rawX2,
            rawZ2,
            data,
            globals,
          );

          // Length calculation can use raw or centered diffs, it's the same
          const length = Math.sqrt(
            Math.pow(rawX2 - rawX1, 2) + Math.pow(rawZ2 - rawZ1, 2),
          );
          if (length === 0) continue; // Skip zero-length segments

          // Midpoint for positioning uses centered coordinates
          const midCX = (rawX1 + rawX2) / 2;
          const midCZ = (rawZ1 + rawZ2) / 2;

          const segmentBaseY = (terrainY1 + terrainY2) / 2;
          const fenceMeshY = segmentBaseY + FENCE_POST_HEIGHT / 2;

          // Angle calculation can use raw or centered diffs
          const angle = Math.atan2(rawX2 - rawX1, rawZ2 - rawZ1); // Angle for Y-axis rotation

          fenceSegments.push(
            <mesh
              key={`fence-${fenceIdx}-segment-${i}`}
              position={[midCX, fenceMeshY, midCZ]} // Use centered midpoints
              rotation={[0, angle + Math.PI / 2, 0]}
            >
              <boxGeometry
                args={[length, FENCE_POST_HEIGHT, FENCE_THICKNESS]}
              />
              <meshStandardMaterial color="saddlebrown" />
            </mesh>,
          );
        }
        return <group key={`fence-group-${fenceIdx}`}>{fenceSegments}</group>;
      })}
    </group>
  );
};
