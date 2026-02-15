/**
 * Mighty Mike Editor Toolbar
 * 
 * Features:
 * - Items view
 * - Supertiles view (for editing background tile grid)
 * - Tiles view (for tile attributes - shown as Tiles)
 * - NO fences, water, or splines (Mighty Mike is 2D only)
 */

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { View } from "../viewEnum";

interface Props {
  view: View;
  setView: (v: View) => void;
}

export function MightyMikeEditorToolbar({
  view,
  setView,
}: Props) {
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
      <Tabs value={currentValue} onValueChange={handleValueChange}>
        <TabsList className="grid grid-flow-col auto-cols-fr gap-2 w-full overflow-clip">
          <TabsTrigger className="w-full" value="items">Items</TabsTrigger>
          <TabsTrigger className="w-full" value="supertiles">Supertiles</TabsTrigger>
          <TabsTrigger className="w-full" value="tiles">Tiles</TabsTrigger>
        </TabsList>
      </Tabs>
      <Separator />
    </>
  );
}
