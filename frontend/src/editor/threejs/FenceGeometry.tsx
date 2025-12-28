import React, { useEffect, useState } from "react";
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
import * as THREE from "three";

interface FenceGeometryProps {
  fenceData: FenceData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

// Import helper functions from separate files to avoid Fast Refresh warnings
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";


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
  texture: THREE.Texture | null;
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
          side={THREE.DoubleSide}
          transparent={true}
        />
      ) : (
        <meshStandardMaterial color={fenceColor} side={THREE.DoubleSide} />
      )}
    </mesh>
  );
};

interface FenceGroupData {
  fenceIdx: number;
  fenceType: number;
  segments: Array<{
    index: number;
    geometry: FenceSegmentGeometryData;
  }>;
}

export const FenceGeometry: React.FC<FenceGeometryProps> = ({
  fenceData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const [textures, setTextures] = useState<Map<string, THREE.Texture>>(
    new Map(),
  );

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
    const textureLoader = new THREE.TextureLoader();
    const loadedTextures = new Map<string, THREE.Texture>();
    let loadedCount = 0;

    textureUrls.forEach((url) => {
      textureLoader.load(
        url,
        (texture) => {
          // Configure texture wrapping
          texture.wrapS = THREE.RepeatWrapping; // U: wrap horizontally
          texture.wrapT = THREE.ClampToEdgeWrapping; // V: clamp vertically
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;

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
    const textureAspectRatio = texture
      ? (texture.source.data as { width: number; height: number }).width / (texture.source.data as { width: number; height: number }).height
      : 1;

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
      })}
    </group>
  );
};
