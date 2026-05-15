import type { ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Upload } from "lucide-react";
import { TileCanvas } from "../shared/TileCanvas";

interface MightyMikePalettePanelProps {
  mapImages: HTMLCanvasElement[];
  selectedPaletteTile: number;
  isPaletteTileInUse: boolean;
  paletteUploadInputRef: RefObject<HTMLInputElement | null>;
  setIsEditingPaletteTile: (next: boolean) => void;
  handleUploadPaletteTile: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAddPaletteTile: () => void;
  handleRemovePaletteTile: () => void;
  handleReplaceTile: () => void;
  onSelectPaletteTile: (palette: number) => void;
}

export function MightyMikePalettePanel({
  mapImages,
  selectedPaletteTile,
  isPaletteTileInUse,
  paletteUploadInputRef,
  setIsEditingPaletteTile,
  handleUploadPaletteTile,
  handleAddPaletteTile,
  handleRemovePaletteTile,
  handleReplaceTile,
  onSelectPaletteTile,
}: MightyMikePalettePanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-sm">Tile Palette</p>

      <div className="max-h-56 overflow-auto rounded border border-gray-600 p-1">
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
          {mapImages.map((img, idx) => (
            <div
              key={idx}
              onClick={() => onSelectPaletteTile(idx)}
              className={`cursor-pointer transition-all ${
                selectedPaletteTile === idx
                  ? "ring-2 ring-green-500 rounded"
                  : "hover:ring-1 hover:ring-blue-500 rounded"
              }`}
              title={`Tile #${idx}`}
            >
              <TileCanvas image={img} size={28} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 flex-none sm:grid-cols-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditingPaletteTile(true)}
          disabled={!mapImages[selectedPaletteTile]}
        >
          <Edit className="mr-1 h-4 w-4" />
          Edit palette tile
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => paletteUploadInputRef.current?.click()}
          disabled={!mapImages[selectedPaletteTile]}
        >
          <Upload className="mr-1 h-4 w-4" />
          Upload palette tile
        </Button>
        <input
          ref={paletteUploadInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleUploadPaletteTile}
        />
        <Button size="sm" variant="outline" onClick={handleAddPaletteTile}>
          Add palette tile
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRemovePaletteTile}
          disabled={isPaletteTileInUse || mapImages.length <= 1}
        >
          Remove palette tile
        </Button>
      </div>

      <Button
        size="sm"
        onClick={handleReplaceTile}
        disabled={
          selectedPaletteTile < 0 || selectedPaletteTile >= mapImages.length
        }
      >
        <Upload className="w-4 h-4 mr-1" />
        Replace with Palette #{selectedPaletteTile}
      </Button>
    </div>
  );
}
