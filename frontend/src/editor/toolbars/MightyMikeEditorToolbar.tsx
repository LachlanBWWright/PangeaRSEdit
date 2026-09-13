/**
 * Mighty Mike Editor Toolbar
 *
 * Features:
 * - Items view
 * - Visual Tiles view (for editing background tile graphics)
 * - Behavior Tiles view (for collision, flags, and alt-map painting)
 * - NO fences, water, or splines (Mighty Mike is 2D only)
 */

import { memo } from "react";
import { useAtom } from "jotai";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { useFeatureFlags } from "@/config/useFeatureFlags";
import { View } from "../viewEnum";

interface Props {
  compact?: boolean;
}

export const MightyMikeEditorToolbar = memo(function MightyMikeEditorToolbar({
  compact,
}: Props) {
  const [view, setView] = useAtom(ActiveView);
  const { levelMetadata } = useFeatureFlags();
  const currentValue =
    view === View.items
      ? "items"
      : view === View.scripts
        ? "scripts"
      : view === View.metadata && levelMetadata
        ? "metadata"
      : view === View.supertiles
        ? "supertiles"
      : view === View.tiles
          ? "tiles"
          : view === View.animations
            ? "animations"
          : "supertiles";

  const handleValueChange = (value: string) => {
    if (value === "items") setView(View.items);
    else if (value === "scripts") setView(View.scripts);
    else if (value === "metadata" && levelMetadata) setView(View.metadata);
    else if (value === "supertiles") setView(View.supertiles);
    else if (value === "tiles") setView(View.tiles);
    else if (value === "animations") setView(View.animations);
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
          {ENABLE_SCRIPTS ? (
            <TabsTrigger className="w-full" value="scripts">
              Scripts
            </TabsTrigger>
          ) : null}
          {levelMetadata ? <TabsTrigger className="w-full" value="metadata">Metadata</TabsTrigger> : null}
          <TabsTrigger className="w-full" value="supertiles">
            Visual Tiles
          </TabsTrigger>
          <TabsTrigger className="w-full" value="tiles">
            Behavior Tiles
          </TabsTrigger>
          <TabsTrigger className="w-full" value="animations">
            Animations
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!compact && <Separator />}
    </>
  );
});
