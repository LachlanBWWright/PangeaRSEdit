import { ImageEditor } from "@/components/ImageEditor";

interface MightyMikeTileMenuEditorsProps {
  isEditingTile: boolean;
  editingImageUrl: string | null;
  isEditingPaletteTile: boolean;
  selectedPaletteTile: number;
  mapImages: HTMLCanvasElement[];
  effectiveSelectedTile: number;
  onCloseTileEditor: () => void;
  onClosePaletteEditor: () => void;
  onSaveTileEdit: (editedImageData: ImageData) => Promise<void>;
  onSavePaletteTileEdit: (editedImageData: ImageData) => Promise<void>;
}

export function MightyMikeTileMenuEditors({
  isEditingTile,
  editingImageUrl,
  isEditingPaletteTile,
  selectedPaletteTile,
  mapImages,
  effectiveSelectedTile,
  onCloseTileEditor,
  onClosePaletteEditor,
  onSaveTileEdit,
  onSavePaletteTileEdit,
}: MightyMikeTileMenuEditorsProps) {
  return (
    <>
      {isEditingTile && editingImageUrl && (
        <ImageEditor
          isOpen={isEditingTile}
          onClose={onCloseTileEditor}
          imageUrl={editingImageUrl}
          onSave={onSaveTileEdit}
          imageName={`Tile_${effectiveSelectedTile}`}
        />
      )}
      {isEditingPaletteTile && (
        <ImageEditor
          isOpen={isEditingPaletteTile}
          onClose={onClosePaletteEditor}
          imageUrl={
            mapImages[selectedPaletteTile]?.toDataURL("image/png") ?? ""
          }
          onSave={onSavePaletteTileEdit}
          imageName={`Palette_${selectedPaletteTile}`}
        />
      )}
    </>
  );
}
