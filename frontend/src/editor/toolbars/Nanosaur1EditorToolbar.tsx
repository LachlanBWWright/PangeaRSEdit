/**
 * Nanosaur 1 Editor Toolbar
 * 
 * Features:
 * - Items view
 * - Tiles view
 * - Supertiles view
 * - NO fences, water, or splines
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
}

export function Nanosaur1EditorToolbar({
  view,
  setView,
  undoData,
  redoData,
  zoomIn,
  zoomOut,
  dataHistoryIndex,
  dataHistoryLength,
  terrainHasSTgd,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 w-full overflow-clip">
        <Button className="w-full" selected={view === View.items} onClick={() => setView(View.items)}>Items</Button>
        <Button className="w-full" selected={view === View.tiles} onClick={() => setView(View.tiles)}>Tiles</Button>
        <Button className="w-full" disabled={!terrainHasSTgd} selected={view === View.supertiles} onClick={() => setView(View.supertiles)}>Supertiles</Button>
        <Button className="w-full" variant="zoom" disabled={dataHistoryIndex === 0} onClick={undoData}>↩</Button>
        <Button className="w-full" variant="zoom" disabled={dataHistoryIndex === dataHistoryLength - 1} onClick={redoData}>↪</Button>

        <Button className="w-full" variant="zoom" onClick={zoomOut}>-</Button>
        <Button className="w-full" variant="zoom" onClick={zoomIn}>+</Button>
      </div>
      <Separator />
    </>
  );
}
