import type { ChangeEvent, RefObject } from "react";
import { ReusableTilePalettePanel } from "../shared/ReusableTilePalettePanel";

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
    <ReusableTilePalettePanel
      images={mapImages}
      selectedIndex={selectedPaletteTile}
      selectedImageInUse={isPaletteTileInUse}
      uploadInputRef={paletteUploadInputRef}
      onEdit={() => setIsEditingPaletteTile(true)}
      onUpload={handleUploadPaletteTile}
      onAdd={handleAddPaletteTile}
      onRemove={handleRemovePaletteTile}
      onReplace={handleReplaceTile}
      onSelect={onSelectPaletteTile}
    />
  );
}
