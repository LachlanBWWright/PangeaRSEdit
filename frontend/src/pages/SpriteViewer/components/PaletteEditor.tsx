import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { hexToRgb, rgbToHex } from "@/utils/colorUtils";
import {
  Palette,
  updatePaletteColor,
  renamePalette,
  exportPaletteFile,
} from "../utils/paletteUtils";

interface PaletteEditorProps {
  palette: Palette;
  onPaletteChange: (palette: Palette) => void;
  onSaveAsNew: (palette: Palette) => void;
}

export function PaletteEditor({
  palette,
  onPaletteChange,
  onSaveAsNew,
}: PaletteEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(palette.name);

  const handleColorChange = (index: number, hex: string) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const updated = updatePaletteColor(palette, index, rgb);
      onPaletteChange(updated);
    }
  };

  const handleChannelChange = (index: number, channel: "r" | "g" | "b", value: number) => {
    const color = palette.colors[index];
    if (!color) return;
    const updatedColor = { ...color, [channel]: Math.min(255, Math.max(0, value)) };
    const updated = updatePaletteColor(palette, index, updatedColor);
    onPaletteChange(updated);
  };

  const handleNameChange = () => {
    if (newName.trim()) {
      const updated = renamePalette(palette, newName.trim());
      onPaletteChange(updated);
      setEditingName(false);
      toast.success(`Palette renamed to "${newName}"`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Palette Name Editor */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Palette</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            {editingName ? (
              <>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameChange();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white"
                  onClick={handleNameChange}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1 bg-gray-700 rounded px-2 py-2">
                  <p className="text-white text-sm">{palette.name}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white"
                  onClick={() => setEditingName(true)}
                >
                  Edit
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-white"
              onClick={() => {
                exportPaletteFile(palette);
                toast.success("Palette exported");
              }}
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-white"
              onClick={() => {
                onSaveAsNew(palette);
                toast.success("Saved as new palette");
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Save As
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Color Picker Grid */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-xs">
            Colors (Click to Edit)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-1 max-h-96 overflow-y-auto p-2 bg-gray-900 rounded">
            {palette.colors.map((color, idx) => (
              <div key={idx} className="relative group">
                <div
                  className={`w-6 h-6 cursor-pointer rounded border transition-colors ${
                    editingIndex === idx
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : "border-gray-600 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: rgbToHex(color.r, color.g, color.b) }}
                  onClick={() => setEditingIndex(idx)}
                  title={`Color ${idx}`}
                />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  {idx}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Details Editor */}
      {editingIndex !== null && palette.colors[editingIndex] && (() => {
        const currentColor = palette.colors[editingIndex];
        if (!currentColor) return null;
        
        return (
        <Card className="bg-gray-800 border-blue-500 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex justify-between items-center">
              <span>Edit Color {editingIndex}</span>
              <span className="text-xs text-blue-400 font-mono">
                {rgbToHex(currentColor.r, currentColor.g, currentColor.b).toUpperCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative w-16 h-16 rounded shadow-inner border border-gray-600 group shrink-0">
                <div
                  className="w-full h-full rounded"
                  style={{ backgroundColor: rgbToHex(currentColor.r, currentColor.g, currentColor.b) }}
                />
                <input
                  type="color"
                  value={rgbToHex(currentColor.r, currentColor.g, currentColor.b)}
                  onChange={(e) => handleColorChange(editingIndex, e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
              
              <div className="flex-1 grid grid-cols-3 gap-2">
                {(["r", "g", "b"] as const).map((channel) => (
                  <div key={channel} className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold text-center block">
                      {channel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={currentColor[channel]}
                      onChange={(e) => handleChannelChange(editingIndex, channel, parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1.5 text-xs text-center text-gray-200 focus:border-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 border-t border-gray-700 pt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-white border-gray-600 hover:bg-gray-700"
                onClick={() => setEditingIndex(null)}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
        );
      })()}
    </div>
  );
}
