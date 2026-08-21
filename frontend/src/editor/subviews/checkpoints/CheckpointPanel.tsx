import { useAtom, useAtomValue } from "jotai";
import type { Updater } from "use-immer";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { selectedCheckpointAtom } from "@/data/checkpoints/checkpointAtoms";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Globals } from "@/data/globals/globals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CheckpointPanelProps {
  readonly headerData: HeaderData;
  readonly setHeaderData: Updater<HeaderData>;
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
}

export function CheckpointPanel({
  headerData,
  setHeaderData,
  terrainData,
  setTerrainData,
}: CheckpointPanelProps) {
  const [selected, setSelected] = useAtom(selectedCheckpointAtom);
  const globals = useAtomValue(Globals);
  const checkpoints = terrainData.CkPt?.[1000]?.obj ?? [];
  const checkpoint = selected === null ? undefined : checkpoints[selected];

  const updateCoordinate = (field: "x1" | "x2" | "z1" | "z2", value: string) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || selected === null) return;
    setTerrainData((draft) => {
      const target = draft.CkPt?.[1000]?.obj[selected];
      if (target) target[field] = parsed;
    });
  };

  const addCheckpoint = () => {
    const nextIndex = checkpoints.length;
    const centerX = (headerData.Hedr[1000].obj.mapWidth * globals.TILE_SIZE) / 2;
    const centerZ = (headerData.Hedr[1000].obj.mapHeight * globals.TILE_SIZE) / 2;
    setTerrainData((draft) => {
      if (!draft.CkPt) {
        draft.CkPt = {
          1000: { name: "Checkpoint List", obj: [], order: 0 },
        };
      }
      draft.CkPt[1000].obj.push({
        unused: 0,
        infoBits: 0,
        x1: centerX - 50,
        z1: centerZ,
        x2: centerX + 50,
        z2: centerZ,
      });
    });
    setHeaderData((draft) => {
      draft.Hedr[1000].obj.numCheckpoints = nextIndex + 1;
    });
    setSelected(nextIndex);
  };

  const deleteCheckpoint = () => {
    if (selected === null) return;
    setTerrainData((draft) => {
      draft.CkPt?.[1000]?.obj.splice(selected, 1);
    });
    setHeaderData((draft) => {
      draft.Hedr[1000].obj.numCheckpoints = Math.max(0, checkpoints.length - 1);
    });
    setSelected(null);
  };

  const moveCheckpoint = (offset: -1 | 1) => {
    if (selected === null) return;
    const destination = selected + offset;
    if (destination < 0 || destination >= checkpoints.length) return;
    setTerrainData((draft) => {
      const list = draft.CkPt?.[1000]?.obj;
      const current = list?.[selected];
      const target = list?.[destination];
      if (!list || !current || !target) return;
      list[selected] = target;
      list[destination] = current;
    });
    setSelected(destination);
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <strong>Checkpoints</strong>
      <div className="flex items-center gap-2">
        <Select
          value={selected === null ? undefined : String(selected)}
          onValueChange={(nextValue) => {
            const value = Number.parseInt(nextValue, 10);
            setSelected(Number.isNaN(value) ? null : value);
          }}
        >
          <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Select checkpoint" /></SelectTrigger>
          <SelectContent>
            {checkpoints.map((_entry, index) => (
              <SelectItem key={index} value={String(index)}>Checkpoint {index}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addCheckpoint}>
          Add
        </Button>
        <Button
          size="icon"
          className="h-8 w-8"
          variant="outline"
          disabled={selected === null || selected === 0}
          aria-label="Move checkpoint earlier"
          onClick={() => moveCheckpoint(-1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8"
          variant="outline"
          disabled={selected === null || selected >= checkpoints.length - 1}
          aria-label="Move checkpoint later"
          onClick={() => moveCheckpoint(1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={!checkpoint}
          onClick={deleteCheckpoint}
        >
          Delete
        </Button>
      </div>
      {checkpoint && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
          {(["x1", "z1", "x2", "z2"] as const).map((field) => (
            <label key={field} className="contents">
              <span>{field.toUpperCase()}</span>
              <Input
                type="number"
                value={checkpoint[field]}
                onChange={(event) =>
                  updateCoordinate(field, event.currentTarget.value)
                }
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
