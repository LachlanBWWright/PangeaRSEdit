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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
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
