<<<<<<< HEAD
import {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import { useRef, useMemo, forwardRef, useEffect } from "react";
=======
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { useRef, useMemo } from "react";
>>>>>>> origin/main
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import type { Event } from "three";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import combineMapImages from "./terrainUtils";

<<<<<<< HEAD
export const TerrainGeometry = forwardRef<Mesh, {
  headerData: HeaderData;
  terrainData: TerrainData;
=======
// Utility function to combine mapImages into a single image
export function combineMapImages(
  mapImages: HTMLCanvasElement[],
  data: ottoMaticLevel,
  globals: GlobalsInterface,
): HTMLCanvasElement {
  if (mapImages.length === 0) {
    throw new Error("No map images to combine");
  }

  const numWide = data.Hedr[1000].obj.mapWidth;
  const numHigh = data.Hedr[1000].obj.mapHeight;

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
      const tileId = data.STgd[1000].obj[i + j * supertilesWide].superTileId;
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
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
>>>>>>> origin/main
  mapImages: HTMLCanvasElement[];
  onPointerDown?: (event: Event) => void;
  onPointerMove?: (event: Event) => void;
  onPointerUp?: (event: Event) => void;
}>(function TerrainGeometry({
  headerData,
  terrainData,
  mapImages,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}, ref) {
  const globals = useAtomValue(Globals);
<<<<<<< HEAD

  const combinedImgResult = useMemo(
    () => combineMapImages(mapImages, headerData, terrainData, globals),
    [mapImages, headerData, terrainData, globals],
  );

  const combinedImg = combinedImgResult.ok ? combinedImgResult.value : null;

  const header: StandardHeader | undefined = headerData.Hedr?.[1000]?.obj;

  const numWide = header?.mapWidth ?? 0;
  const numHigh = header?.mapHeight ?? 0;
  const internalMeshRef = useRef<Mesh>(null);
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  // Combine internal ref with forwarded ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(internalMeshRef.current);
      } else {
        ref.current = internalMeshRef.current;
      }
    }
  }, [ref]);
=======
  const combinedImg = useMemo(
    () => combineMapImages(mapImages, data, globals),
    [mapImages, data, globals],
  );
  const header = data.Hedr[1000].obj;
  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;
  const meshRef = useRef<Mesh>(null);
  const mapTileSize = header.tileSize;
  const yScale = globals.TILE_INGAME_SIZE / mapTileSize;
>>>>>>> origin/main

  // Build geometry with explicit Y from YCrd
  // Geometry is rebuilt when YCrd changes to satisfy linter requirements
  const geometry = useMemo(() => {
<<<<<<< HEAD
    if (!terrainData.YCrd?.[1000]?.obj || !header) return null;

=======
>>>>>>> origin/main
    // PlaneGeometry: width, height, widthSegments, heightSegments
    const geom = new PlaneGeometry(
      numWide * globals.TILE_INGAME_SIZE,
      numHigh * globals.TILE_INGAME_SIZE,
      numWide,
      numHigh,
    );

<<<<<<< HEAD
    const positionAttr = geom.attributes.position;
    if (!positionAttr) return null;

    const ycrd = terrainData.YCrd[1000].obj;
    for (let i = 0; i < positionAttr.count; i++) {
      const ycrdValue = ycrd[i];
      if (ycrdValue !== undefined) {
        positionAttr.setZ(i, ycrdValue * yScale);
      }
=======
    const ycrd = data.YCrd[1000].obj;
    for (let i = 0; i < geom.attributes.position.count; i++) {
      // TODO: Change this to use Y and update the rotation of the plane?
      geom.attributes.position.setZ(i, ycrd[i] * yScale);
>>>>>>> origin/main
    }
    geom.computeVertexNormals();
    positionAttr.needsUpdate = true;
    return geom;
<<<<<<< HEAD
  }, [
    numWide,
    numHigh,
    yScale,
    globals.TILE_INGAME_SIZE,
    header,
    terrainData.YCrd,  // Include YCrd to rebuild geometry on changes
  ]);
=======
  }, [data.YCrd, numWide, numHigh, yScale]);
>>>>>>> origin/main

  const combinedTexture = useMemo(() => {
    if (!combinedImg) return null;
    return new CanvasTexture(combinedImg);
  }, [combinedImg]);

<<<<<<< HEAD
  if (!combinedImgResult.ok) {
    console.error(
      "Failed to combine map images:",
      combinedImgResult.error.message,
    );
    return null;
  }
  if (!header) return null;
  if (!geometry) return null;
=======
>>>>>>> origin/main
  return (
    <mesh
      ref={internalMeshRef}
      position={[
        (numWide * globals.TILE_INGAME_SIZE) / 2,
        0,
        (numHigh * globals.TILE_INGAME_SIZE) / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <ambientLight intensity={1} />
      <meshStandardMaterial
        side={DoubleSide}
        needsUpdate={true}
        map={combinedTexture}
      />
    </mesh>
  );
});
