import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { TileBrush, TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";
import { TileBrushThumbnail } from "./TileBrushThumbnail";

interface TileBrushSelectProps {
  readonly brushes: readonly TileBrush[];
  readonly selectedBrush: TileBrush | null;
  readonly game: TileBrushGame;
  readonly mapImages: readonly HTMLCanvasElement[];
  readonly xlatTable: readonly unknown[] | undefined;
  readonly onSelect: (id: string) => void;
}

function BrushSummary({
  brush,
  game,
  mapImages,
  xlatTable,
  number,
}: Omit<TileBrushSelectProps, "brushes" | "selectedBrush" | "onSelect"> & {
  readonly brush: TileBrush;
  readonly number: number;
}) {
  return (
    <span className="!flex min-w-0 flex-row items-center gap-2">
      <TileBrushThumbnail
        brush={brush}
        game={game}
        mapImages={mapImages}
        xlatTable={xlatTable}
      />
      <span className="min-w-0 text-left">
        <span className="block truncate text-xs text-gray-100">Stamp #{number}</span>
        <span className="block text-[11px] text-gray-400">
          {brush.width} × {brush.height}
        </span>
      </span>
    </span>
  );
}

export function TileBrushSelect({
  brushes,
  selectedBrush,
  game,
  mapImages,
  xlatTable,
  onSelect,
}: TileBrushSelectProps) {
  if (brushes.length === 0) {
    return (
      <div className="rounded border border-gray-700 p-2 text-xs text-gray-500">
        No stamps yet
      </div>
    );
  }

  const selectedBrushNumber = selectedBrush
    ? brushes.findIndex((brush) => brush.id === selectedBrush.id) + 1
    : 0;

  return (
    <Select value={selectedBrush?.id} onValueChange={onSelect}>
      <SelectTrigger className="h-12 min-h-12 w-full py-1.5">
        {selectedBrush ? (
          <BrushSummary
            brush={selectedBrush}
            number={selectedBrushNumber}
            game={game}
            mapImages={mapImages}
            xlatTable={xlatTable}
          />
        ) : (
          <span className="text-xs text-gray-400">Select a stamp</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {brushes.map((brush, index) => (
          <SelectItem key={brush.id} value={brush.id} className="py-1.5">
            <BrushSummary
              brush={brush}
              number={index + 1}
              game={game}
              mapImages={mapImages}
              xlatTable={xlatTable}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
