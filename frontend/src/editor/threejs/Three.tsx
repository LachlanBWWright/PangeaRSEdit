import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import { useHeightImg } from "../subviews/tiles/useHeightImg";
import { useMemo } from "react";

// Utility function to combine mapImages into a single image
export function combineMapImages(
  mapImages: HTMLCanvasElement[],
  data: ottoMaticLevel,
): HTMLCanvasElement {
  if (mapImages.length === 0) {
    throw new Error("No map images to combine");
  }

  const numWide = data.Hedr[1000].obj.mapWidth;
  const numHigh = data.Hedr[1000].obj.mapHeight;

  // Assume all images are the same size
  const width = mapImages[0].width;
  const height = mapImages[0].height;
  // Combine vertically (can be adjusted as needed)
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width = 16 * numWide;
  console.log("width", 16 * numWide);
  combinedCanvas.height = 16 * numHigh;
  const ctx = combinedCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  mapImages.forEach((img, i) => {
    ctx.drawImage(img, (i % numWide) * width, Math.floor(i / numWide) * height);
  });
  console.log("combinedCanvas", combinedCanvas);
  return combinedCanvas;
}

export function TerrainGeometry({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  const { heightImg } = useHeightImg(data);
  console.log("heightImg", heightImg.toDataURL());
  const combinedImg = useMemo(
    () => combineMapImages(mapImages, data),
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
  console.log("Height Texture", heightTexture);
  /*   const combinedTexture = useMemo(
    () => new CanvasTexture(combinedImg),
    [combinedImg],
  );
  console.log(combinedTexture); */

  const numWide = data.Hedr[1000].obj.mapWidth;
  const numHigh = data.Hedr[1000].obj.mapHeight;
  const meshRef = useRef<Mesh>(null);
  const planeRef = useRef<PlaneGeometry>(null);
  return (
    <>
      <mesh ref={meshRef} rotation={[1, 1, 1]} /* position={[0, 0, 0]} */>
        <planeGeometry ref={planeRef} args={[5, 5, numWide * 8, numHigh * 8]} />
        <ambientLight intensity={0.5} />
        <meshStandardMaterial
          side={DoubleSide}
          needsUpdate={true}
          /* color={"red"} */
          alphaMap={heightTexture}
          displacementMap={heightTexture}
          displacementScale={0.1}
          map={heightTexture}
        />
      </mesh>
    </>
  );
}

export function ThreeView({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  const meshRef = useRef<Mesh>(null);
  return (
    <Canvas>
      <directionalLight color="red" position={[0, 0, 10]} />
      <TerrainGeometry data={data} mapImages={mapImages} />
    </Canvas>
  );
}
