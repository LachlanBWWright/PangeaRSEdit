import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/ottoMaticLevelData";
import { useRef, useMemo } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface, Game } from "@/data/globals/globals";
import { Result, ok, err } from "@/types/result";

// Utility function to combine mapImages into a single image for games with STgd data
export function combineMapImagesFromSTgd(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  if (mapImages.length === 0) {
    return err(new Error("No map images to combine"));
  }

  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.STgd?.[1000]?.obj) {
    return err(new Error("Missing header or supertile data"));
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
  if (!ctx) return err(new Error("Could not get canvas context"));

  const supertilesWide = numWide / globals.TILES_PER_SUPERTILE;
  const supertilesHigh = numHigh / globals.TILES_PER_SUPERTILE;

  const stgdObj = terrainData.STgd[1000].obj;
  for (let i = 0; i < supertilesWide; i++) {
    for (let j = 0; j < supertilesHigh; j++) {
      const stgdEntry = stgdObj[i + j * supertilesWide];
      if (!stgdEntry) continue;
      const tileId = stgdEntry.superTileId;
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

  return ok(combinedCanvas);
}

// Utility function to combine individual tiles into a single image for Bugdom/Nanosaur
export function combineMapImagesFromTiles(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  if (mapImages.length === 0) {
    return err(new Error("No tile images to combine"));
  }

  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.Layr?.[1000]?.obj) {
    return err(new Error("Missing header or layer data"));
  }

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;
  const tileSize = globals.TILE_SIZE;

  // Create combined canvas sized for the full terrain
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width = numWide * tileSize;
  combinedCanvas.height = numHigh * tileSize;
  const ctx = combinedCanvas.getContext("2d");
  if (!ctx) return err(new Error("Could not get canvas context"));

  const layerData = terrainData.Layr[1000].obj;
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  for (let y = 0; y < numHigh; y++) {
    for (let x = 0; x < numWide; x++) {
      const layerIndex = y * numWide + x;
      let tileIndex = layerData[layerIndex];
      
      if (tileIndex === undefined) continue;
      
      // Apply Xlat translation if available
      if (xlatTable) {
        const translatedIndex = xlatTable[tileIndex];
        if (translatedIndex !== undefined) {
          tileIndex = translatedIndex;
        }
      }
      
      const tileImg = mapImages[tileIndex];
      if (tileImg) {
        ctx.drawImage(tileImg, x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  return ok(combinedCanvas);
}

// Main function to combine map images based on game type
export function combineMapImages(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  // For Bugdom 1 and Nanosaur 1, use individual tile combining
  if (globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR) {
    return combineMapImagesFromTiles(mapImages, headerData, terrainData, globals);
  }
  
  // For other games, use STgd-based supertile combining
  return combineMapImagesFromSTgd(mapImages, headerData, terrainData, globals);
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
  const combinedImgResult = useMemo(
    () => combineMapImages(mapImages, headerData, terrainData, globals),
    [mapImages, headerData, terrainData, globals],
  );
  
  // Handle error case by returning null (no terrain rendered)
  if (!combinedImgResult.ok) {
    console.error("Failed to combine map images:", combinedImgResult.error.message);
    return null;
  }
  const combinedImg = combinedImgResult.value;
  
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
      const ycrdValue = ycrd[i];
      if (ycrdValue !== undefined) {
        geom.attributes.position.setZ(i, ycrdValue * yScale);
      }
    }
    geom.computeVertexNormals();
    geom.attributes.position.needsUpdate = true;
    return geom;
  }, [terrainData.YCrd, numWide, numHigh, yScale, globals.TILE_INGAME_SIZE]);

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
