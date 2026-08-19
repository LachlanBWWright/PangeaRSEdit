import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { MenuEmptyState } from "../MenuEmptyState";
import { BugdomVertexColorControls } from "./BugdomVertexColorControls";

interface BugdomVertexColorMenuProps {
  readonly terrainData: TerrainData;
}

export function BugdomVertexColorMenu({
  terrainData,
}: BugdomVertexColorMenuProps) {
  if (!terrainData.Vcol?.[1000]) {
    return (
      <MenuEmptyState
        title="No Vertex Colors"
        description="This level doesn't contain terrain vertex-color data."
        fillHeight
      />
    );
  }

  return <BugdomVertexColorControls />;
}
