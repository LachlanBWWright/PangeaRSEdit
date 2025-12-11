/**
 * Standard Editor Toolbar
 * For Otto Matic, Bugdom 2, Nanosaur 2, Cro-Mag Rally, Billy Frontier
 * 
 * Features:
 * - All views enabled: Fences, Water, Items, Splines, Tiles, Supertiles
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
  terrainHasSTgd?: boolean;
  hasFenceData?: boolean;
  hasLiquidData?: boolean;
}

export function StandardEditorToolbar({
  view,
  setView,
  undoData,
  redoData,
  zoomIn,
  zoomOut,
  dataHistoryIndex,
  dataHistoryLength,
  terrainHasSTgd,
  hasFenceData,
  hasLiquidData,
}: Props) {
  const showFences = hasFenceData !== false;
  const showWater = hasLiquidData !== false;

  return (
    <>
      <div className="grid grid-cols-4 xl:grid-cols-7 gap-2 w-full overflow-clip">
        {showFences && (
          <Button
            selected={view === View.fences}
            onClick={() => setView(View.fences)}
          >
            Fences
          </Button>
        )}
        {showWater && (
          <Button
            selected={view === View.water}
            onClick={() => setView(View.water)}
          >
            Water
          </Button>
        )}
        <Button
          selected={view === View.items}
          onClick={() => setView(View.items)}
        >
          Items
        </Button>
        <Button
          selected={view === View.splines}
          onClick={() => setView(View.splines)}
        >
          Splines
        </Button>
        <Button
          selected={view === View.tiles}
          onClick={() => setView(View.tiles)}
        >
          Tiles
        </Button>
        <Button
          disabled={!terrainHasSTgd}
          selected={view === View.supertiles}
          onClick={() => setView(View.supertiles)}
        >
          Supertiles
        </Button>
        <div className="grid col-span-2 xl:grid-cols-1 grid-cols-4 gap-2">
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
