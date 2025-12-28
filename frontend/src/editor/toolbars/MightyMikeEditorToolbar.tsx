/**
 * Mighty Mike Editor Toolbar
 * 
 * Features:
 * - Items view
 * - Supertiles view (for editing background tile grid)
 * - Tiles view (for tile attributes - shown as Tiles)
 * - NO fences, water, or splines (Mighty Mike is 2D only)
 */

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { View } from "../viewEnum";

interface Props {
  view: View;
  setView: (v: View) => void;
  undoData: () => void;
  redoData: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  dataHistoryIndex: number;
  dataHistoryLength: number;
}

export function MightyMikeEditorToolbar({
  view,
  setView,
  undoData,
  redoData,
  zoomIn,
  zoomOut,
  dataHistoryIndex,
  dataHistoryLength,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-5 gap-2 w-full overflow-clip">
        <Button
          selected={view === View.items}
          onClick={() => setView(View.items)}
        >
          Items
        </Button>
        <Button
          selected={view === View.supertiles}
          onClick={() => setView(View.supertiles)}
        >
          Supertiles
        </Button>
        <Button
          selected={view === View.tiles}
          onClick={() => setView(View.tiles)}
        >
          Tiles
        </Button>
        <div className="grid col-span-2 grid-cols-4 gap-2">
          <Button
            variant="zoom"
            disabled={dataHistoryIndex === 0}
            onClick={undoData}
          >
            ↩
          </Button>
          <Button
            variant="zoom"
            disabled={dataHistoryIndex === dataHistoryLength - 1}
            onClick={redoData}
          >
            ↪
          </Button>

          <Button variant="zoom" onClick={zoomOut}>
            -
          </Button>
          <Button variant="zoom" onClick={zoomIn}>
            +
          </Button>
        </div>
      </div>
      <Separator />
    </>
  );
}
