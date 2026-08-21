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
import { useAtom } from "jotai";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";

interface Props {
  compact?: boolean;
}

export const Bugdom1EditorToolbar = memo(function Bugdom1EditorToolbar({
  compact,
}: Props) {
  const [view, setView] = useAtom(ActiveView);
  const currentValue =
    view === View.fences
      ? "fences"
      : view === View.items
        ? "items"
        : view === View.splines
          ? "splines"
          : view === View.scripts
            ? "scripts"
          : view === View.vertexColors
            ? "metadata"
          : view === View.tiles
            ? "tiles"
            : "supertiles";

  const handleValueChange = (value: string) => {
    if (value === "fences") setView(View.fences);
    else if (value === "items") setView(View.items);
    else if (value === "splines") setView(View.splines);
    else if (value === "scripts") setView(View.scripts);
    else if (value === "metadata") setView(View.vertexColors);
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
          {ENABLE_SCRIPTS ? (
            <TabsTrigger className="w-full" value="scripts">
              Scripts
            </TabsTrigger>
          ) : null}
          <TabsTrigger className="w-full" value="tiles">
            Terrain
          </TabsTrigger>
          <TabsTrigger className="w-full" value="supertiles">
            Visual Tiles
          </TabsTrigger>
          <TabsTrigger className="w-full" value="metadata">
            Metadata
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!compact && <Separator />}
    </>
  );
});
