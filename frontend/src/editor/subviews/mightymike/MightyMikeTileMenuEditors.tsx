import { ImageEditor } from "@/components/ImageEditor";

interface MightyMikeTileMenuEditorsProps {
  isEditingPaletteTile: boolean;
  selectedPaletteTile: number;
  mapImages: HTMLCanvasElement[];
  onClosePaletteEditor: () => void;
  onSavePaletteTileEdit: (editedImageData: ImageData) => Promise<void>;
}

export function MightyMikeTileMenuEditors({
  isEditingPaletteTile,
  selectedPaletteTile,
  mapImages,
  onClosePaletteEditor,
  onSavePaletteTileEdit,
}: MightyMikeTileMenuEditorsProps) {
  return (
    <>
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
