import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Palette, PREDEFINED_PALETTES } from "../utils/paletteUtils";

interface PaletteSelectorProps {
  palettes: Palette[];
  currentPalette: Palette;
  onPaletteSelect: (palette: Palette) => void;
  onCreateNew: () => void;
}

export function PaletteSelector({
  palettes,
  currentPalette,
  onPaletteSelect,
  onCreateNew,
}: PaletteSelectorProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Palettes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {/* Predefined palettes */}
          <div>
            <p className="text-xs text-gray-500 px-2 py-1">Built-in</p>
            {Object.values(PREDEFINED_PALETTES).map((palette) => (
              <button
                key={palette.name}
                onClick={() => onPaletteSelect(palette)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  currentPalette.name === palette.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {palette.name}
              </button>
            ))}
          </div>

          {/* Custom palettes */}
          {palettes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 px-2 py-1">Custom</p>
              {palettes.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => onPaletteSelect(palette)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    currentPalette.name === palette.name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {palette.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full text-white"
          onClick={onCreateNew}
        >
          <Plus className="w-3 h-3 mr-2" />
          New Palette
        </Button>
      </CardContent>
    </Card>
  );
}
