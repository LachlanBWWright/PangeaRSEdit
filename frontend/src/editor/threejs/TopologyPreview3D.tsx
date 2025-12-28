import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { PlaneGeometry, MeshBasicMaterial, DoubleSide, BufferAttribute } from "three";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyValueMode,
  TopologyValue,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { PixelType } from "../utils/topologyBrushUtils";

interface TopologyPreview3DProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  affectedPixels: PixelType[];
  visible: boolean;
}

export function TopologyPreview3D({
  headerData,
  terrainData,
  affectedPixels,
  visible,
}: TopologyPreview3DProps) {
  const globals = useAtomValue(Globals);
  const valueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);

  const header = headerData.Hedr?.[1000]?.obj;
  const numWide = header?.mapWidth ?? 0;
  const numHigh = header?.mapHeight ?? 0;
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  // Build preview geometry showing modified heights
  const geometry = useMemo(() => {
    if (!visible || !terrainData.YCrd?.[1000]?.obj || !header || affectedPixels.length === 0) {
      return null;
    }

    const geom = new PlaneGeometry(
      numWide * globals.TILE_INGAME_SIZE,
      numHigh * globals.TILE_INGAME_SIZE,
      numWide,
      numHigh
    );

    const positionAttr = geom.attributes.position;
    if (!positionAttr) return null;

    const ycrd = terrainData.YCrd[1000].obj;
    const affectedSet = new Set(
      affectedPixels.map((p) => {
        const xTile = Math.floor(p.x);
        const yTile = Math.floor(p.y);
        return yTile * (numWide + 1) + xTile;
      })
    );

    for (let i = 0; i < positionAttr.count; i++) {
      if (affectedSet.has(i)) {
        // Calculate preview height based on value mode
        const currentValue = ycrd[i] ?? 0;
        const pixel = affectedPixels.find((p) => {
          const xTile = Math.floor(p.x);
          const yTile = Math.floor(p.y);
          return yTile * (numWide + 1) + xTile === i;
        });

        if (pixel) {
          let newValue: number;
          switch (valueMode) {
            case TopologyValueMode.SET_VALUE:
              newValue = topologyValue;
              break;
            case TopologyValueMode.DELTA_VALUE:
              newValue = currentValue + topologyValue;
              break;
            case TopologyValueMode.DELTA_WITH_DROPOFF:
              const falloff = 1 - pixel.distance;
              newValue = currentValue + topologyValue * falloff;
              break;
            default:
              newValue = currentValue;
          }
          positionAttr.setZ(i, newValue * yScale);
        }
      } else {
        // Keep original height
        const ycrdValue = ycrd[i];
        if (ycrdValue !== undefined) {
          positionAttr.setZ(i, ycrdValue * yScale);
        }
      }
    }

    geom.computeVertexNormals();
    positionAttr.needsUpdate = true;
    return geom;
  }, [
    visible,
    terrainData.YCrd,
    numWide,
    numHigh,
    yScale,
    globals.TILE_INGAME_SIZE,
    header,
    affectedPixels,
    valueMode,
    topologyValue,
  ]);

  // Wireframe material for preview
  const material = useMemo(() => {
    return new MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
    });
  }, []);

  if (!visible || !geometry) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[
        (numWide * globals.TILE_INGAME_SIZE) / 2,
        0,
        (numHigh * globals.TILE_INGAME_SIZE) / 2,
      ]}
    />
  );
}
