import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const predefined = Object.values(PREDEFINED_PALETTES);
  const allPalettes = [...predefined, ...palettes];

  const handleValueChange = (name: string) => {
    const found = allPalettes.find((p) => p.name === name);
    if (found) {
      onPaletteSelect(found);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Palettes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={currentPalette.name} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Select a palette" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectGroup>
              <SelectLabel className="text-gray-400">Built-in</SelectLabel>
              {predefined.map((palette) => (
                <SelectItem
                  key={palette.name}
                  value={palette.name}
                  className="text-white focus:bg-gray-600"
                >
                  {palette.name}
                </SelectItem>
              ))}
            </SelectGroup>
            {palettes.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-gray-400">Custom</SelectLabel>
                {palettes.map((palette) => (
                  <SelectItem
                    key={palette.name}
                    value={palette.name}
                    className="text-white focus:bg-gray-600"
                  >
                    {palette.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

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
