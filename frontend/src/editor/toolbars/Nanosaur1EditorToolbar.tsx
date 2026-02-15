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
  terrainHasSTgd?: boolean;
}

export function Nanosaur1EditorToolbar({
  view,
  setView,
  terrainHasSTgd,
}: Props) {
  return (
    <>
      <div className="grid grid-flow-col auto-cols-fr gap-2 w-full overflow-clip">
        <Button className="w-full" selected={view === View.items} onClick={() => setView(View.items)}>Items</Button>
        <Button className="w-full" selected={view === View.tiles} onClick={() => setView(View.tiles)}>Tiles</Button>
        <Button className="w-full" disabled={!terrainHasSTgd} selected={view === View.supertiles} onClick={() => setView(View.supertiles)}>Supertiles</Button>
      </div>
      <Separator />
    </>
  );
}
