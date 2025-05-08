import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { useRef } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import { useHeightImg } from "../subviews/tiles/useHeightImg";
import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { Globals, GlobalsInterface } from "@/data/globals/globals";

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
  mapImages: HTMLCanvasElement[];
}) {
  const globals = useAtomValue(Globals);
  const { heightImg } = useHeightImg(data);
  console.log("heightImg", heightImg.toDataURL());
  const combinedImg = useMemo(
    () => combineMapImages(mapImages, data, globals),
    [mapImages, data],
  );
  console.log("combinedImg", combinedImg.toDataURL());

  const testCanvas = document.createElement("canvas");
  testCanvas.width = 100;
  testCanvas.height = 100;
  const testCtx = testCanvas.getContext("2d");
  if (!testCtx) throw new Error("Could not get canvas context");
  testCtx.fillStyle = "red";
  testCtx.fillRect(0, 0, 100, 100);

  console.log(heightImg);
  const heightTexture = useMemo(
    () => new CanvasTexture(heightImg),
    [heightImg, testCanvas],
  );
  const combinedTexture = useMemo(
    () => new CanvasTexture(combinedImg),
    [combinedImg],
  );
  const header = data.Hedr[1000].obj;
  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;
  const meshRef = useRef<Mesh>(null);
  const planeRef = useRef<PlaneGeometry>(null);

  const mapToUnitRatio = globals.TILE_INGAME_SIZE;
  console.log("MinY", header.minY);
  console.log("MaxY", header.maxY);
  const heightDiff = header.maxY - header.minY;
  const heightScale = (globals.TILE_SIZE * mapToUnitRatio) / heightDiff;

  /*   console.log("mapToUnitRatio", mapToUnitRatio);
  console.log("heightDiff", heightDiff);
  console.log("heightScale", heightScale); */
  return (
    <>
      <mesh
        ref={meshRef}
        position={[
          (numWide * globals.TILE_SIZE) / 2,
          0,
          (numHigh * globals.TILE_SIZE) / 2,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry
          ref={planeRef}
          args={[
            numWide * globals.TILE_SIZE,
            numHigh * globals.TILE_SIZE,
            numWide,
            numHigh,
          ]}
        />
        <ambientLight intensity={1} />
        <meshStandardMaterial
          side={DoubleSide}
          needsUpdate={true}
          alphaMap={heightTexture}
          displacementMap={heightTexture}
          displacementScale={heightScale}
          map={combinedTexture}
        />
      </mesh>
    </>
  );
}
