/**
 * MightyMikeTileMenu.tsx
 *
 * Tile menu for Mighty Mike's 2D tile system.
 * Provides operations for editing individual tiles:
 * - Replace tile image via upload
 * - Edit tile in pixel editor
 * - Download tile as PNG
 * - Pick replacement tile from palette
 */

import { useAtomValue } from "jotai";
import { useState } from "react";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { ImageEditor } from "@/components/ImageEditor";
import { Edit, Download, Upload, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { ShowMightyMikeCollisionOverlay } from "@/data/game/gameAtoms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MightyMikeTileMenuProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
}

const TILE_SIZE = 32;

export function MightyMikeTileMenu({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
}: MightyMikeTileMenuProps) {
  const selectedTile = useAtomValue(SelectedTile);
  const [showCollisionOverlay, setShowCollisionOverlay] = useAtom(
    ShowMightyMikeCollisionOverlay
  );

  // Local state
  const [selectedPaletteTile, setSelectedPaletteTile] = useState<number>(0);
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

  // Get required data
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj || [];
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  // Get collision data from Mighty Mike metadata
  const rawTerrainData = terrainData as unknown as Record<string, unknown>;
  const mightyMikeTileValuesData =
    (rawTerrainData?._metadata as Record<string, unknown>)?.[1000] as Record<
      string,
      unknown
    > | undefined;
  const mightyMikeTileValuesArray =
    ((mightyMikeTileValuesData?.obj as Record<string, unknown>)
      ?.mightyMikeTileValues as unknown[]) || [];

  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  const totalTiles = mapWidth * mapHeight;

  // Helper: Get collision properties for current tile
  const getCollisionProperties = (): {
    hasCollisionMask: boolean;
    usePixelAccurateCollision: boolean;
  } | null => {
    if (
      selectedTile < 0 ||
      selectedTile >= mightyMikeTileValuesArray.length
    ) {
      return null;
    }

    const tileValue = mightyMikeTileValuesArray[selectedTile] as Record<
      string,
      unknown
    >;
    return {
      hasCollisionMask: (tileValue?.hasCollisionMask as boolean) || false,
      usePixelAccurateCollision:
        (tileValue?.usePixelAccurateCollision as boolean) || false,
    };
  };

  // Helper: Get image index for current tile (forward Xlat translation)
  const getCurrentTileImageIndex = (): number | null => {
    if (selectedTile < 0 || selectedTile >= layr.length) return null;

    const tileIndexValue = layr[selectedTile];
    if (tileIndexValue === undefined || tileIndexValue === null) return null;

    let imageIndex: number = tileIndexValue;

    if (
      xlatTable &&
      tileIndexValue >= 0 &&
      tileIndexValue < xlatTable.length
    ) {
      const xlatEntry = xlatTable[tileIndexValue];
      if (xlatEntry && typeof xlatEntry === "object" && "idx" in xlatEntry) {
        imageIndex = xlatEntry.idx;
      }
    }

    if (imageIndex < 0 || imageIndex >= mapImages.length) {
      return null;
    }

    return imageIndex;
  };

  // Helper: Find logical tile index for image (reverse Xlat lookup)
  const findTileIndexForImage = (imageIndex: number): number | null => {
    if (!xlatTable) {
      // No translation table - direct mapping
      return imageIndex >= 0 && imageIndex < mapImages.length ? imageIndex : null;
    }

    // Search through Xlat to find logical index that maps to this image
    for (let tileIdx = 0; tileIdx < xlatTable.length; tileIdx++) {
      const entry = xlatTable[tileIdx];
      if (entry && typeof entry === "object" && entry.idx === imageIndex) {
        return tileIdx;
      }
    }

    // Fallback: if image index is within Xlat bounds, use it directly
    if (imageIndex >= 0 && imageIndex < xlatTable.length) {
      return imageIndex;
    }

    return null;
  };

  // Handler: Replace tile from palette
  const handleReplaceTile = () => {
    if (selectedPaletteTile < 0 || selectedPaletteTile >= mapImages.length) {
      toast.error("Invalid palette tile selected");
      return;
    }

    const logicalIndex = findTileIndexForImage(selectedPaletteTile);
    if (logicalIndex === null) {
      toast.error("Failed to find logical tile index for palette tile");
      return;
    }

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj) return;
      const layerArray = data.Layr[1000].obj;
      if (selectedTile >= 0 && selectedTile < layerArray.length) {
        layerArray[selectedTile] = logicalIndex;
      }
    });

    toast.success(`Tile ${selectedTile} replaced`);
  };

  // Handler: Download tile as PNG
  const handleDownloadTile = () => {
    const imageIndex = getCurrentTileImageIndex();
    if (imageIndex === null) {
      toast.error("No valid tile to download");
      return;
    }

    const canvas = mapImages[imageIndex];
    if (!canvas) {
      toast.error("Tile image not found");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to create blob from tile");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mighty_mike_tile_${selectedTile}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Tile downloaded");
    });
  };

  // Handler: Open tile in pixel editor
  const handleEditTile = () => {
    const imageIndex = getCurrentTileImageIndex();
    if (imageIndex === null) {
      toast.error("No valid tile to edit");
      return;
    }

    const canvas = mapImages[imageIndex];
    if (!canvas) {
      toast.error("Tile image not found");
      return;
    }

    const imageUrl = canvas.toDataURL("image/png");
    setEditingImageUrl(imageUrl);
    setIsEditingTile(true);
  };

  // Handler: Save edited tile
  const handleSaveTileEdit = async (editedImageData: ImageData) => {
    const imageIndex = getCurrentTileImageIndex();
    if (imageIndex === null) {
      toast.error("Invalid tile index");
      return;
    }

    // Create a new canvas with the edited data
    const canvas = document.createElement("canvas");
    canvas.width = editedImageData.width;
    canvas.height = editedImageData.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Failed to get canvas context");
      return;
    }

    ctx.putImageData(editedImageData, 0, 0);

    // Update the mapImages array
    const newMapImages = [...mapImages];
    newMapImages[imageIndex] = canvas;
    setMapImages(newMapImages);

    setIsEditingTile(false);
    setEditingImageUrl(null);
    toast.success("Tile updated successfully");
  };

  // Handler: Update collision properties
  const handleUpdateCollisionProperty = (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean
  ) => {
    if (selectedTile < 0 || selectedTile >= mightyMikeTileValuesArray.length) {
      toast.error("Invalid tile selected");
      return;
    }

    // Update the tile value in the array
    const tileValue = mightyMikeTileValuesArray[selectedTile] as Record<
      string,
      unknown
    >;
    if (!tileValue) return;

    tileValue[property] = value;

    // Update state to trigger re-render
    setTerrainData((data) => {
      if (!data.Layr) return;
      // Force a state update by touching the layer data
      const layer = data.Layr[1000];
      if (layer) {
        layer.obj = [...(layer.obj || [])];
      }
    });

    toast.success(
      `Collision ${property === "hasCollisionMask" ? "mask" : "type"} updated`
    );
  };

  // Handler: Upload tile image
  const handleUploadTile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const imageIndex = getCurrentTileImageIndex();
    if (imageIndex === null) {
      toast.error("No valid tile selected for upload");
      return;
    }

    try {
      // Create 32x32 canvas for the tile
      const canvas = document.createElement("canvas");
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      const context = canvas.getContext("2d");

      if (!context) {
        toast.error("Failed to create canvas context");
        return;
      }

      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Resize and draw image
      const imageBitmap = await createImageBitmap(file, {
        resizeWidth: TILE_SIZE,
        resizeHeight: TILE_SIZE,
        resizeQuality: "high",
      });

      context.drawImage(imageBitmap, 0, 0);

      // Update mapImages
      const newMapImages = [...mapImages];
      newMapImages[imageIndex] = canvas;
      setMapImages(newMapImages);

      toast.success("Tile image replaced");
    } catch (error) {
      toast.error(
        `Failed to upload tile: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  // Validate selected tile is in bounds
  if (selectedTile < 0 || selectedTile >= totalTiles) {
    return (
      <div className="p-4 text-white">
        <p>No tile selected. Click on a tile in the map to edit it.</p>
      </div>
    );
  }

  const currentImageIndex = getCurrentTileImageIndex();
  const currentTileCanvas =
    currentImageIndex !== null ? mapImages[currentImageIndex] : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Collision Overlay Toggle */}
      <div className="p-2 border-b border-gray-600 flex items-center justify-between">
        <span className="text-sm font-semibold">Collision Overlay</span>
        <Button
          size="sm"
          variant={showCollisionOverlay ? "default" : "outline"}
          onClick={() => setShowCollisionOverlay(!showCollisionOverlay)}
          title={
            showCollisionOverlay
              ? "Hide collision mask overlay"
              : "Show collision mask overlay"
          }
        >
          <Shield className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-2 p-2 flex-1 overflow-y-auto">
      {/* Left Column: Selected Tile Operations */}
      <div className="flex flex-col gap-2">
        <p className="font-bold">Selected Tile #{selectedTile}</p>

        {/* Tile Preview */}
        <Stage width={120} height={120} className="mx-auto border border-gray-600">
          <Layer>
            {currentTileCanvas && <TileImage image={currentTileCanvas} />}
          </Layer>
        </Stage>

        {/* Upload Button */}
        <div>
          <p className="text-sm mb-1">Replace Tile Image</p>
          <FileUpload
            acceptType="image"
            disabled={currentImageIndex === null}
            handleOnChange={handleUploadTile}
          />
        </div>

        {/* Edit Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleEditTile}
          disabled={currentImageIndex === null}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>

        {/* Download Button */}
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

      {/* Middle Column: Tile Information */}
      <div className="flex flex-col gap-2 text-sm overflow-y-auto">
        <div>
          <p className="font-bold">Tile Information</p>
          <div className="space-y-1">
            <p>Map Size: {mapWidth} × {mapHeight}</p>
            <p>Total Tiles: {totalTiles}</p>
            <p>Available Images: {mapImages.length}</p>
            <p>Selected Pos: {selectedTile}</p>
            <p>
              Logical Index:{" "}
              {selectedTile < layr.length ? layr[selectedTile] : "N/A"}
            </p>
            <p>Physical Index: {currentImageIndex ?? "N/A"}</p>
            <p>Has Xlat: {xlatTable ? "Yes" : "No"}</p>
          </div>
        </div>

        {/* Collision Properties Section */}
        {mightyMikeTileValuesArray.length > 0 && (() => {
          const collisionProps = getCollisionProperties();
          return (
            <div className="border-t border-gray-600 pt-2">
              <p className="font-bold">Collision Properties</p>
              {collisionProps ? (
                <div className="space-y-2">
                  {/* Collision Mask Toggle */}
                  <div className="flex items-center justify-between">
                    <span>Collision Mask:</span>
                    <Select
                      value={
                        collisionProps.hasCollisionMask ? "enabled" : "disabled"
                      }
                      onValueChange={(value) =>
                        handleUpdateCollisionProperty(
                          "hasCollisionMask",
                          value === "enabled"
                        )
                      }
                    >
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Collision Type Selector */}
                  {collisionProps.hasCollisionMask && (
                    <div className="flex items-center justify-between text-xs">
                      <span>Collision Type:</span>
                      <Select
                        value={
                          collisionProps.usePixelAccurateCollision
                            ? "pixel"
                            : "tile"
                        }
                        onValueChange={(value) =>
                          handleUpdateCollisionProperty(
                            "usePixelAccurateCollision",
                            value === "pixel"
                          )
                        }
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pixel">Pixel-Accurate</SelectItem>
                          <SelectItem value="tile">Tile-Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">
                  No collision data available
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Right Column: Tile Palette */}
      <div className="flex flex-col gap-2">
        <p className="font-bold">Tile Palette</p>

        {/* Scrollable Tile Grid */}
        <div className="flex-1 overflow-y-auto border border-gray-600 p-2">
          <div className="grid grid-cols-4 gap-1">
            {mapImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPaletteTile(idx)}
                className={`cursor-pointer transition-all ${
                  selectedPaletteTile === idx
                    ? "ring-2 ring-green-500 rounded"
                    : "hover:ring-1 hover:ring-blue-500 rounded"
                }`}
                title={`Tile #${idx}`}
              >
                <Stage width={32} height={32} className="bg-black">
                  <Layer>
                    <TileImage image={img} />
                  </Layer>
                </Stage>
              </div>
            ))}
          </div>
        </div>

        {/* Replace Button */}
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
      </div>

      {/* Image Editor Modal */}
      {isEditingTile && editingImageUrl && (
        <ImageEditor
          isOpen={isEditingTile}
          onClose={() => {
            setIsEditingTile(false);
            setEditingImageUrl(null);
          }}
          imageUrl={editingImageUrl}
          onSave={handleSaveTileEdit}
          imageName={`Tile_${selectedTile}`}
        />
      )}
    </div>
  );
}

// Helper component to display tile image
function TileImage({ image }: { image: HTMLCanvasElement }) {
  if (!image) return null;
  return <Image image={image} width={TILE_SIZE} height={TILE_SIZE} />;
}
