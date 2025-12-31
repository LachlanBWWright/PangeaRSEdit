import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useAtomValue } from "jotai";
import { Globals } from "../data/globals/globals";
import { View } from "./viewEnum";

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

export function EditorToolbar({
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
  const globals = useAtomValue(Globals);

  // Check if game supports features based on type mappings
  const gameSupportsFences = !!globals.FENCE_TYPES;
  const gameSupportsLiquids = !!globals.WATER_TYPES;

  // Only show fences button if game supports fences AND we have fence data (or game supports fences in general)
  const showFences = gameSupportsFences && hasFenceData !== false;
  // Only show water button if game supports liquids AND we have liquid data (or game supports liquids in general)
  const showWater = gameSupportsLiquids && hasLiquidData !== false;

  return (
    <>
      <div className="grid grid-cols-4 xl:grid-cols-7 gap-2 w-full overflow-clip">
        {showFences && (
          <Button
            selected={view === View.fences}
            onClick={() => { setView(View.fences); }}
          >
            Fences
          </Button>
        )}
        {showWater && (
          <Button
            selected={view === View.water}
            onClick={() => { setView(View.water); }}
          >
            Water
          </Button>
        )}
        <Button
          selected={view === View.items}
          onClick={() => { setView(View.items); }}
        >
          Items
        </Button>
        <Button
          selected={view === View.splines}
          onClick={() => { setView(View.splines); }}
        >
          Splines
        </Button>
        <Button
          selected={view === View.tiles}
          onClick={() => { setView(View.tiles); }}
        >
          Tiles
        </Button>
        <Button
          disabled={!terrainHasSTgd}
          selected={view === View.supertiles}
          onClick={() => { setView(View.supertiles); }}
        >
          Supertiles
        </Button>
        <div className="grid col-span-2 xl:col-span-1 grid-cols-4 gap-2">
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
