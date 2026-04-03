import {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import { useRef, useMemo, forwardRef, useEffect } from "react";
import { Mesh, PlaneGeometry, DoubleSide } from "three";
import type { Event } from "three";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyLayerEditMode,
  ShowRoofInTopology,
  TopologyLayerEditMode,
} from "@/data/tiles/tileAtoms";

/**
 * Roof geometry component for Bugdom 1 and other games with YCrd 1001 resource.
 * Renders a separate plane above the floor terrain representing the roof/ceiling.
 */
export const RoofGeometry = forwardRef<
  Mesh,
  {
     headerData: HeaderData;
     terrainData: TerrainData;
     onPointerDown?: (event: Event) => void;
     onPointerMove?: (event: Event) => void;
     onPointerUp?: (event: Event) => void;
   }
 >(function RoofGeometry(
   {
     headerData,
     terrainData,
     onPointerDown,
     onPointerMove,
     onPointerUp,
   },
   ref
 ) {
  const globals = useAtomValue(Globals);
  const showRoof = useAtomValue(ShowRoofInTopology);
  const layerEditMode = useAtomValue(CurrentTopologyLayerEditMode);

  const header: StandardHeader | undefined = headerData.Hedr?.[1000]?.obj;

  const numWide = header?.mapWidth ?? 0;
  const numHigh = header?.mapHeight ?? 0;
  const internalMeshRef = useRef<Mesh>(null);
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  // Combine internal ref with forwarded ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === "function") {
        ref(internalMeshRef.current);
      } else {
        ref.current = internalMeshRef.current;
      }
    }
  }, [ref]);

  // Build roof geometry from YCrd 1001 (if present)
  const geometry = useMemo(() => {
     const shouldShowRoof =
       showRoof || layerEditMode !== TopologyLayerEditMode.FLOOR;
     if (!shouldShowRoof || !terrainData.YCrd?.[1001]?.obj || !header)
       return null;

    // PlaneGeometry: width, height, widthSegments, heightSegments
    const geom = new PlaneGeometry(
      numWide * globals.TILE_INGAME_SIZE,
      numHigh * globals.TILE_INGAME_SIZE,
      numWide,
      numHigh
    );

    const positionAttr = geom.attributes.position;
    if (!positionAttr) return null;

    const roofYcrd = terrainData.YCrd[1001].obj;
    for (let i = 0; i < positionAttr.count; i++) {
      const ycrdValue = roofYcrd[i];
      if (ycrdValue !== undefined) {
        positionAttr.setZ(i, ycrdValue * yScale);
      }
    }
    geom.computeVertexNormals();
    positionAttr.needsUpdate = true;
    return geom;
  }, [
     showRoof,
     layerEditMode,
     numWide,
     numHigh,
     yScale,
     globals.TILE_INGAME_SIZE,
     header,
     terrainData.YCrd,
   ]);

   if (
     (!showRoof && layerEditMode === TopologyLayerEditMode.FLOOR) ||
     !header ||
     !geometry ||
     !terrainData.YCrd?.[1001]
   ) {
     return null;
   }

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
        color="#88ccff" // Light blue/cyan tint to distinguish roof from floor
        transparent={true}
        opacity={0.7} // Semi-transparent so you can see floor through it
        wireframe={false}
      />
    </mesh>
  );
});
