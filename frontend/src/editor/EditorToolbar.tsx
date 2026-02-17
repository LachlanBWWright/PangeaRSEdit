import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAtomValue } from "jotai";
import { Globals } from "../data/globals/globals";
import { View } from "./viewEnum";

interface Props {
  view: View;
  setView: (v: View) => void;
  terrainHasSTgd?: boolean;
  hasFenceData?: boolean;
  hasLiquidData?: boolean;
}

export function EditorToolbar({
  view,
  setView,
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
          {showFences && <TabsTrigger className="w-full" value="fences">Fences</TabsTrigger>}
          {showWater && <TabsTrigger className="w-full" value="water">Water</TabsTrigger>}
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
}
