import { useAtom, useAtomValue } from "jotai";
import type { Updater } from "use-immer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { selectedPathAtom } from "@/data/paths/pathAtoms";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Globals } from "@/data/globals/globals";

const PRIMARY_PATH = 1;
const Y_CLOSE_PATH = 1 << 1;

interface CroMagPathPanelProps {
  readonly headerData: HeaderData;
  readonly setHeaderData: Updater<HeaderData>;
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
}

function setPathFlag(
  setTerrainData: Updater<TerrainData>,
  pathIndex: number,
  mask: number,
  enabled: boolean,
): void {
  setTerrainData((draft) => {
    const path = draft.Path?.[1000]?.obj[pathIndex];
    if (!path) return;
    path.flags = enabled ? path.flags | mask : path.flags & ~mask;
  });
}

export function CroMagPathPanel({
  headerData,
  setHeaderData,
  terrainData,
  setTerrainData,
}: CroMagPathPanelProps) {
  const [selectedPath, setSelectedPath] = useAtom(selectedPathAtom);
  const globals = useAtomValue(Globals);
  const paths = terrainData.Path?.[1000]?.obj ?? [];
  const selected = selectedPath === null ? undefined : paths[selectedPath];
  const points =
    selectedPath === null
      ? []
      : (terrainData.PaPt?.[1000 + selectedPath]?.obj ?? []);

  const addPath = () => {
    const pathIndex = paths.length;
    const header = headerData.Hedr[1000].obj;
    const centerX = (header.mapWidth * globals.TILE_SIZE) / 2;
    const centerZ = (header.mapHeight * globals.TILE_SIZE) / 2;
    setTerrainData((draft) => {
      if (!draft.Path) {
        draft.Path = { 1000: { name: "Path List", obj: [], order: 0 } };
      }
      if (!draft.PaPt) draft.PaPt = {};
      draft.Path[1000].obj.push({
        flags: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        numNubs: 0,
        numPoints: 2,
        bbTop: Math.round(centerZ - 50),
        bbLeft: Math.round(centerX - 50),
        bbBottom: Math.round(centerZ + 50),
        bbRight: Math.round(centerX + 50),
      });
      draft.PaPt[1000 + pathIndex] = {
        name: "Path Point List",
        obj: [
          { x: Math.round(centerX - 50), z: Math.round(centerZ) },
          { x: Math.round(centerX + 50), z: Math.round(centerZ) },
        ],
        order: 0,
      };
    });
    setHeaderData((draft) => {
      if ("numPaths" in draft.Hedr[1000].obj) {
        draft.Hedr[1000].obj.numPaths = pathIndex + 1;
      }
    });
    setSelectedPath(pathIndex);
  };

  const deletePath = () => {
    if (selectedPath === null) return;
    setTerrainData((draft) => {
      draft.Path?.[1000]?.obj.splice(selectedPath, 1);
      if (!draft.PaPt) return;
      const remaining = paths.filter((_path, index) => index !== selectedPath);
      const nextPointResources: NonNullable<TerrainData["PaPt"]> = {};
      remaining.forEach((_path, nextIndex) => {
        const oldIndex = nextIndex >= selectedPath ? nextIndex + 1 : nextIndex;
        const resource = draft.PaPt?.[1000 + oldIndex];
        if (resource) nextPointResources[1000 + nextIndex] = resource;
      });
      draft.PaPt = nextPointResources;
    });
    setHeaderData((draft) => {
      if ("numPaths" in draft.Hedr[1000].obj) {
        draft.Hedr[1000].obj.numPaths = Math.max(0, paths.length - 1);
      }
    });
    setSelectedPath(null);
  };

  const addPoint = () => {
    if (selectedPath === null) return;
    setTerrainData((draft) => {
      const path = draft.Path?.[1000]?.obj[selectedPath];
      const resource = draft.PaPt?.[1000 + selectedPath];
      if (!path || !resource) return;
      const last = resource.obj.at(-1) ?? { x: 0, z: 0 };
      resource.obj.push({ x: last.x + 25, z: last.z });
      path.numPoints = resource.obj.length;
    });
  };

  const deletePoint = () => {
    if (selectedPath === null || points.length <= 2) return;
    setTerrainData((draft) => {
      const path = draft.Path?.[1000]?.obj[selectedPath];
      const resource = draft.PaPt?.[1000 + selectedPath];
      if (!path || !resource) return;
      resource.obj.pop();
      path.numPoints = resource.obj.length;
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-600 p-2 text-sm">
      <strong>Racing Paths</strong>
      <div className="flex gap-2">
        <select
          className="min-w-0 flex-1 rounded bg-gray-800 px-2 py-1"
          value={selectedPath ?? ""}
          onChange={(event) => {
            const value = Number.parseInt(event.currentTarget.value, 10);
            setSelectedPath(Number.isNaN(value) ? null : value);
          }}
        >
          <option value="">Select path</option>
          {paths.map((_path, index) => (
            <option key={index} value={index}>Path {index}</option>
          ))}
        </select>
        <Button size="sm" onClick={addPath}>Add</Button>
        <Button size="sm" variant="destructive" disabled={!selected} onClick={deletePath}>Delete</Button>
      </div>
      {selected && selectedPath !== null && (
        <>
          <label className="flex items-center gap-2">
            <Checkbox checked={(selected.flags & PRIMARY_PATH) !== 0} onCheckedChange={(checked) => setPathFlag(setTerrainData, selectedPath, PRIMARY_PATH, checked === true)} />
            Primary path
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={(selected.flags & Y_CLOSE_PATH) !== 0} onCheckedChange={(checked) => setPathFlag(setTerrainData, selectedPath, Y_CLOSE_PATH, checked === true)} />
            Require similar height
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1">{points.length} points</span>
            <Button size="sm" onClick={addPoint}>Add point</Button>
            <Button size="sm" variant="destructive" disabled={points.length <= 2} onClick={deletePoint}>Remove last</Button>
          </div>
        </>
      )}
    </div>
  );
}
