import { ReusableTileOperationsPanel } from "../shared/ReusableTileOperationsPanel";

interface MightyMikeTileOperationsPanelProps {
  currentImageIndex: number | null;
  currentTileCanvas: HTMLCanvasElement | null;
  selectedPaletteTile: number;
  handleRotateTile: () => void;
  handleFlipTileHorizontal: () => void;
  handleFlipTileVertical: () => void;
}

export function MightyMikeTileOperationsPanel({
  currentImageIndex,
  currentTileCanvas,
  selectedPaletteTile,
  handleRotateTile,
  handleFlipTileHorizontal,
  handleFlipTileVertical,
}: MightyMikeTileOperationsPanelProps) {
  return (
    <ReusableTileOperationsPanel
      imageIndex={currentImageIndex ?? selectedPaletteTile}
      image={currentTileCanvas}
      onRotate={handleRotateTile}
      onFlipHorizontal={handleFlipTileHorizontal}
      onFlipVertical={handleFlipTileVertical}
    />
  );
}
