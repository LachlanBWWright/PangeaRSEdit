import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Pipette, Square } from "lucide-react";
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
   * When provided, these colors are shown as quick-pick swatches.
   * In tile mode, the list is derived from the current image data.
   */
  paletteColors?: string[];
  highlightSelectedColorUsage?: boolean;
  setHighlightSelectedColorUsage?: (value: boolean) => void;
  /**
   * When `paletteColors` is provided, called when the user wants to remap one
   * swatch color to a new CSS color string.
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
  const canEditPalette = onReplacePaletteColor !== undefined;
  const rgb = hexToRgb(brushColor) || { r: 255, g: 255, b: 255 };

  const [tileColorInteractionMode, setTileColorInteractionMode] = useState<
    "select" | "edit"
  >("select");
  const [editingPaletteIndex, setEditingPaletteIndex] = useState<number | null>(null);
  const [editingPaletteColor, setEditingPaletteColor] = useState("#000000");
  const [editingPaletteOriginalColor, setEditingPaletteOriginalColor] = useState("#000000");

  const handleRgbChange = (channel: "r" | "g" | "b", value: number) => {
    const newRgb = { ...rgb, [channel]: Math.min(255, Math.max(0, value)) };
    setBrushColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const openPaletteEditor = (index: number) => {
    if (!paletteColors || !canEditPalette) return;
    const color = paletteColors[index];
    if (!color) return;

    setEditingPaletteIndex(index);
    setEditingPaletteOriginalColor(color);
    setEditingPaletteColor(color);
  };

  const closePaletteEditor = (commit: boolean) => {
    if (commit && editingPaletteIndex !== null) {
      const nextColor = editingPaletteColor;
      const originalColor = editingPaletteOriginalColor;

      if (
        onReplacePaletteColor &&
        nextColor &&
        nextColor !== originalColor
      ) {
        onReplacePaletteColor(editingPaletteIndex, nextColor);
        if (brushColor === originalColor) {
          setBrushColor(nextColor);
        }
      }
    }

    setEditingPaletteIndex(null);
    setEditingPaletteColor("#000000");
    setEditingPaletteOriginalColor("#000000");
  };

  const handlePaletteSwatchClick = (index: number) => {
    const color = paletteColors?.[index];
    if (!color) return;

    setBrushColor(color);
    if (tileColorInteractionMode === "edit" && canEditPalette) {
      openPaletteEditor(index);
    }
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
          {isPaletteMode ? "Tile Colors" : "Color Picker"}
        </label>

        {!isPaletteMode && (
          <div className="space-y-4">
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
                        }
                      }
                    }}
                    className="bg-transparent text-gray-200 text-sm outline-none w-full uppercase"
                  />
                </div>
              </div>
            </div>

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
            <div className="flex items-center justify-between gap-3 rounded bg-gray-900/50 px-2 py-2 text-xs text-gray-300">
              <div className="space-y-0.5">
                <p className="font-bold uppercase tracking-wide text-gray-500">
                  Tile Colors
                </p>
                {canEditPalette && (
                  <p className="text-[10px] text-gray-500">
                    Edit mode opens the color editor after selecting.
                  </p>
                )}
              </div>
              {canEditPalette && (
                <label className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {tileColorInteractionMode === "edit" ? "Edit" : "Select"}
                  </span>
                  <Switch
                    checked={tileColorInteractionMode === "edit"}
                    onCheckedChange={(checked) =>
                      setTileColorInteractionMode(checked ? "edit" : "select")
                    }
                  />
                </label>
              )}
            </div>
            {setHighlightSelectedColorUsage && (
              <label className="flex items-center justify-between rounded bg-gray-900/50 px-2 py-1 text-xs text-gray-300">
                <span>Highlight selected color</span>
                <input
                  type="checkbox"
                  checked={highlightSelectedColorUsage ?? false}
                  onChange={(e) => setHighlightSelectedColorUsage(e.target.checked)}
                />
              </label>
            )}
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-900/50 rounded-lg">
              {paletteColors.map((color, idx) => (
                <div key={idx} className="relative aspect-square">
                  <button
                    type="button"
                    className={`w-full h-full rounded shadow-sm border transition ${
                      brushColor === color
                        ? "border-white ring-2 ring-blue-500/50"
                      : "border-gray-700 hover:border-gray-500"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePaletteSwatchClick(idx)}
                    title={`Color ${idx}: ${color}`}
                  />
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
                  type="button"
                  className={`aspect-square rounded shadow-sm border ${
                    brushColor === color
                      ? "border-white ring-2 ring-blue-500/50"
                      : "border-gray-700 hover:border-gray-500"
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

      <Dialog
        open={editingPaletteIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            closePaletteEditor(true);
          }
        }}
      >
        {editingPaletteIndex !== null && (
          <DialogContent className="bg-gray-800 text-white border-gray-700 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-sm">
                Edit tile color {editingPaletteIndex}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Changes are saved when this editor closes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 shrink-0 rounded border border-gray-600 shadow-inner"
                  style={{ backgroundColor: editingPaletteColor }}
                />
                <div className="flex-1 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Hex
                  </label>
                  <input
                    type="color"
                    value={editingPaletteColor}
                    onChange={(e) => setEditingPaletteColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-600 bg-gray-700 p-1"
                  />
                  <div className="rounded bg-gray-900/60 px-2 py-1 font-mono text-xs text-gray-300">
                    {editingPaletteColor.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-700 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-gray-600 hover:bg-gray-700"
                  onClick={() => closePaletteEditor(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-white"
                  onClick={() => closePaletteEditor(true)}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
