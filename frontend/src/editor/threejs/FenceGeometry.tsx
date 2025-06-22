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

const FENCE_POST_HEIGHT = 300; // Example height, adjust as needed

export const flattenCoords = (
  xTile: number, // Integer tile index
  yTile: number, // Integer tile index for Z
  header: ottoHeader,
  // globals: GlobalsInterface, // globals is not used after the fix
) => {
  // xTile and yTile are expected to be integer tile indices.
  // Math.floor is for safety if they are somehow passed as float tile indices.
  const finalXTile = Math.floor(xTile);
  const finalZTile = Math.floor(yTile); // yTile is already the Z tile index, no division needed.
  return finalZTile * (header.mapWidth + 1) + finalXTile;
};

export const getHeightAtTile = (
  xTile: number,
  yTile: number,
  data: ottoMaticLevel,
  globals: GlobalsInterface,
) => {
  const header = data.Hedr[1000].obj;
  // Call flattenCoords without globals, as it's no longer needed there
  const idx = flattenCoords(xTile, yTile, header);
  const yCoords = data.YCrd[1000].obj;
  const mapTileSize = header.tileSize;
  const yScale = globals.TILE_INGAME_SIZE / mapTileSize;
  if (idx < 0 || idx >= yCoords.length) {
    console.warn(
      `Index ${idx} out of bounds for yCoords array of length ${yCoords.length}`,
    );
    return header.minY * yScale; // Fallback if out of bounds
  }
  return yCoords[idx] * yScale;
};

// Helper function to get terrain height at a specific world (x, z)
export const getTerrainHeightAtPoint = (
  x: number, // world x
  z: number, // world z
  data: ottoMaticLevel,
  globals: GlobalsInterface,
) => {
  // Scale world coordinates to tile coordinates (where 1 unit = 1 tile)
  const x_tile_units = x / globals.TILE_SIZE;
  const z_tile_units = z / globals.TILE_SIZE;
  // console.log("getTerrainHeightAtPoint input world coords:", { x, z });
  // console.log("getTerrainHeightAtPoint tile units:", { x_tile_units, z_tile_units });

  // Get the four surrounding tile integer indices
  const x1 = Math.floor(x_tile_units);
  const z1 = Math.floor(z_tile_units);
  const x2 = Math.ceil(x_tile_units);
  const z2 = Math.ceil(z_tile_units);

  // Get heights at the four corner points
  const h11 = getHeightAtTile(x1, z1, data, globals);
  const h21 = getHeightAtTile(x2, z1, data, globals);
  const h12 = getHeightAtTile(x1, z2, data, globals);
  const h22 = getHeightAtTile(x2, z2, data, globals);

  if (isNaN(h11) || isNaN(h21) || isNaN(h12) || isNaN(h22)) {
    console.warn("NaN height value(s) from getHeightAtTile:", {
      x,
      z,
      x1,
      z1,
      x2,
      z2,
      h11,
      h21,
      h12,
      h22,
    });
    // Depending on desired behavior, you might return a default height or NaN
    // return 0; // Or some other fallback
  }

  // Bilinear interpolation factors
  const dx = x2 - x1;
  const dz = z2 - z1;

  // If dx or dz is 0, the point is on a grid line.
  // xFactor should be 0 if dx is 0 because x_tile_units will be equal to x1.
  // Similar logic for zFactor.
  const xFactor = dx === 0 ? 0 : (x_tile_units - x1) / dx;
  const zFactor = dz === 0 ? 0 : (z_tile_units - z1) / dz;

  // Bilinear interpolation
  const interpolatedHeight =
    h11 * (1 - xFactor) * (1 - zFactor) +
    h21 * xFactor * (1 - zFactor) +
    h12 * (1 - xFactor) * zFactor +
    h22 * xFactor * zFactor;

  if (isNaN(interpolatedHeight)) {
    console.warn("Interpolated height is NaN. Inputs:", {
      x_world: x,
      z_world: z,
      x_tile_units,
      z_tile_units,
      x1,
      z1,
      x2,
      z2,
      h11,
      h21,
      h12,
      h22,
      xFactor,
      zFactor,
      dx,
      dz,
    });
  }

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
          const nubA_raw = nubs[i];
          const nubB_raw = nubs[i + 1];

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
            data,
            globals,
          );
          const terrainY2 = getTerrainHeightAtPoint(
            nubB_raw[0],
            nubB_raw[1],
            data,
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
              <meshStandardMaterial color="saddlebrown" side={2} />
            </mesh>,
          );
        }
        return <group key={`fence-group-${fenceIdx}`}>{fenceSegments}</group>;
      })}
    </group>
  );
};
