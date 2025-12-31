import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Palette,
  updatePaletteColor,
  renamePalette,
  rgbToHex,
  hexToRgb,
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
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
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
                  onClick={() => {
                    setEditingName(true);
                  }}
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
                <input
                  type="color"
                  value={rgbToHex(color)}
                  onChange={(e) => {
                    handleColorChange(idx, e.target.value);
                  }}
                  title={"Color " + String(idx)}
                  className="w-6 h-6 cursor-pointer rounded border border-gray-600 hover:border-gray-400"
                />
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-black text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                  {String(idx)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Details Editor */}
      {editingIndex !== null &&
        palette.colors[editingIndex] &&
        (() => {
          const currentColor = palette.colors[editingIndex];

          return (
            <Card className="bg-gray-800 border-gray-700 border-blue-500">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  {"Edit Color " + String(editingIndex)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={rgbToHex(currentColor)}
                    onChange={(e) => {
                      handleColorChange(editingIndex, e.target.value);
                    }}
                    className="w-12 h-12 cursor-pointer rounded"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-400">
                      R:{" "}
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={currentColor.r}
                        onChange={(e) => {
                          const updated = updatePaletteColor(
                            palette,
                            editingIndex,
                            {
                              r: Math.min(
                                255,
                                Math.max(0, parseInt(e.target.value)),
                              ),
                              g: currentColor.g,
                              b: currentColor.b,
                            },
                          );
                          onPaletteChange(updated);
                        }}
                        className="w-12 bg-gray-700 text-white rounded px-1 py-0 text-xs"
                      />
                    </label>
                    <label className="text-xs text-gray-400">
                      G:{" "}
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={currentColor.g}
                        onChange={(e) => {
                          const updated = updatePaletteColor(
                            palette,
                            editingIndex,
                            {
                              r: currentColor.r,
                              g: Math.min(
                                255,
                                Math.max(0, parseInt(e.target.value)),
                              ),
                              b: currentColor.b,
                            },
                          );
                          onPaletteChange(updated);
                        }}
                        className="w-12 bg-gray-700 text-white rounded px-1 py-0 text-xs"
                      />
                    </label>
                    <label className="text-xs text-gray-400">
                      B:{" "}
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={currentColor.b}
                        onChange={(e) => {
                          const updated = updatePaletteColor(
                            palette,
                            editingIndex,
                            {
                              r: currentColor.r,
                              g: currentColor.g,
                              b: Math.min(
                                255,
                                Math.max(0, parseInt(e.target.value)),
                              ),
                            },
                          );
                          onPaletteChange(updated);
                        }}
                        className="w-12 bg-gray-700 text-white rounded px-1 py-0 text-xs"
                      />
                    </label>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-white"
                  onClick={() => {
                    setEditingIndex(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Done Editing
                </Button>
              </CardContent>
            </Card>
          );
        })()}
    </div>
  );
}
