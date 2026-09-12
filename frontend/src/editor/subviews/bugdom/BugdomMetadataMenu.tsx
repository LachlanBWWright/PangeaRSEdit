import type { HeaderData } from "@/python/structSpecs/LevelTypes";
import { LevelScaleControl } from "../tiles/LevelScaleControl";
import type { LevelScaleMode } from "@/editor/utils/levelScaleState";

interface BugdomMetadataMenuProps {
  readonly headerData: HeaderData;
  readonly onApplyLevelScale: (
    nextTileSize: number,
    mode: LevelScaleMode,
  ) => void;
}

export function BugdomMetadataMenu({
  headerData,
  onApplyLevelScale,
}: BugdomMetadataMenuProps) {
  return (
    <div className="p-1">
      <LevelScaleControl
        tileSize={headerData.Hedr[1000].obj.tileSize}
        supportsPlacementBehavior={false}
        onApply={onApplyLevelScale}
      />
    </div>
  );
}
