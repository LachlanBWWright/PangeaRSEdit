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

/** Currently selected alt-tile value for brush painting (0=None … 10=Loop). */
export const AltMapBrushValue = atom<number>(0);

/** Arrow glyphs and labels for each alt-tile value. */
export const ALT_TILE_OPTIONS: { value: number; label: string; glyph: string; color: string }[] = [
  { value: 0,  label: "None",       glyph: "○", color: "transparent" },
  { value: 1,  label: "Up",         glyph: "↑", color: "#22c55e" },
  { value: 2,  label: "Up-Right",   glyph: "↗", color: "#4ade80" },
  { value: 3,  label: "Right",      glyph: "→", color: "#16a34a" },
  { value: 4,  label: "Down-Right", glyph: "↘", color: "#86efac" },
  { value: 5,  label: "Down",       glyph: "↓", color: "#15803d" },
  { value: 6,  label: "Down-Left",  glyph: "↙", color: "#bbf7d0" },
  { value: 7,  label: "Left",       glyph: "←", color: "#166534" },
  { value: 8,  label: "Left-Up",    glyph: "↖", color: "#dcfce7" },
  { value: 9,  label: "Stop",       glyph: "✕", color: "#ef4444" },
  { value: 10, label: "Loop",       glyph: "↺", color: "#3b82f6" },
];

export function MightyMikeAltMapEditorPanel() {
  const [brushValue, setBrushValue] = useAtom(AltMapBrushValue);
  const selected = ALT_TILE_OPTIONS.find((o) => o.value === brushValue) ?? ALT_TILE_OPTIONS[0];

  return (
    <div className="flex flex-col gap-3 p-2">
      <p className="text-sm text-gray-300">
        Paint path direction values onto the alt-map layer. Enemy AI uses these
        to navigate corridors.
      </p>

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

      <div className="grid grid-cols-3 gap-1">
        {ALT_TILE_OPTIONS.filter((o) => o.value > 0).map((opt) => (
          <button
            key={opt.value}
            className={`flex flex-col items-center p-2 rounded border text-sm transition-colors ${
              brushValue === opt.value
                ? "border-white bg-gray-600"
                : "border-gray-600 hover:border-gray-400"
            }`}
            onClick={() => setBrushValue(opt.value)}
          >
            <span className="text-lg">{opt.glyph}</span>
            <span className="text-xs text-gray-400">{opt.label}</span>
          </button>
        ))}
        <button
          key={0}
          className={`flex flex-col items-center p-2 rounded border text-sm transition-colors ${
            brushValue === 0
              ? "border-white bg-gray-600"
              : "border-gray-600 hover:border-gray-400"
          }`}
          onClick={() => setBrushValue(0)}
        >
          <span className="text-lg">○</span>
          <span className="text-xs text-gray-400">None (erase)</span>
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Click or drag on the map canvas to paint. The alt-map overlay shows colored arrows.
      </p>
    </div>
  );
}
