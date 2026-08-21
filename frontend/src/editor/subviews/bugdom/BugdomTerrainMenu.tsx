import { useAtom } from "jotai";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Updater } from "use-immer";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { bugdomTerrainModeAtom } from "@/data/terrain/bugdomTerrainModeAtoms";
import { IndividualTilesMenu } from "@/editor/gameViews/IndividualTilesMenu";
import { BugdomVertexColorMenu } from "./BugdomVertexColorMenu";

interface BugdomTerrainMenuProps {
  readonly headerData: HeaderData;
  readonly setHeaderData: Updater<HeaderData>;
  readonly terrainData: TerrainData;
}

export function BugdomTerrainMenu({
  headerData,
  setHeaderData,
  terrainData,
}: BugdomTerrainMenuProps) {
  const [mode, setMode] = useAtom(bugdomTerrainModeAtom);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Tabs value={mode} onValueChange={(value) => {
        if (value === "topology" || value === "vertex-colors") {
          setMode(value);
        }
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topology">Topology</TabsTrigger>
          <TabsTrigger value="vertex-colors">Vertex coloring</TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "topology" ? (
        <IndividualTilesMenu
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
        />
      ) : (
        <BugdomVertexColorMenu terrainData={terrainData} />
      )}
    </div>
  );
}
