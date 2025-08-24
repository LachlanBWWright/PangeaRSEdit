import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/ottoMaticLevelData";
import { useRef, useMemo } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";

// Utility function to combine mapImages into a single image
export function combineMapImages(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): HTMLCanvasElement {
  if (mapImages.length === 0) {
    throw new Error("No map images to combine");
  }

  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.STgd?.[1000]?.obj) {
    throw new Error("Missing header or supertile data");
  }

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  // Combine vertically (can be adjusted as needed)
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width =
    (globals.SUPERTILE_TEXMAP_SIZE / globals.TILES_PER_SUPERTILE) * numWide;
  console.log(
    "width",
    (globals.SUPERTILE_TEXMAP_SIZE / globals.TILES_PER_SUPERTILE) * numWide,
  );
  combinedCanvas.height =
    (globals.SUPERTILE_TEXMAP_SIZE / globals.TILES_PER_SUPERTILE) * numHigh;
  const ctx = combinedCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const supertilesWide = numWide / globals.TILES_PER_SUPERTILE;
  const supertilesHigh = numHigh / globals.TILES_PER_SUPERTILE;

  for (let i = 0; i < supertilesWide; i++) {
    for (let j = 0; j < supertilesHigh; j++) {
      const tileId =
        terrainData.STgd[1000].obj[i + j * supertilesWide].superTileId;
      const tileImg = mapImages[tileId];
      if (tileImg) {
        ctx.drawImage(
          tileImg,
          i * globals.SUPERTILE_TEXMAP_SIZE,
          j * globals.SUPERTILE_TEXMAP_SIZE,
        );
      }
    }
  }

  return combinedCanvas;
}

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
  const combinedImg = useMemo(
    () => combineMapImages(mapImages, headerData, terrainData, globals),
    [mapImages, headerData, terrainData, globals],
  );
  const header = headerData.Hedr?.[1000]?.obj;
  if (!header) return null;

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;
  const meshRef = useRef<Mesh>(null);
  const mapTileSize = header.tileSize;
  const yScale = globals.TILE_INGAME_SIZE / mapTileSize;

  // Build geometry with explicit Y from YCrd
  const geometry = useMemo(() => {
    if (!terrainData.YCrd?.[1000]?.obj) return null;

    // PlaneGeometry: width, height, widthSegments, heightSegments
    const geom = new PlaneGeometry(
      numWide * globals.TILE_INGAME_SIZE,
      numHigh * globals.TILE_INGAME_SIZE,
      numWide,
      numHigh,
    );

    const ycrd = terrainData.YCrd[1000].obj;
    for (let i = 0; i < geom.attributes.position.count; i++) {
      // TODO: Change this to use Y and update the rotation of the plane?
      geom.attributes.position.setZ(i, ycrd[i] * yScale);
    }
    geom.computeVertexNormals();
    geom.attributes.position.needsUpdate = true;
    return geom;
  }, [terrainData.YCrd, numWide, numHigh, yScale]);

  const combinedTexture = useMemo(
    () => new CanvasTexture(combinedImg),
    [combinedImg],
  );

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
