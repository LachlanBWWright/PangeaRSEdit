<<<<<<< HEAD
import { useEffect, useState } from "react";
import {
  FenceData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";
import { getFenceColor } from "@/data/fences/getFenceColor";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";
import { getFenceHeight } from "@/data/fences/getFenceHeight";
import { Texture, DoubleSide, TextureLoader, RepeatWrapping, ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter } from "three";
=======
import React from "react";
import {
  ottoHeader,
  ottoMaticLevel,
} from "@/python/structSpecs/ottoMaticInterface";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";
>>>>>>> origin/main

interface FenceGeometryProps {
  data: ottoMaticLevel;
}

// Import helper functions from separate files to avoid Fast Refresh warnings
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";


<<<<<<< HEAD
interface FenceSegmentGeometryData {
  vertices: number[];
  uvs: number[];
  indices: number[];
}

function calculateFenceSegmentGeometry(
  nubA_raw: [number, number],
  nubB_raw: [number, number],
  terrainY1: number,
  terrainY2: number,
  fenceHeight: number,
  textureAspectRatio: number,
  globals: GlobalsInterface,
): FenceSegmentGeometryData {
  // Convert raw coordinates to world units using MAP2UNIT_VALUE
  // MAP2UNIT_VALUE = TILE_INGAME_SIZE / TILE_SIZE
  const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

  const rawX1 = nubA_raw[0] * scale;
  const rawZ1 = nubA_raw[1] * scale;
  const rawX2 = nubB_raw[0] * scale;
  const rawZ2 = nubB_raw[1] * scale;

  // 3D endpoints (bottom and top)
  const A = [rawX1, terrainY1, rawZ1];
  const B = [rawX2, terrainY2, rawZ2];
  const At = [rawX1, terrainY1 + fenceHeight, rawZ1];
  const Bt = [rawX2, terrainY2 + fenceHeight, rawZ2];

  // Vertices: A (bottom left), B (bottom right), At (top left), Bt (top right)
  const vertices = [...A, ...B, ...At, ...Bt];

  // Indices for two triangles: (A, B, At) and (B, Bt, At)
  const indices = [0, 1, 2, 1, 3, 2];

  // Calculate UV coordinates
  // From source: textureUOff = 1.0f / height * aspectRatio
  const textureUOff = (textureAspectRatio / fenceHeight) * 1;

  // Calculate distance from A to B
  const dx = rawX2 - rawX1;
  const dz = rawZ2 - rawZ1;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // UV coordinates: v=0 at bottom, v=1 at top
  // u accumulates along the fence length
  const u = distance * textureUOff;
  const uvs = [
    0, 0, // A bottom: u=0, v=0
    u, 0, // B bottom: u=distance*textureUOff, v=0
    0, 1, // At top: u=0, v=1
    u, 1, // Bt top: u=distance*textureUOff, v=1
  ];

  return { vertices, uvs, indices };
}

interface FenceSegmentMeshProps {
  geometry: FenceSegmentGeometryData;
  texture: Texture | null;
  fenceColor: string;
} 

const FenceSegmentMesh: React.FC<FenceSegmentMeshProps> = ({
  geometry,
  texture,
  fenceColor,
}) => {
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(geometry.vertices), 3]}
          count={4}
          array={new Float32Array(geometry.vertices)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-uv"
          args={[new Float32Array(geometry.uvs), 2]}
          count={4}
          array={new Float32Array(geometry.uvs)}
          itemSize={2}
        />
        <bufferAttribute
          attach="index"
          args={[new Uint16Array(geometry.indices), 1]}
          array={new Uint16Array(geometry.indices)}
          count={geometry.indices.length}
          itemSize={1}
        />
      </bufferGeometry>
      {texture ? (
        <meshBasicMaterial
          map={texture}
          side={DoubleSide}
          transparent={true}
        />
      ) : (
        <meshStandardMaterial color={fenceColor} side={DoubleSide} />
      )}
    </mesh>
  );
};

interface FenceGroupData {
  fenceIdx: number;
  fenceType: number;
  segments: {
    index: number;
    geometry: FenceSegmentGeometryData;
  }[];
}
=======
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
>>>>>>> origin/main

export const FenceGeometry: React.FC<FenceGeometryProps> = ({ data }) => {
  const globals = useAtomValue(Globals);
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());

  // Load textures for all fence types on mount
  useEffect(() => {
    if (
      !fenceData.Fenc ||
      !fenceData.Fenc[1000] ||
      !globals.FENCE_TYPES
    ) {
      return;
    }

    const fences = fenceData.Fenc[1000].obj;
    const textureUrls = new Set<string>();

    // Collect all unique texture URLs
    fences.forEach((fence) => {
      const imagePath = getFenceImagePath(globals, fence.fenceType);
      if (imagePath) {
        textureUrls.add(imagePath);
      }
    });

    // Load all textures
    const textureLoader = new TextureLoader();
    const loadedTextures = new Map<string, Texture>();
    let loadedCount = 0;

    textureUrls.forEach((url) => {
      textureLoader.load(
        url,
        (texture) => {
          // Configure texture wrapping
          texture.wrapS = RepeatWrapping; // U: wrap horizontally
          texture.wrapT = ClampToEdgeWrapping; // V: clamp vertically
          texture.magFilter = LinearFilter;
          texture.minFilter = LinearMipmapLinearFilter;

          loadedTextures.set(url, texture);
          loadedCount++;

          if (loadedCount === textureUrls.size) {
            setTextures(loadedTextures);
          }
        },
        undefined,
        () => {
          // On error, continue without texture for this type
          loadedCount++;
          if (loadedCount === textureUrls.size) {
            setTextures(loadedTextures);
          }
        },
      );
    });
  }, [fenceData, globals]);

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

  // Pre-calculate all fence data (don't render until textures loaded or timeout)
  const fenceGroups: FenceGroupData[] = [];

  fences.forEach((fence, fenceIdx) => {
    const nubListKey = 1000 + fenceIdx;
    const nubsData = fenceNubsByFenceIdx[nubListKey];

    if (!nubsData || !nubsData.obj || nubsData.obj.length < 2) {
      return;
    }

    const nubs = nubsData.obj;
    const fenceType = fence?.fenceType || 0;
    const fenceHeight = getFenceHeight(globals, fenceType);
    const imagePath = getFenceImagePath(globals, fenceType);

    // Get texture aspect ratio (fallback to 1 if not loaded yet)
    const texture = textures.get(imagePath);
    let textureAspectRatio = 1;
    if (texture?.source?.data && typeof texture.source.data === "object" && texture.source.data !== null) {
      const sourceData = texture.source.data;
      if ("width" in sourceData && "height" in sourceData && 
          typeof sourceData.width === "number" && typeof sourceData.height === "number" && 
          sourceData.height > 0) {
        textureAspectRatio = sourceData.width / sourceData.height;
      }
    }

    const segments = [];
    for (let i = 0; i < nubs.length - 1; i++) {
      const nubA_raw = nubs[i];
      const nubB_raw = nubs[i + 1];
      if (!nubA_raw || !nubB_raw) continue;

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

      const geometry = calculateFenceSegmentGeometry(
        nubA_raw,
        nubB_raw,
        terrainY1,
        terrainY2,
        fenceHeight,
        textureAspectRatio,
        globals,
      );

      segments.push({ index: i, geometry });
    }

    fenceGroups.push({
      fenceIdx,
      fenceType,
      segments,
    });
  });

  return (
    <group name="fences">
<<<<<<< HEAD
      {fenceGroups.map((fenceGroup) => {
        const fenceType = fenceGroup.fenceType;
        const imagePath = getFenceImagePath(globals, fenceType);
        const texture = textures.get(imagePath) || null;
        const fenceColor = getFenceColor(globals, fenceType, fenceGroup.fenceIdx);

        return (
          <group key={`fence-group-${fenceGroup.fenceIdx}`}>
            {fenceGroup.segments.map((segment) => (
              <FenceSegmentMesh
                key={`fence-${fenceGroup.fenceIdx}-segment-${segment.index}`}
                geometry={segment.geometry}
                texture={texture}
                fenceColor={fenceColor}
              />
            ))}
          </group>
        );
=======
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
>>>>>>> origin/main
      })}
    </group>
  );
};
