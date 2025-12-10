import {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import { useRef, useMemo } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import combineMapImages from "./terrainUtils";

export function TerrainGeometry({
  headerData,
  terrainData,
  mapImages,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}) {
  const globals = useAtomValue(Globals);

  const combinedImgResult = useMemo(
    () => combineMapImages(mapImages, headerData, terrainData, globals),
    [mapImages, headerData, terrainData, globals],
  );

  const combinedImg = combinedImgResult.ok ? combinedImgResult.value : null;

  const header: StandardHeader | undefined = headerData.Hedr?.[1000]?.obj;

  const numWide = header?.mapWidth ?? 0;
  const numHigh = header?.mapHeight ?? 0;
  const meshRef = useRef<Mesh>(null);
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  // Build geometry with explicit Y from YCrd
  const geometry = useMemo(() => {
    if (!terrainData.YCrd?.[1000]?.obj || !header) return null;

    // PlaneGeometry: width, height, widthSegments, heightSegments
    const geom = new PlaneGeometry(
      numWide * globals.TILE_INGAME_SIZE,
      numHigh * globals.TILE_INGAME_SIZE,
      numWide,
      numHigh,
    );

    const positionAttr = geom.attributes.position;
    if (!positionAttr) return null;

    const ycrd = terrainData.YCrd[1000].obj;
    for (let i = 0; i < positionAttr.count; i++) {
      const ycrdValue = ycrd[i];
      if (ycrdValue !== undefined) {
        positionAttr.setZ(i, ycrdValue * yScale);
      }
    }
    geom.computeVertexNormals();
    positionAttr.needsUpdate = true;
    return geom;
  }, [
    terrainData.YCrd,
    numWide,
    numHigh,
    yScale,
    globals.TILE_INGAME_SIZE,
    header,
  ]);

  const combinedTexture = useMemo(() => {
    if (!combinedImg) return null;
    return new CanvasTexture(combinedImg);
  }, [combinedImg]);

  if (!combinedImgResult.ok) {
    console.error(
      "Failed to combine map images:",
      combinedImgResult.error.message,
    );
    return null;
  }
  if (!header) return null;
  if (!geometry) return null;
  return (
    <mesh
      ref={meshRef}
      position={[
        (numWide * globals.TILE_INGAME_SIZE) / 2,
        0,
        (numHigh * globals.TILE_INGAME_SIZE) / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
    >
      <ambientLight intensity={1} />
      <meshStandardMaterial
        side={DoubleSide}
        needsUpdate={true}
        map={combinedTexture}
      />
    </mesh>
  );
}
