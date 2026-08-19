/**
 * MightyMikeAltMapEditor.tsx
 *
 * Provides a paint-brush UI for editing the alt-map layer in Mighty Mike levels.
 * The alt-map encodes per-tile path direction data used by enemy AI.
 * Values: 0=None, 1=Up, 2=Up-Right, 3=Right, 4=Down-Right, 5=Down,
 *         6=Down-Left, 7=Left, 8=Left-Up, 9=Stop, 10=Loop
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { atom, useAtom } from "jotai";
import { Button } from "@/components/ui/button";

/** Currently selected alt-tile value for brush painting (0=None … 10=Loop). */
export const AltMapBrushValue = atom<number>(0);

/** Arrow glyphs and labels for each alt-tile value. */
export const ALT_TILE_OPTIONS: {
  value: number;
  label: string;
  glyph: string;
  color: string;
}[] = [
  { value: 0, label: "None", glyph: "○", color: "transparent" },
  { value: 1, label: "Up", glyph: "↑", color: "#ff0000" },
  { value: 2, label: "Up-Right", glyph: "↗", color: "#ff2200" },
  { value: 3, label: "Right", glyph: "→", color: "#ff0000" },
  { value: 4, label: "Down-Right", glyph: "↘", color: "#ff2200" },
  { value: 5, label: "Down", glyph: "↓", color: "#ff0000" },
  { value: 6, label: "Down-Left", glyph: "↙", color: "#ff2200" },
  { value: 7, label: "Left", glyph: "←", color: "#ff0000" },
  { value: 8, label: "Left-Up", glyph: "↖", color: "#ff2200" },
  { value: 9, label: "Stop", glyph: "✕", color: "#ffffff" },
  { value: 10, label: "Loop", glyph: "↺", color: "#ffff00" },
];

const DEFAULT_ALT_TILE_OPTION = ALT_TILE_OPTIONS[0] ?? {
  value: 0,
  label: "None",
  glyph: "○",
  color: "transparent",
};

export function MightyMikeAltMapEditorPanel() {
  const [brushValue, setBrushValue] = useAtom(AltMapBrushValue);
  const selected =
    ALT_TILE_OPTIONS.find((o) => o.value === brushValue) ??
    DEFAULT_ALT_TILE_OPTION;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Brush Direction
        </label>
        <Select
          value={brushValue.toString()}
          onValueChange={(v) => setBrushValue(parseInt(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {selected.glyph} {selected.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ALT_TILE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                <span className="font-mono mr-2">{opt.glyph}</span>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {ALT_TILE_OPTIONS.filter((o) => o.value > 0).map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant="selectable"
            aria-pressed={brushValue === opt.value}
            className="h-auto flex-col px-1 py-2"
            onClick={() => setBrushValue(opt.value)}
            title={opt.label}
          >
            <span className="text-lg">{opt.glyph}</span>
          </Button>
        ))}
        <Button
          key={0}
          type="button"
          variant="selectable"
          aria-pressed={brushValue === 0}
          className="col-span-2 h-auto px-2 py-2"
          onClick={() => setBrushValue(0)}
        >
          <span className="text-lg">○</span>
          <span className="text-xs text-gray-400">Erase</span>
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Click or drag on the map canvas to paint. The alt-map overlay shows
        colored arrows.
      </p>
    </div>
  );
}
