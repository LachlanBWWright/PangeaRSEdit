import type { ChangeEvent } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Edit, Download } from "lucide-react";
import { TileCanvas } from "../shared/TileCanvas";

interface MightyMikeTileOperationsPanelProps {
  currentImageIndex: number | null;
  currentTileCanvas: HTMLCanvasElement | null;
  effectiveSelectedTile: number;
  handleUploadTile: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleEditTile: () => void;
  handleDownloadTile: () => void;
}

export function MightyMikeTileOperationsPanel({
  currentImageIndex,
  currentTileCanvas,
  effectiveSelectedTile,
  handleUploadTile,
  handleEditTile,
  handleDownloadTile,
}: MightyMikeTileOperationsPanelProps) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      <p className="font-bold text-sm">Tile #{effectiveSelectedTile}</p>

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
    </div>
  );
}
