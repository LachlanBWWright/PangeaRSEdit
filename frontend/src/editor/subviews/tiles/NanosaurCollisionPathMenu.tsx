import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { MenuEmptyState } from "../MenuEmptyState";
import { NanosaurPathControls } from "./NanosaurPathControls";

interface NanosaurCollisionPathMenuProps {
  readonly terrainData: TerrainData;
}

export function NanosaurCollisionPathMenu({
  terrainData,
}: NanosaurCollisionPathMenuProps) {
  if (!terrainData.nanosaurPathLayer) {
    return (
      <MenuEmptyState
        title="No Collision or Path Layer"
        description="This level doesn't contain collision and path-layer data."
        fillHeight
      />
    );
  }

  return <NanosaurPathControls />;
}
