import React from "react";
import {
  ottoHeader,
  ottoMaticLevel,
} from "@/python/structSpecs/ottoMaticInterface";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";

interface FenceGeometryProps {
  data: ottoMaticLevel;
}

const FENCE_POST_HEIGHT = 10; // Example height, adjust as needed
const FENCE_THICKNESS = 0.5; // Example thickness

export const flattenCoords = (
  xTile: number,
  yTile: number,
  header: ottoHeader,
  globals: GlobalsInterface,
) => {
  xTile = Math.floor(xTile);
  yTile = Math.floor(yTile / globals.TILE_SIZE);
  return yTile * (header.mapWidth + 1) + xTile;
};

export const getHeightAtTile = (
  xTile: number,
  yTile: number,
  data: ottoMaticLevel,
  globals: GlobalsInterface,
) => {
  const header = data.Hedr[1000].obj;
  const idx = flattenCoords(xTile, yTile, header, globals);
  const yCoords = data.YCrd[1000].obj;
  if (idx < 0 || idx >= yCoords.length) {
    console.warn(
      `Index ${idx} out of bounds for yCoords array of length ${yCoords.length}`,
    );
    return header.minY * 1; // Fallback if out of bounds
  }
  return yCoords[idx] * 1;
};

// Helper function to get terrain height at a specific world (x, z)
export const getTerrainHeightAtPoint = (
  x: number,
  z: number,
  data: ottoMaticLevel,
  globals: GlobalsInterface, // Added globals here
) => {
  x = x / globals.TILE_SIZE;
  z = z / globals.TILE_SIZE;

  // Get the four surrounding tile coordinates
  const x1 = Math.floor(x);
  const z1 = Math.floor(z);
  const x2 = Math.ceil(x);
  const z2 = Math.ceil(z);

  // Get the fractional components for interpolation
  const xFrac = x - x1;
  const zFrac = z - z1;

  // Get heights at the four corner points
  const h11 = getHeightAtTile(x1, z1, data, globals); // Pass globals
  const h21 = getHeightAtTile(x2, z1, data, globals); // Pass globals
  const h12 = getHeightAtTile(x1, z2, data, globals); // Pass globals
  const h22 = getHeightAtTile(x2, z2, data, globals); // Pass globals

  // For a point (x, z) within the rectangle defined by (x1,z1) to (x2,z2):
  const xFactor = (x - x1) / (x2 - x1);
  const zFactor = (z - z1) / (z2 - z1);

  // Bilinear interpolation
  const interpolatedHeight =
    h11 * (1 - xFactor) * (1 - zFactor) +
    h21 * xFactor * (1 - zFactor) +
    h12 * (1 - xFactor) * zFactor +
    h22 * xFactor * zFactor;

  return interpolatedHeight;
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
          ); // Pass globals
          const terrainY2 = getTerrainHeightAtPoint(
            rawX2,
            rawZ2,
            data,
            globals,
          ); // Pass globals

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
