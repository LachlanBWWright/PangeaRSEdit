/**
 * Nanosaur 1 Editor Toolbar
 * 
 * Features:
 * - Items view
 * - Tiles view
 * - Supertiles view
 * - NO fences, water, or splines
 */

import { memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { View } from "../viewEnum";

interface Props {
  view: View;
  setView: (v: View) => void;
  terrainHasSTgd?: boolean;
}

export const Nanosaur1EditorToolbar = memo(function Nanosaur1EditorToolbar({
  view,
  setView,
  terrainHasSTgd,
}: Props) {
  const currentValue =
    view === View.items
      ? "items"
      : view === View.tiles
      ? "tiles"
      : "supertiles";

  const handleValueChange = (value: string) => {
    if (value === "items") setView(View.items);
    else if (value === "tiles") setView(View.tiles);
    else if (value === "supertiles") setView(View.supertiles);
  };

  return (
    <>
      <Tabs value={currentValue} onValueChange={handleValueChange}>
        <TabsList className="grid grid-flow-col auto-cols-fr gap-2 w-full overflow-clip">
          <TabsTrigger className="w-full" value="items">Items</TabsTrigger>
          <TabsTrigger className="w-full" value="tiles">Tiles</TabsTrigger>
          <TabsTrigger className="w-full" value="supertiles" disabled={!terrainHasSTgd}>
            Supertiles
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Separator />
    </>
  );
});
