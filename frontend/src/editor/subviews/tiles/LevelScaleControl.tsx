import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LevelScaleMode } from "@/editor/utils/levelScaleState";

interface LevelScaleControlProps {
  readonly tileSize: number;
  readonly supportsPlacementBehavior: boolean;
  readonly onApply: (nextTileSize: number, mode: LevelScaleMode) => void;
}

export function LevelScaleControl({
  tileSize,
  supportsPlacementBehavior,
  onApply,
}: LevelScaleControlProps) {
  const [value, setValue] = useState(String(tileSize));
  const [mode, setMode] = useState<LevelScaleMode>("scale-level");
  const parsed = Number.parseFloat(value);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <div className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:col-span-4">
      <p className="text-sm font-medium">Level scale</p>
      <Input
        type="number"
        min={0.001}
        step="any"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        aria-label="Tile world size"
      />
      {supportsPlacementBehavior && (
        <>
          <p className="text-sm font-medium">Placement behavior</p>
          <Select
            value={mode}
            onValueChange={(next) => {
              if (next === "scale-level" || next === "preserve-world-positions") {
                setMode(next);
              }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scale-level">Scale whole level</SelectItem>
              <SelectItem value="preserve-world-positions">
                Preserve object world positions
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      <p className="col-span-2 text-xs text-gray-400">
        {supportsPlacementBehavior
          ? "Changes the game's world size per terrain tile. Preservation mode inversely adjusts horizontal placement coordinates."
          : "Changes the game's heightmap scale per terrain tile."}
      </p>
      <Button
        className="col-span-2"
        size="sm"
        disabled={!valid || parsed === tileSize}
        onClick={() => {
          if (valid) onApply(parsed, mode);
        }}
      >
        Apply Level Scale
      </Button>
    </div>
  );
}
