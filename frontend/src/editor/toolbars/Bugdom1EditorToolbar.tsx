/**
 * Bugdom 1 Editor Toolbar
 *
 * Features:
 * - Items view
 * - Fences view
 * - Splines view
 * - Tiles view
 * - Supertiles view
 * - NO water
 */

import { memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { View } from "../viewEnum";

interface Props {
  view: View;
  setView: (v: View) => void;
  terrainHasSTgd?: boolean;
  compact?: boolean;
}

export const Bugdom1EditorToolbar = memo(function Bugdom1EditorToolbar({
  view,
  setView,
  terrainHasSTgd,
  compact,
}: Props) {
  const currentValue =
    view === View.fences
      ? "fences"
      : view === View.items
        ? "items"
        : view === View.splines
          ? "splines"
          : view === View.tiles
            ? "tiles"
            : "supertiles";

  const handleValueChange = (value: string) => {
    if (value === "fences") setView(View.fences);
    else if (value === "items") setView(View.items);
    else if (value === "splines") setView(View.splines);
    else if (value === "tiles") setView(View.tiles);
    else if (value === "supertiles") setView(View.supertiles);
  };

  return (
    <>
      <Tabs
        className="flex-1"
        value={currentValue}
        onValueChange={handleValueChange}
      >
        <TabsList
          className={
            compact
              ? "grid grid-flow-col auto-cols-fr w-full overflow-clip"
              : "grid grid-flow-col auto-cols-max gap-2 w-max min-w-max overflow-x-auto"
          }
        >
          <TabsTrigger className="w-full" value="fences">
            Fences
          </TabsTrigger>
          <TabsTrigger className="w-full" value="items">
            Items
          </TabsTrigger>
          <TabsTrigger className="w-full" value="splines">
            Splines
          </TabsTrigger>
          <TabsTrigger className="w-full" value="tiles">
            Tiles
          </TabsTrigger>
          <TabsTrigger className="w-full" value="supertiles" disabled={!terrainHasSTgd}>
            Supertiles
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!compact && <Separator />}
    </>
  );
});
