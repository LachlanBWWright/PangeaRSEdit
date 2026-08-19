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
import { EditorPanel } from "./EditorPanel";
import {
  Palette,
  PREDEFINED_PALETTE_OPTIONS,
} from "../utils/paletteUtils";

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
  const predefined = PREDEFINED_PALETTE_OPTIONS;
  const selectedBuiltin = predefined.find(
    (palette) => palette.palette.name === currentPalette.name,
  );
  const selectedCustom = palettes.find(
    (palette) => palette.name === currentPalette.name,
  );
  const selectedValue = selectedBuiltin
    ? `builtin:${selectedBuiltin.key}`
    : selectedCustom
      ? `custom:${selectedCustom.name}`
      : "current";

  const handleValueChange = (value: string) => {
    const builtin = predefined.find(
      (palette) => `builtin:${palette.key}` === value,
    );
    if (builtin) {
      onPaletteSelect(builtin.palette);
      return;
    }

    const custom = palettes.find(
      (palette) => `custom:${palette.name}` === value,
    );
    if (custom) {
      onPaletteSelect(custom);
    }
  };

  return (
    <EditorPanel title="Palettes" contentClassName="space-y-2">
      <Select value={selectedValue} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Select a palette" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {!selectedBuiltin && !selectedCustom && (
              <SelectGroup>
                <SelectLabel className="text-gray-400">Current</SelectLabel>
                <SelectItem
                  value="current"
                  className="text-white focus:bg-gray-600"
                >
                  {currentPalette.name}
                </SelectItem>
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel className="text-gray-400">Built-in</SelectLabel>
              {predefined.map((palette) => (
                <SelectItem
                  key={palette.key}
                  value={`builtin:${palette.key}`}
                  className="text-white focus:bg-gray-600"
                >
                  {palette.label} ({palette.sourceFile})
                </SelectItem>
              ))}
            </SelectGroup>
            {palettes.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-gray-400">Custom</SelectLabel>
                {palettes.map((palette) => (
                  <SelectItem
                    key={palette.name}
                    value={`custom:${palette.name}`}
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
          Create Palette
      </Button>
    </EditorPanel>
  );
}
