import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Square } from "lucide-react";

interface Props {
  brushSize: number[];
  setBrushSize: (v: number[]) => void;
  brushShape: "circle" | "square";
  setBrushShape: (v: "circle" | "square") => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  colorPalette: string[];
  /**
   * When provided, only these colors are available (palette-constrained editing).
   * The free color picker is hidden and `colorPalette` is ignored.
   */
  paletteColors?: string[];
  /**
   * When `paletteColors` is provided, called when the user wants to replace a
   * palette entry with a new CSS color string.
   */
  onReplacePaletteColor?: (index: number, newColor: string) => void;
}

export function ToolsPanel({
  brushSize,
  setBrushSize,
  brushShape,
  setBrushShape,
  brushColor,
  setBrushColor,
  colorPalette,
  paletteColors,
  onReplacePaletteColor,
}: Props) {
  const isPaletteMode = paletteColors !== undefined && paletteColors.length > 0;

  return (
    <div className="w-64 bg-gray-800 rounded p-4 space-y-4 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brush Size: {brushSize[0]}px
        </label>
        <Slider
          value={brushSize}
          onValueChange={setBrushSize}
          max={50}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brush Shape
        </label>
        <Select
          value={brushShape}
          onValueChange={(value: "circle" | "square") => setBrushShape(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circle">
              <div className="flex items-center space-x-2">
                <Circle className="w-4 h-4" />
                <span>Circle</span>
              </div>
            </SelectItem>
            <SelectItem value="square">
              <div className="flex items-center space-x-2">
                <Square className="w-4 h-4" />
                <span>Square</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {isPaletteMode ? "Palette Color" : "Color"}
        </label>

        {isPaletteMode ? (
          // Palette-constrained mode: show only the available palette colors
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Click to select brush color. Double-click/hold to replace a palette entry.
            </p>
            <div className="grid grid-cols-4 gap-1">
              {paletteColors.map((color, idx) => (
                <div key={idx} className="relative group">
                  <button
                    className={`w-full aspect-square rounded border-2 ${
                      brushColor === color
                        ? "border-white"
                        : "border-gray-600"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                    title={`Color ${idx}: ${color}`}
                  />
                  {/* Replace overlay via hidden color input — only shown when replacement is supported */}
                  {onReplacePaletteColor && (
                    <input
                      type="color"
                      defaultValue={color}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title={`Replace palette color ${idx}`}
                      onInput={(e) => {
                        const input = e.target;
                        if (!(input instanceof HTMLInputElement)) return;
                        const newColor = input.value;
                        onReplacePaletteColor(idx, newColor);
                        if (brushColor === color) setBrushColor(newColor);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Free-color mode: full color picker + preset swatches
          <div className="space-y-2">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-full h-10 rounded border border-gray-600"
            />
            <div className="grid grid-cols-4 gap-1">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 ${
                    brushColor === color ? "border-white" : "border-gray-600"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
