import {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import { useRef, useMemo, forwardRef, useEffect } from "react";
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry } from "three";
import type { Event } from "three";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import combineMapImages from "./terrainUtils";

export const TerrainGeometry = forwardRef<Mesh, {
  headerData: HeaderData;
  terrainData: TerrainData;
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

  const combinedImgResult = useMemo(
    () => combineMapImages(mapImages, headerData, terrainData, globals),
    [mapImages, headerData, terrainData, globals],
  );

  const combinedImg = combinedImgResult.isOk()
    ? combinedImgResult.value
    : null;

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

  // Build geometry with explicit Y from YCrd
  // Geometry is rebuilt when YCrd changes to satisfy linter requirements
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
    numWide,
    numHigh,
    yScale,
    globals.TILE_INGAME_SIZE,
    header,
    terrainData.YCrd,  // Include YCrd to rebuild geometry on changes
  ]);

  const combinedTexture = useMemo(() => {
    if (!combinedImg) return null;
    return new CanvasTexture(combinedImg);
  }, [combinedImg]);

  if (combinedImgResult.isErr()) {
    console.error(
      "Failed to combine map images:",
      combinedImgResult.error,
    );
    return null;
  }
  if (!header) return null;
  if (!geometry) return null;
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
      <meshStandardMaterial
        side={DoubleSide}
        needsUpdate={true}
        map={combinedTexture}
      />
    </mesh>
  );
});
