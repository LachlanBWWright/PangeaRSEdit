import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getSelectedTileBrushIdAtom,
  getTileBrushAnchorAtom,
  tileBrushesAtom,
  getTileBrushModeAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import type { TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";
import {
  flipTileBrushHorizontal,
  flipTileBrushVertical,
  rotateTileBrushClockwise,
} from "@/data/tileBrushes/tileBrushTransforms";
import { TileBrushSelect } from "./TileBrushSelect";
import { TileTransformActions } from "../shared/TileTransformActions";

interface TileBrushPanelProps {
  game: TileBrushGame;
  mapImages: readonly HTMLCanvasElement[];
  xlatTable: readonly unknown[] | undefined;
}

export function TileBrushPanel({
  game,
  mapImages,
  xlatTable,
}: TileBrushPanelProps) {
  const [allBrushes, setBrushes] = useAtom(tileBrushesAtom);
  const [selectedBrushId, setSelectedBrushId] = useAtom(
    getSelectedTileBrushIdAtom(game),
  );
  const [mode, setMode] = useAtom(getTileBrushModeAtom(game));
  const [anchor, setAnchor] = useAtom(getTileBrushAnchorAtom(game));

  const brushes = allBrushes.filter((brush) => brush.game === game);
  const selectedBrush = brushes.find((brush) => brush.id === selectedBrushId) ?? null;

  const handleTransform = (transform: "rotate" | "flipX" | "flipY") => {
    if (!selectedBrush) {
      toast.error("Select a stamp first");
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

  return (
    <div className="space-y-2.5 p-1">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs text-gray-400">Stamp</Label>
          <TileBrushSelect
            brushes={brushes}
            selectedBrush={selectedBrush}
            game={game}
            mapImages={mapImages}
            xlatTable={xlatTable}
            onSelect={(brushId) => {
              setSelectedBrushId(brushId);
              setMode("stamp");
            }}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setMode("capture")}>
          Add
        </Button>
      </div>

      {mode === "capture" ? (
        <p className="text-xs text-gray-400">
          Drag on the map to capture a reusable stamp.
        </p>
      ) : null}

      <TileTransformActions
        onRotate={() => handleTransform("rotate")}
        onFlipHorizontal={() => handleTransform("flipX")}
        onFlipVertical={() => handleTransform("flipY")}
        disabled={!selectedBrush}
      />

      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <Label className="text-xs text-gray-400">Anchor</Label>
        <Select
          value={anchor}
          onValueChange={(value) => {
            if (value === "topLeft" || value === "center") {
              setAnchor(value);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="topLeft">Top-left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}
