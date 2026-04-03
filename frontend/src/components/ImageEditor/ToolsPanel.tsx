import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Square, Pipette } from "lucide-react";
import { hexToRgb, rgbToHex } from "@/utils/colorUtils";

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
  highlightSelectedColorUsage?: boolean;
  setHighlightSelectedColorUsage?: (value: boolean) => void;
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
  highlightSelectedColorUsage,
  setHighlightSelectedColorUsage,
}: Props) {
  const isPaletteMode = paletteColors !== undefined && paletteColors.length > 0;
  const rgb = hexToRgb(brushColor) || { r: 255, g: 255, b: 255 };

  const handleRgbChange = (channel: "r" | "g" | "b", value: number) => {
    const newRgb = { ...rgb, [channel]: Math.min(255, Math.max(0, value)) };
    setBrushColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  return (
    <div className="w-64 bg-gray-800 rounded p-4 space-y-6 overflow-y-auto">
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Brush Settings
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between">
            <span>Size</span>
            <span className="text-blue-400">{brushSize[0]}px</span>
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
            Shape
          </label>
          <Select
            value={brushShape}
            onValueChange={(value: "circle" | "square") => setBrushShape(value)}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="circle" className="text-gray-200">
                <div className="flex items-center space-x-2">
                  <Circle className="w-4 h-4" />
                  <span>Circle</span>
                </div>
              </SelectItem>
              <SelectItem value="square" className="text-gray-200">
                <div className="flex items-center space-x-2">
                  <Square className="w-4 h-4" />
                  <span>Square</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-700">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {isPaletteMode ? "Palette Selection" : "Color Picker"}
        </label>

        {!isPaletteMode && (
          <div className="space-y-4">
            {/* Color Preview & Hex */}
            <div className="flex gap-3">
              <div className="relative w-14 h-14 rounded-md shadow-inner group border border-gray-600 overflow-hidden shrink-0">
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: brushColor }}
                />
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                  <Pipette className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Hex</label>
                <div className="flex items-center bg-gray-700 border border-gray-600 rounded px-2 h-9">
                  <span className="text-gray-500 mr-1 text-sm">#</span>
                  <input
                    type="text"
                    value={brushColor.replace("#", "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9a-fA-F]{0,6}$/.test(val)) {
                        if (val.length === 6 || val.length === 3) {
                          setBrushColor("#" + val);
                        } else {
                          // Allow typing
                        }
                      }
                    }}
                    className="bg-transparent text-gray-200 text-sm outline-none w-full uppercase"
                  />
                </div>
              </div>
            </div>

            {/* RGB Controls */}
            <div className="grid grid-cols-3 gap-2">
              {(["r", "g", "b"] as const).map((channel) => (
                <div key={channel} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold text-center block">
                    {channel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgb[channel]}
                    onChange={(e) => handleRgbChange(channel, parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-center text-gray-200 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isPaletteMode ? (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 uppercase font-bold leading-tight">
              Palette Swatches
            </p>
            {setHighlightSelectedColorUsage && (
              <label className="flex items-center justify-between rounded bg-gray-900/50 px-2 py-1 text-xs text-gray-300">
                <span>Highlight selected color</span>
                <input
                  type="checkbox"
                  checked={highlightSelectedColorUsage ?? false}
                  onChange={(e) =>
                    setHighlightSelectedColorUsage(e.target.checked)
                  }
                />
              </label>
            )}
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-900/50 rounded-lg">
              {paletteColors.map((color, idx) => (
                <div key={idx} className="relative aspect-square">
                  <button
                    className={`w-full h-full rounded shadow-sm border ${
                      brushColor === color
                        ? "border-white ring-2 ring-blue-500/50"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                    title={`Color ${idx}: ${color}`}
                  />
                  {onReplacePaletteColor && (
                    <input
                      type="color"
                      defaultValue={color}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Hold/Right-click replacement not implemented, using hidden picker"
                      onChange={(e) => {
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
          <div className="space-y-2">
             <p className="text-[10px] text-gray-500 uppercase font-bold">Presets</p>
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-900/50 rounded-lg">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  className={`aspect-square rounded shadow-sm border ${
                    brushColor === color ? "border-white ring-2 ring-blue-500/50" : "border-gray-700 hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
