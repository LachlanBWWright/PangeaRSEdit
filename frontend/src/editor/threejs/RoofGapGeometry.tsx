import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from "three";
import { Globals } from "@/data/globals/globals";
import { ShowRoofGapInTopology, ShowRoofInTopology } from "@/data/tiles/tileAtoms";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";

const ROOF_GAP_VERTEX_SAMPLE_STRIDE = 2;

export function RoofGapGeometry({
  headerData,
  terrainData,
  topologyVersion,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  topologyVersion?: number;
}) {
  const globals = useAtomValue(Globals);
  const showRoof = useAtomValue(ShowRoofInTopology);
  const showRoofGap = useAtomValue(ShowRoofGapInTopology);

  const header = headerData.Hedr?.[1000]?.obj;
  const floor = terrainData.YCrd?.[1000]?.obj;
  const roof = terrainData.YCrd?.[1001]?.obj;

  const geometry = useMemo(() => {
    if (!header || !floor || !roof || !showRoof || !showRoofGap) {
      return null;
    }

    const mapTileSize = header.tileSize ?? 1;
    const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);
    const mapWidth = header.mapWidth + 1;
    const mapHeight = header.mapHeight + 1;
    const positions: number[] = [];

    // Sample every other vertex to keep the overlay legible on large maps.
    for (let z = 0; z < mapHeight; z += ROOF_GAP_VERTEX_SAMPLE_STRIDE) {
      for (let x = 0; x < mapWidth; x += ROOF_GAP_VERTEX_SAMPLE_STRIDE) {
        const index = z * mapWidth + x;
        const floorHeight = floor[index];
        const roofHeight = roof[index];
        if (floorHeight === undefined || roofHeight === undefined) {
          continue;
        }

        const worldX = x * globals.TILE_INGAME_SIZE;
        const worldZ = z * globals.TILE_INGAME_SIZE;
        positions.push(worldX, floorHeight * yScale, worldZ);
        positions.push(worldX, roofHeight * yScale, worldZ);
      }
    }

    if (positions.length === 0) {
      return null;
    }

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return lineGeometry;
  }, [
    floor,
    globals.TILE_INGAME_SIZE,
    header,
    roof,
    showRoof,
    showRoofGap,
    topologyVersion,
  ]);

  const material = useMemo(
    () =>
      new LineBasicMaterial({
        color: 0x6fb5ff,
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );

  if (!geometry) {
    return null;
  }

  return <lineSegments geometry={geometry} material={material} />;
}
