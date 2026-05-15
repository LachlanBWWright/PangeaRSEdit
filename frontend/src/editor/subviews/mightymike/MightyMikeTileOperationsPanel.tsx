import type { ChangeEvent } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Edit, Download } from "lucide-react";
import { TileCanvas } from "../shared/TileCanvas";

interface MightyMikeTileOperationsPanelProps {
  currentImageIndex: number | null;
  currentTileCanvas: HTMLCanvasElement | null;
  effectiveSelectedTile: number;
  selectedPaletteTile: number;
  handleUploadTile: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleEditTile: () => void;
  handleDownloadTile: () => void;
  handleRotateTile: () => void;
  handleFlipTileHorizontal: () => void;
  handleFlipTileVertical: () => void;
}

export function MightyMikeTileOperationsPanel({
  currentImageIndex,
  currentTileCanvas,
  effectiveSelectedTile,
  selectedPaletteTile,
  handleUploadTile,
  handleEditTile,
  handleDownloadTile,
  handleRotateTile,
  handleFlipTileHorizontal,
  handleFlipTileVertical,
}: MightyMikeTileOperationsPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-sm">Tile #{effectiveSelectedTile}</p>
      <p className="text-xs text-gray-400">Palette #{selectedPaletteTile}</p>

      <div className="border border-gray-600 self-start">
        <TileCanvas image={currentTileCanvas ?? undefined} size={64} />
      </div>

      <div>
        <p className="text-xs mb-1">Replace Image</p>
        <FileUpload
          acceptType="image"
          disabled={currentImageIndex === null}
          handleOnChange={handleUploadTile}
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleEditTile}
        disabled={currentImageIndex === null}
      >
        <Edit className="w-4 h-4 mr-1" />
        Edit
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadTile}
        disabled={currentImageIndex === null}
      >
        <Download className="w-4 h-4 mr-1" />
        Download
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRotateTile}
          disabled={currentImageIndex === null}
        >
          Rotate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFlipTileHorizontal}
          disabled={currentImageIndex === null}
        >
          Flip H
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFlipTileVertical}
          disabled={currentImageIndex === null}
        >
          Flip V
        </Button>
      </div>
    </div>
  );
}
