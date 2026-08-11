import type { ChangeEvent } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import {
  Download,
  Edit,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
} from "lucide-react";
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
      <p className="font-bold text-sm">
        Cell #{effectiveSelectedTile}
        <span className="ml-2 font-normal text-gray-400">
          Image #{selectedPaletteTile}
        </span>
      </p>

      <div className="grid grid-cols-[66px_1fr] gap-2">
        <div className="self-start border border-gray-600">
          <TileCanvas image={currentTileCanvas ?? undefined} size={64} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleEditTile}
            disabled={currentImageIndex === null}
          >
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadTile}
            disabled={currentImageIndex === null}
          >
            <Download className="mr-1 h-4 w-4" /> Download
          </Button>
          <div className="col-span-2">
            <FileUpload
              acceptType="image"
              disabled={currentImageIndex === null}
              handleOnChange={handleUploadTile}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRotateTile}
          disabled={currentImageIndex === null}
        >
          <RotateCw className="mr-1 h-4 w-4" />
          Rotate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFlipTileHorizontal}
          disabled={currentImageIndex === null}
        >
          <FlipHorizontal className="mr-1 h-4 w-4" />
          Flip H
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFlipTileVertical}
          disabled={currentImageIndex === null}
        >
          <FlipVertical className="mr-1 h-4 w-4" />
          Flip V
        </Button>
      </div>
    </div>
  );
}
