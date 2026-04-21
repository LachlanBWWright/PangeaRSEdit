/**
 * Mighty Mike Editor Toolbar
 *
 * Features:
 * - Items view
 * - Supertiles view (for editing background tile grid)
 * - Tiles view (for tile attributes - shown as Tiles)
 * - NO fences, water, or splines (Mighty Mike is 2D only)
 */

import { memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { View } from "../viewEnum";
import { useAtom } from "jotai";
import { ActiveView } from "@/data/globals/activeViewAtom";

interface Props {
  compact?: boolean;
}

export const MightyMikeEditorToolbar = memo(function MightyMikeEditorToolbar({
  compact,
}: Props) {
  const [view, setView] = useAtom(ActiveView);
  const currentValue =
    view === View.items
      ? "items"
      : view === View.supertiles
        ? "supertiles"
        : "tiles";

  const handleValueChange = (value: string) => {
    if (value === "items") setView(View.items);
    else if (value === "supertiles") setView(View.supertiles);
    else if (value === "tiles") setView(View.tiles);
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
          <TabsTrigger className="w-full" value="items">
            Items
          </TabsTrigger>
          <TabsTrigger className="w-full" value="supertiles">
            Supertiles
          </TabsTrigger>
          <TabsTrigger className="w-full" value="tiles">
            Tiles
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!compact && <Separator />}
    </>
  );
});
