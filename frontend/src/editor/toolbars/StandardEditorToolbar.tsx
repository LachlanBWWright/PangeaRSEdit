/**
 * Standard Editor Toolbar
 * For Otto Matic, Bugdom 2, Nanosaur 2, Cro-Mag Rally, Billy Frontier
 *
 * Features:
 * - All views enabled: Fences, Water, Items, Splines, Tiles, Supertiles
 */

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { View } from "../viewEnum";
import { memo } from "react";

interface Props {
  view: View;
  setView: (v: View) => void;
  terrainHasSTgd?: boolean;
}

export const StandardEditorToolbar = memo(function StandardEditorToolbar({
  view,
  setView,
  terrainHasSTgd,
}: Props) {
  const currentValue =
    view === View.fences
      ? "fences"
      : view === View.water
      ? "water"
      : view === View.items
      ? "items"
      : view === View.splines
      ? "splines"
      : view === View.tiles
      ? "tiles"
      : "supertiles";

  const handleValueChange = (value: string) => {
    if (value === "fences") setView(View.fences);
    else if (value === "water") setView(View.water);
    else if (value === "items") setView(View.items);
    else if (value === "splines") setView(View.splines);
    else if (value === "tiles") setView(View.tiles);
    else if (value === "supertiles") setView(View.supertiles);
  };

  return (
    <>
      <Tabs value={currentValue} onValueChange={handleValueChange}>
        <TabsList className="grid grid-flow-col auto-cols-fr gap-2 w-full overflow-clip">
          <TabsTrigger className="w-full" value="fences">Fences</TabsTrigger>
          <TabsTrigger className="w-full" value="water">Water</TabsTrigger>
          <TabsTrigger className="w-full" value="items">Items</TabsTrigger>
          <TabsTrigger className="w-full" value="splines">Splines</TabsTrigger>
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
