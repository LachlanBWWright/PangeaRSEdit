import { MightyMikeTileOperationsPanel } from "@/editor/subviews/mightymike/MightyMikeTileOperationsPanel";
import { MightyMikeTileInspectorPanel } from "@/editor/subviews/mightymike/MightyMikeTileInspectorPanel";
import { MightyMikePalettePanel } from "@/editor/subviews/mightymike/MightyMikePalettePanel";
import { MightyMikeResizeMapControls } from "@/editor/subviews/mightymike/MightyMikeResizeMapControls";
import type { ReactNode } from "react";

interface TileMenuShellProps {
  readonly children: ReactNode;
}

export function MightyMikeTileMenuShell({ children }: TileMenuShellProps) {
  return (
    <div className="flex flex-col gap-2 p-2 flex-1 min-h-0 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export const MightyMikePanels = {
  Operations: MightyMikeTileOperationsPanel,
  Inspector: MightyMikeTileInspectorPanel,
  Palette: MightyMikePalettePanel,
  Resize: MightyMikeResizeMapControls,
};
