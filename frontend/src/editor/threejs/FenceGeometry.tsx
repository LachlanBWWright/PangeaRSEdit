import { useEffect, useState, useMemo, memo } from "react";
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

interface FenceGeometryProps {
  fenceData: FenceData;
  headerData: HeaderData;
  terrainData: TerrainData;
  /** Incremented by the 3D topology brush after each stroke to force terrain-height recompute. */
  topologyVersion?: number;
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
  const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

  const rawX1 = nubA_raw[0] * scale;
  const rawZ1 = nubA_raw[1] * scale;
  const rawX2 = nubB_raw[0] * scale;
  const rawZ2 = nubB_raw[1] * scale;

  const A = [rawX1, terrainY1, rawZ1];
  const B = [rawX2, terrainY2, rawZ2];
  const At = [rawX1, terrainY1 + fenceHeight, rawZ1];
  const Bt = [rawX2, terrainY2 + fenceHeight, rawZ2];

  const vertices = [...A, ...B, ...At, ...Bt];
  const indices = [0, 1, 2, 1, 3, 2];

  const textureUOff = (textureAspectRatio / fenceHeight) * 1;

  const dx = rawX2 - rawX1;
  const dz = rawZ2 - rawZ1;
  const distance = Math.sqrt(dx * dx + dz * dz);

  const u = distance * textureUOff;
  const uvs = [
    0, 0,
    u, 0,
    0, 1,
    u, 1,
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

const FenceGeometryComponent: React.FC<FenceGeometryProps> = ({ fenceData, headerData, terrainData, topologyVersion }) => {
  const globals = useAtomValue(Globals);
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());

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

    fences.forEach((fence) => {
      const imagePath = getFenceImagePath(globals, fence.fenceType);
      if (imagePath) {
        textureUrls.add(imagePath);
      }
    });

    const textureLoader = new TextureLoader();
    const loadedTextures = new Map<string, Texture>();
    let loadedCount = 0;

    if (textureUrls.size === 0) return;

    textureUrls.forEach((url) => {
      textureLoader.load(
        url,
        (texture) => {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = ClampToEdgeWrapping;
          texture.magFilter = LinearFilter;
          texture.minFilter = LinearMipmapLinearFilter;

          loadedTextures.set(url, texture);
          loadedCount++;

          if (loadedCount === textureUrls.size) {
            setTextures(new Map(loadedTextures));
          }
        },
        undefined,
        () => {
          loadedCount++;
          if (loadedCount === textureUrls.size) {
            setTextures(new Map(loadedTextures));
          }
        },
      );
    });
  }, [fenceData, globals]);

  const fenceGroups = useMemo(() => {
    if (
      !fenceData.Fenc ||
      !fenceData.Fenc[1000] ||
      !fenceData.FnNb ||
      !headerData.Hedr?.[1000]?.obj ||
      !terrainData.YCrd?.[1000]?.obj ||
      // topologyVersion is a cache-bust counter: the 3D topology brush mutates
      // terrainData.YCrd in place, so referencing it here makes this memo recompute.
      topologyVersion === undefined
    ) {
      return null;
    }

    const fences = fenceData.Fenc[1000].obj;
    const fenceNubsByFenceIdx = fenceData.FnNb;
    const groups: FenceGroupData[] = [];

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

      groups.push({
        fenceIdx,
        fenceType,
        segments,
      });
    });

    return groups;
  }, [fenceData, headerData, terrainData, globals, textures, topologyVersion]);

  if (!fenceGroups) {
    return null;
  }

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

export const FenceGeometry = memo(FenceGeometryComponent);
