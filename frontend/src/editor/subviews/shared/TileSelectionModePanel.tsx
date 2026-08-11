import { useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSelectedTileBrushIdAtom,
  getTileBrushModeAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import type { TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";

interface TileSelectionModePanelProps {
  readonly game: TileBrushGame;
  readonly individualTile: ReactNode;
  readonly stampLibrary: ReactNode;
}

export function TileSelectionModePanel({
  game,
  individualTile,
  stampLibrary,
}: TileSelectionModePanelProps) {
  const [activeTab, setActiveTab] = useState<"individual" | "stamp">(
    "individual",
  );
  const [, setBrushMode] = useAtom(getTileBrushModeAtom(game));
  const selectedBrushId = useAtomValue(getSelectedTileBrushIdAtom(game));

  const handleTabChange = (value: string) => {
    if (value === "individual") {
      setActiveTab(value);
      setBrushMode("select");
      return;
    }
    if (value === "stamp") {
      setActiveTab(value);
      setBrushMode(selectedBrushId ? "stamp" : "select");
    }
  };

  return (
    <Tabs
      className="flex h-full min-h-0 flex-col"
      value={activeTab}
      onValueChange={handleTabChange}
    >
      <TabsList className="grid flex-none grid-cols-2">
        <TabsTrigger value="individual">Individual Tile</TabsTrigger>
        <TabsTrigger value="stamp">Stamp Mode</TabsTrigger>
      </TabsList>
      <TabsContent className="min-h-0 flex-1 overflow-auto" value="individual">
        {individualTile}
      </TabsContent>
      <TabsContent className="min-h-0 flex-1 overflow-auto" value="stamp">
        {stampLibrary}
      </TabsContent>
    </Tabs>
  );
}
