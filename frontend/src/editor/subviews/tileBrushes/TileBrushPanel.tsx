import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  selectedTileBrushIdAtom,
  tileBrushAnchorAtom,
  tileBrushesAtom,
  tileBrushModeAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import type { TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";
import {
  applyTileBrush,
  createTileBrushFromRegion,
} from "@/data/tileBrushes/tileBrushApply";
import {
  flipTileBrushHorizontal,
  flipTileBrushVertical,
  renameTileBrush,
  rotateTileBrushClockwise,
} from "@/data/tileBrushes/tileBrushTransforms";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import {
  exportTileBrushesToJson,
  parseTileBrushesFromJson,
} from "@/data/tileBrushes/tileBrushImportExport";

interface TileBrushPanelProps {
  game: TileBrushGame;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapWidth: number;
  mapHeight: number;
  selectedTileIndex: number;
  activeLayer: 1000 | 1001;
}

function getTileCoordinates(
  tileIndex: number,
  mapWidth: number,
): { x: number; y: number } {
  return {
    x: tileIndex % mapWidth,
    y: Math.floor(tileIndex / mapWidth),
  };
}

export function TileBrushPanel({
  game,
  terrainData,
  setTerrainData,
  mapWidth,
  mapHeight,
  selectedTileIndex,
  activeLayer,
}: TileBrushPanelProps) {
  const [brushes, setBrushes] = useAtom(tileBrushesAtom);
  const [selectedBrushId, setSelectedBrushId] = useAtom(
    selectedTileBrushIdAtom,
  );
  const [mode, setMode] = useAtom(tileBrushModeAtom);
  const [anchor, setAnchor] = useAtom(tileBrushAnchorAtom);

  const selectedBrush =
    brushes.find((brush) => brush.id === selectedBrushId) ?? null;

  const handleCaptureSingleTile = () => {
    const tileCoords = getTileCoordinates(selectedTileIndex, mapWidth);
    const result = createTileBrushFromRegion({
      id: globalThis.crypto.randomUUID(),
      name: `Brush ${brushes.length + 1}`,
      game,
      terrainData,
      layer: activeLayer,
      mapWidth,
      mapHeight,
      startX: tileCoords.x,
      startY: tileCoords.y,
      width: 1,
      height: 1,
    });

    if (result.isErr()) {
      toast.error("Failed to capture tile brush", {
        description: result.error,
      });
      return;
    }

    setBrushes([...brushes, result.value]);
    setSelectedBrushId(result.value.id);
    toast.success(`Captured brush '${result.value.name}'`);
  };

  const handleStamp = () => {
    if (!selectedBrush) {
      toast.error("Select a tile brush before stamping");
      return;
    }

    const tileCoords = getTileCoordinates(selectedTileIndex, mapWidth);
    setTerrainData((draft) => {
      applyTileBrush({
        draft,
        layer: activeLayer,
        mapWidth,
        mapHeight,
        targetX: tileCoords.x,
        targetY: tileCoords.y,
        brush: selectedBrush,
        anchor,
      });
    });
    toast.success(`Stamped '${selectedBrush.name}'`);
  };

  const handleTransform = (transform: "rotate" | "flipX" | "flipY") => {
    if (!selectedBrush) {
      toast.error("Select a tile brush first");
      return;
    }

    setBrushes((current) =>
      current.map((brush) => {
        if (brush.id !== selectedBrush.id) {
          return brush;
        }
        if (transform === "rotate") {
          return rotateTileBrushClockwise(brush);
        }
        if (transform === "flipX") {
          return flipTileBrushHorizontal(brush);
        }
        return flipTileBrushVertical(brush);
      }),
    );
  };

  const handleExport = () => {
    const blob = new Blob([exportTileBrushesToJson(brushes)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchorElement = document.createElement("a");
    anchorElement.href = url;
    anchorElement.download = "tile-brushes.json";
    anchorElement.click();
    URL.revokeObjectURL(url);
    toast.success("Exported tile brushes");
  };

  const handleImport = async (file: File | null) => {
    if (!file) {
      return;
    }

    const content = await file.text();
    const result = parseTileBrushesFromJson(content);
    if (result.isErr()) {
      toast.error("Failed to import tile brushes", {
        description: result.error,
      });
      return;
    }

    const compatible = result.value.filter((brush) => brush.game === game);
    setBrushes(compatible);
    setSelectedBrushId(compatible[0]?.id ?? null);
    toast.success(`Imported ${compatible.length} brush(es)`);
  };

  return (
    <div className="rounded border border-gray-700 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Tile Pattern Brushes
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "capture" ? "default" : "outline"}
            onClick={() => setMode("capture")}
          >
            Capture
          </Button>
          <Button
            size="sm"
            variant={mode === "stamp" ? "default" : "outline"}
            onClick={() => setMode("stamp")}
          >
            Stamp
          </Button>
          <Button
            size="sm"
            variant={mode === "select" ? "default" : "outline"}
            onClick={() => setMode("select")}
          >
            Select
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {mode === "capture"
          ? "Drag on the map to capture a multi-tile stamp."
          : mode === "stamp"
            ? "Click the map to stamp the selected brush."
            : "Use Select to inspect tiles without stamping."}
      </p>

      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Brushes</Label>
        <div className="max-h-32 overflow-y-auto border border-gray-700 rounded">
          {brushes.length === 0 ? (
            <p className="p-2 text-xs text-gray-500">No brushes yet</p>
          ) : (
            brushes.map((brush) => (
              <button
                key={brush.id}
                type="button"
                className={`w-full px-2 py-1 text-left text-xs ${
                  brush.id === selectedBrushId
                    ? "bg-blue-900/40 text-white"
                    : "text-gray-300"
                }`}
                onClick={() => setSelectedBrushId(brush.id)}
              >
                {brush.name} ({brush.width}x{brush.height})
              </button>
            ))
          )}
        </div>
      </div>

      {selectedBrush && (
        <Input
          value={selectedBrush.name}
          onChange={(event) => {
            const nextName = event.target.value;
            setBrushes((current) =>
              current.map((brush) =>
                brush.id === selectedBrush.id
                  ? renameTileBrush(brush, nextName)
                  : brush,
              ),
            );
          }}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTransform("rotate")}
        >
          Rotate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTransform("flipX")}
        >
          Flip H
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTransform("flipY")}
        >
          Flip V
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={handleCaptureSingleTile}>
          Capture Selected Tile
        </Button>
        <Button size="sm" onClick={handleStamp}>
          Stamp at Selection
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-gray-400">Anchor</Label>
        <Button
          size="sm"
          variant={anchor === "topLeft" ? "default" : "outline"}
          onClick={() => setAnchor("topLeft")}
        >
          Top-left
        </Button>
        <Button
          size="sm"
          variant={anchor === "center" ? "default" : "outline"}
          onClick={() => setAnchor("center")}
        >
          Center
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleExport}>
          Export JSON
        </Button>
        <label className="text-xs text-gray-300 border border-gray-700 rounded px-2 py-1 cursor-pointer">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              void handleImport(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
