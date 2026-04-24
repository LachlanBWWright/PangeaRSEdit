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

import { useAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import type { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageEditor } from "@/components/ImageEditor";
import {
  Edit,
  Download,
  Upload,
  Shield,
  Info,
  Paintbrush,
  Layers,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  CollisionBrushMode,
  ShowMightyMikeCollisionOverlay,
  ShowMightyMikeParamsOverlay,
  ParamBrushField,
  ParamBrushValue,
} from "@/data/game/gameAtoms";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TileCanvas } from "../shared/TileCanvas";

// Type guard helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

function getNumber(value: unknown, defaultValue = 0): number {
  return typeof value === "number" ? value : defaultValue;
}

type CollisionProperties = {
  hasCollisionMask: boolean;
  usePixelAccurateCollision: boolean;
} | null;

interface CollisionPropertiesSectionProps {
  collisionProps: CollisionProperties;
  onUpdateCollisionProperty: (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean,
  ) => void;
}

function CollisionPropertiesSection({
  collisionProps,
  onUpdateCollisionProperty,
}: CollisionPropertiesSectionProps) {
  return (
    <div className="border-t border-gray-600 pt-2">
      <p className="font-bold text-xs mb-1">Collision</p>
      {collisionProps ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Mask:</span>
            <Select
              value={collisionProps.hasCollisionMask ? "enabled" : "disabled"}
              onValueChange={(value) =>
                onUpdateCollisionProperty(
                  "hasCollisionMask",
                  value === "enabled",
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

          {collisionProps.hasCollisionMask && (
            <div className="flex items-center justify-between text-xs">
              <span>Type:</span>
              <Select
                value={
                  collisionProps.usePixelAccurateCollision ? "pixel" : "tile"
                }
                onValueChange={(value) =>
                  onUpdateCollisionProperty(
                    "usePixelAccurateCollision",
                    value === "pixel",
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
        <p className="text-gray-500 text-xs">No collision data</p>
      )}
    </div>
  );
}

interface MightyMikeTileMenuProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  onResize: (
    direction: "top" | "bottom" | "left" | "right",
    tileCount: number,
  ) => void;
}

// Mighty Mike source tiles are fixed 32x32 in the original engine tile set.
// Keep palette uploads/edits constrained to this size and current palette bounds.
const TILE_SIZE = 32;

export function MightyMikeTileMenu({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
  onResize,
}: MightyMikeTileMenuProps) {
  const [selectedTile] = useAtom(SelectedTile);
  const [showCollisionOverlay, setShowCollisionOverlay] = useAtom(
    ShowMightyMikeCollisionOverlay,
  );
  const [collisionBrushMode, setCollisionBrushMode] =
    useAtom(CollisionBrushMode);
  const [showParamsOverlay, setShowParamsOverlay] = useAtom(
    ShowMightyMikeParamsOverlay,
  );
  const [paramBrushField, setParamBrushField] = useAtom(ParamBrushField);
  const [paramBrushValue, setParamBrushValue] = useAtom(ParamBrushValue);

  // Local state
  const [manualTilePaletteSelection, setManualTilePaletteSelection] = useState<{
    tile: number;
    palette: number;
  } | null>(null);
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [isEditingPaletteTile, setIsEditingPaletteTile] = useState(false);
  const paletteUploadInputRef = useRef<HTMLInputElement>(null);

  // Get required data
  const header = headerData.Hedr[1000].obj;
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  const tilesetTileAttributes = useMemo(() => {
    const tileset = isRecord(terrainData.tileset)
      ? terrainData.tileset
      : undefined;
    const tileAttributes =
      tileset && isArray(tileset.tileAttributes) ? tileset.tileAttributes : [];
    return tileAttributes.filter(isRecord);
  }, [terrainData.tileset]);

  // Get collision data from Mighty Mike metadata using type guards
  const metadata = isRecord(terrainData._metadata)
    ? terrainData._metadata
    : undefined;
  const metadataEntry =
    metadata && isRecord(metadata[1000]) ? metadata[1000] : undefined;
  const metadataObj =
    metadataEntry && isRecord(metadataEntry.obj)
      ? metadataEntry.obj
      : undefined;
  const mightyMikeTileValuesArray =
    metadataObj && isArray(metadataObj.mightyMikeTileValues)
      ? metadataObj.mightyMikeTileValues
      : [];

  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  const totalTiles = mapWidth * mapHeight;
  const effectiveSelectedTile =
    totalTiles > 0 && selectedTile >= 0 && selectedTile < totalTiles
      ? selectedTile
      : 0;

  const selectedPaletteTile = useMemo(() => {
    if (effectiveSelectedTile < 0 || effectiveSelectedTile >= layr.length)
      return 0;
    const tileIndexValue = layr[effectiveSelectedTile];
    if (tileIndexValue === undefined || tileIndexValue === null) return 0;
    let imageIndex: number = tileIndexValue;
    if (xlatTable && tileIndexValue >= 0 && tileIndexValue < xlatTable.length) {
      const entry = xlatTable[tileIndexValue];
      if (entry && typeof entry === "object" && "idx" in entry) {
        imageIndex = (entry as { idx: number }).idx;
      }
    }
    if (imageIndex >= 0 && imageIndex < mapImages.length) {
      return manualTilePaletteSelection?.tile === effectiveSelectedTile
        ? manualTilePaletteSelection.palette
        : imageIndex;
    }
    return 0;
  }, [
    effectiveSelectedTile,
    layr,
    xlatTable,
    mapImages.length,
    manualTilePaletteSelection,
  ]);

  // Helper: Get collision properties for current tile
  const getCollisionProperties = (): {
    hasCollisionMask: boolean;
    usePixelAccurateCollision: boolean;
  } | null => {
    if (
      effectiveSelectedTile < 0 ||
      effectiveSelectedTile >= mightyMikeTileValuesArray.length
    ) {
      return null;
    }

    const tileValue = mightyMikeTileValuesArray[effectiveSelectedTile];
    if (!isRecord(tileValue)) return null;
    return {
      hasCollisionMask: getBoolean(tileValue.hasCollisionMask),
      usePixelAccurateCollision: getBoolean(
        tileValue.usePixelAccurateCollision,
      ),
    };
  };

  // Helper: Get image index for current tile (forward Xlat translation)
  const getCurrentTileImageIndex = (): number | null => {
    if (effectiveSelectedTile < 0 || effectiveSelectedTile >= layr.length)
      return null;

    const tileIndexValue = layr[effectiveSelectedTile];
    if (tileIndexValue === undefined || tileIndexValue === null) return null;

    let imageIndex: number = tileIndexValue;

    if (xlatTable && tileIndexValue >= 0 && tileIndexValue < xlatTable.length) {
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
      return imageIndex >= 0 && imageIndex < mapImages.length
        ? imageIndex
        : null;
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
    if (
      selectedPaletteTile < 0 ||
      selectedPaletteTile >= mapImages.length ||
      !mapImages[selectedPaletteTile]
    ) {
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
      if (
        effectiveSelectedTile >= 0 &&
        effectiveSelectedTile < layerArray.length
      ) {
        layerArray[effectiveSelectedTile] = logicalIndex;
      }
    });

    toast.success(`Tile ${effectiveSelectedTile} replaced`);
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
      a.download = `mighty_mike_tile_${effectiveSelectedTile}.png`;
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
    value: boolean,
  ) => {
    setTerrainData((data) => {
      const meta =
        isRecord(data._metadata) &&
        isRecord(data._metadata[1000]) &&
        isRecord(data._metadata[1000].obj)
          ? data._metadata[1000].obj
          : undefined;
      const tileValues =
        meta && isArray(meta.mightyMikeTileValues)
          ? meta.mightyMikeTileValues
          : undefined;
      if (
        !tileValues ||
        effectiveSelectedTile < 0 ||
        effectiveSelectedTile >= tileValues.length
      )
        return;
      const tileVal = tileValues[effectiveSelectedTile];
      if (!isRecord(tileVal)) return;
      tileVal[property] = value;
    });

    toast.success(
      `Collision ${property === "hasCollisionMask" ? "mask" : "type"} updated`,
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

    const sourceBitmap = await createImageBitmap(file).catch(
      (error: unknown) => {
        toast.error(
          `Failed to read tile: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      },
    );
    if (!sourceBitmap) {
      return;
    }
    if (sourceBitmap.width !== TILE_SIZE || sourceBitmap.height !== TILE_SIZE) {
      toast.error(`Tiles must be ${TILE_SIZE}×${TILE_SIZE}`);
      return;
    }

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
    }).catch((error: unknown) => {
      toast.error(
        `Failed to upload tile: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!imageBitmap) {
      return;
    }
    context.drawImage(imageBitmap, 0, 0);

    // Update mapImages
    const newMapImages = [...mapImages];
    newMapImages[imageIndex] = canvas;
    setMapImages(newMapImages);

    toast.success("Tile image replaced");
  };

  const handleUploadPaletteTile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (selectedPaletteTile < 0 || selectedPaletteTile >= mapImages.length) {
      toast.error("Invalid palette tile selected");
      return;
    }
    const sourceBitmap = await createImageBitmap(file).catch(
      (error: unknown) => {
        toast.error(
          `Failed to read palette tile: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      },
    );
    if (!sourceBitmap) {
      return;
    }
    if (sourceBitmap.width !== TILE_SIZE || sourceBitmap.height !== TILE_SIZE) {
      toast.error(`Palette tiles must be ${TILE_SIZE}×${TILE_SIZE}`);
      return;
    }
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
    const bmp = await createImageBitmap(file, {
      resizeWidth: TILE_SIZE,
      resizeHeight: TILE_SIZE,
      resizeQuality: "high",
    }).catch((error: unknown) => {
      toast.error(
        `Failed to upload palette tile: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!bmp) {
      return;
    }
    context.drawImage(bmp, 0, 0);
    const nextImages = [...mapImages];
    nextImages[selectedPaletteTile] = canvas;
    setMapImages(nextImages);
    e.target.value = "";
    toast.success(`Palette tile #${selectedPaletteTile} updated`);
  };

  const handleSavePaletteTileEdit = async (editedImageData: ImageData) => {
    const canvas = document.createElement("canvas");
    canvas.width = editedImageData.width;
    canvas.height = editedImageData.height;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to get canvas context");
      return;
    }
    context.putImageData(editedImageData, 0, 0);
    const nextImages = [...mapImages];
    nextImages[selectedPaletteTile] = canvas;
    setMapImages(nextImages);
    setIsEditingPaletteTile(false);
    toast.success(`Edited palette tile #${selectedPaletteTile}`);
  };

  const createBlankTileCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
    }
    return canvas;
  };

  const isPaletteTileInUse = useMemo(() => {
    const matchingLogicalIndices = new Set<number>();
    if (xlatTable) {
      xlatTable.forEach((entry, logicalIndex) => {
        if (isRecord(entry) && entry.idx === selectedPaletteTile) {
          matchingLogicalIndices.add(logicalIndex);
        }
      });
    } else {
      matchingLogicalIndices.add(selectedPaletteTile);
    }

    if (matchingLogicalIndices.size === 0) {
      return false;
    }

    return layr.some((tileIndex) => matchingLogicalIndices.has(tileIndex));
  }, [layr, selectedPaletteTile, xlatTable]);

  const handleAddPaletteTile = () => {
    const newImageIndex = mapImages.length;
    setMapImages([...mapImages, createBlankTileCanvas()]);
    setTerrainData((data) => {
      if (data.Xlat?.[1000]?.obj) {
        data.Xlat[1000].obj.push({ idx: newImageIndex });
      }
    });
    setManualTilePaletteSelection({
      tile: effectiveSelectedTile,
      palette: newImageIndex,
    });
    toast.success(`Added palette tile #${newImageIndex}`);
  };

  const handleRemovePaletteTile = () => {
    if (selectedPaletteTile < 0 || selectedPaletteTile >= mapImages.length) {
      toast.error("Invalid palette tile selected");
      return;
    }
    if (isPaletteTileInUse) {
      toast.error("Cannot remove a palette tile that is still in use");
      return;
    }

    setMapImages(mapImages.filter((_, index) => index !== selectedPaletteTile));
    setTerrainData((data) => {
      const xlat = data.Xlat?.[1000]?.obj;
      if (!xlat) {
        return;
      }

      const keptEntries = xlat
        .map((entry, logicalIndex) => ({ entry, logicalIndex }))
        .filter(
          ({ entry }) => isRecord(entry) && entry.idx !== selectedPaletteTile,
        );
      const logicalIndexMap = new Map<number, number>();
      keptEntries.forEach(({ logicalIndex }, nextLogicalIndex) => {
        logicalIndexMap.set(logicalIndex, nextLogicalIndex);
      });

      const xlatEntry = data.Xlat?.[1000];
      if (!xlatEntry) {
        return;
      }
      xlatEntry.obj = keptEntries.map(({ entry }) => ({
        idx:
          typeof entry.idx === "number" && entry.idx > selectedPaletteTile
            ? entry.idx - 1
            : getNumber(entry.idx),
      }));

      if (data.Layr?.[1000]?.obj) {
        data.Layr[1000].obj = data.Layr[1000].obj.map(
          (logicalIndex) => logicalIndexMap.get(logicalIndex) ?? logicalIndex,
        );
      }
    });
    setManualTilePaletteSelection({
      tile: effectiveSelectedTile,
      palette: Math.max(0, selectedPaletteTile - 1),
    });
    toast.success("Palette tile removed");
  };

  if (totalTiles <= 0) {
    return (
      <div className="p-4 text-white">
        <p>No map tiles available for this level.</p>
      </div>
    );
  }

  const currentImageIndex = getCurrentTileImageIndex();
  const collisionProps = getCollisionProperties();
  const currentTileCanvas =
    currentImageIndex !== null ? mapImages[currentImageIndex] : null;
  const currentTileAttributes =
    currentImageIndex !== null &&
    currentImageIndex < tilesetTileAttributes.length
      ? tilesetTileAttributes[currentImageIndex]
      : null;

  const handleUpdateTileAttribute = (
    property: "flags" | "p0" | "p1" | "p2" | "p3" | "p4",
    value: number,
  ) => {
    if (currentImageIndex === null) {
      return;
    }

    setTerrainData((data) => {
      const tileset = isRecord(data.tileset) ? data.tileset : undefined;
      const tileAttributes =
        tileset && isArray(tileset.tileAttributes)
          ? tileset.tileAttributes
          : undefined;
      const tileAttribute = tileAttributes?.[currentImageIndex];
      if (isRecord(tileAttribute)) {
        tileAttribute[property] = value;
      }

      const levelTileAttribute = data.Atrb?.[1000]?.obj?.[currentImageIndex];
      if (
        levelTileAttribute &&
        (property === "flags" || property === "p0" || property === "p1")
      ) {
        levelTileAttribute[property] = value;
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-0 overflow-hidden">
        <div className="border border-gray-700 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-gray-300">
              Resize Map
            </p>
            <span className="text-[11px] text-gray-500">
              Add or remove rows and columns
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { direction: "top" as const, label: "Top" },
              { direction: "bottom" as const, label: "Bottom" },
              { direction: "left" as const, label: "Left" },
              { direction: "right" as const, label: "Right" },
            ].map(({ direction, label }) => (
              <div
                key={direction}
                className="flex items-center justify-between gap-2 rounded border border-gray-600 px-2 py-1"
              >
                <span className="text-xs font-medium text-gray-200">
                  {label}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => onResize(direction, 1)}
                    title={`Add ${label.toLowerCase()}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0"
                    onClick={() => onResize(direction, -1)}
                    title={`Remove ${label.toLowerCase()}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid — each column manages its own overflow */}
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Selected Tile Operations */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            <p className="font-bold text-sm">Tile #{effectiveSelectedTile}</p>

            {/* Compact Tile Preview */}
            <div className="border border-gray-600 self-start">
              <TileCanvas image={currentTileCanvas ?? undefined} size={64} />
            </div>

            {/* Upload Button */}
            <div>
              <p className="text-xs mb-1">Replace Image</p>
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

          {/* Middle Column: Collision Overlay + Collision Properties + Tile Info (in tooltip) */}
          <div className="flex flex-col gap-2 text-sm overflow-y-auto">
            {/* Collision Overlay Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Collision Overlay</span>
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

            {/* Collision brush toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Collision Brush</span>
              <Button
                size="sm"
                variant={collisionBrushMode ? "default" : "outline"}
                onClick={() => setCollisionBrushMode(!collisionBrushMode)}
                title={
                  collisionBrushMode
                    ? "Disable collision brush (click tiles to toggle)"
                    : "Enable collision brush — drag to toggle collision on tiles"
                }
              >
                <Paintbrush className="w-4 h-4" />
              </Button>
            </div>

            {/* Tile Information — collapsed into an info tooltip to save space */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer w-fit">
                    <Info className="w-3 h-3" />
                    Tile Info
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="text-xs space-y-0.5 max-w-48"
                >
                  <p>
                    Map: {mapWidth} × {mapHeight}
                  </p>
                  <p>Total: {totalTiles}</p>
                  <p>Images: {mapImages.length}</p>
                  <p>Pos: {effectiveSelectedTile}</p>
                  <p>
                    Logical:{" "}
                    {effectiveSelectedTile < layr.length
                      ? layr[effectiveSelectedTile]
                      : "N/A"}
                  </p>
                  <p>Physical: {currentImageIndex ?? "N/A"}</p>
                  <p>Xlat: {xlatTable ? "Yes" : "No"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Collision Properties Section */}
            {mightyMikeTileValuesArray.length > 0 ? (
              <CollisionPropertiesSection
                collisionProps={collisionProps}
                onUpdateCollisionProperty={handleUpdateCollisionProperty}
              />
            ) : null}

            {currentTileAttributes && (
              <div className="border-t border-gray-600 pt-2 space-y-2">
                <p className="font-bold text-xs">Tile Parameters</p>

                {/* Flags as individual bit checkboxes */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Flags</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {(
                      [
                        [0, "Solid Top"],
                        [1, "Solid Bottom"],
                        [2, "Solid Left"],
                        [3, "Solid Right"],
                        [4, "Death"],
                        [5, "Hurt"],
                        [6, "(unused)"],
                        [7, "Water"],
                        [8, "Wind"],
                        [9, "Bullets Pass Through"],
                        [10, "Stairs"],
                        [11, "Friction"],
                        [12, "Ice"],
                        [13, "(unused)"],
                        [14, "(unused)"],
                        [15, "Track"],
                      ] as [number, string][]
                    ).map(([bit, label]) => {
                      const mask = 1 << bit;
                      const checked =
                        (getNumber(currentTileAttributes["flags"]) & mask) !== 0;
                      return (
                        <label
                          key={bit}
                          className="flex items-center gap-1 text-xs cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              const current = getNumber(
                                currentTileAttributes["flags"],
                              );
                              const next = val ? current | mask : current & ~mask;
                              handleUpdateTileAttribute("flags", next);
                            }}
                            className="h-3 w-3"
                          />
                          <span title={`Bit ${bit}`}>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Numeric params */}
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center text-xs">
                  {(["p0", "p1"] as const).map((property) => (
                    <div key={property} className="contents">
                      <label className="text-gray-300">
                        Parameter {property[1]}
                      </label>
                      <Input
                        type="number"
                        value={getNumber(
                          currentTileAttributes[property],
                        ).toString()}
                        onChange={(e) =>
                          handleUpdateTileAttribute(
                            property,
                            Number.parseInt(e.target.value || "0", 10) || 0,
                          )
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Param Brush Controls */}
                <div className="border-t border-gray-600 pt-2">
                  <p className="text-xs text-gray-400 mb-1">Param Brush</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Select
                        value={paramBrushField ?? "none"}
                        onValueChange={(v) => {
                          if (v === "flags" || v === "p0" || v === "p1") {
                            setParamBrushField(v);
                          } else {
                            setParamBrushField(null);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Off" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Off</SelectItem>
                          <SelectItem value="flags">Flags</SelectItem>
                          <SelectItem value="p0">Parameter 0</SelectItem>
                          <SelectItem value="p1">Parameter 1</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="h-7 text-xs w-16"
                        value={paramBrushValue}
                        onChange={(e) =>
                          setParamBrushValue(
                            Number.parseInt(e.target.value || "0", 10) || 0,
                          )
                        }
                        disabled={paramBrushField === null}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={showParamsOverlay ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setShowParamsOverlay(!showParamsOverlay)}
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      {showParamsOverlay
                        ? "Hide Params Overlay"
                        : "Show Params Overlay"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tile Palette */}
          <div className="flex flex-col gap-2 min-h-0">
            <p className="font-bold text-sm flex-none">Tile Palette</p>

            {/* Scrollable Tile Grid — overflow-auto so it doesn't cause the whole menu to overflow */}
            <div className="flex-1 overflow-auto border border-gray-600 p-1">
              <div className="grid grid-cols-4 gap-1">
                {mapImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      setManualTilePaletteSelection({
                        tile: effectiveSelectedTile,
                        palette: idx,
                      })
                    }
                    className={`cursor-pointer transition-all ${
                      selectedPaletteTile === idx
                        ? "ring-2 ring-green-500 rounded"
                        : "hover:ring-1 hover:ring-blue-500 rounded"
                    }`}
                    title={`Tile #${idx}`}
                  >
                    <TileCanvas image={img} size={32} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-none">
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
          imageName={`Tile_${effectiveSelectedTile}`}
        />
      )}
      {isEditingPaletteTile && (
        <ImageEditor
          isOpen={isEditingPaletteTile}
          onClose={() => setIsEditingPaletteTile(false)}
          imageUrl={
            mapImages[selectedPaletteTile]?.toDataURL("image/png") ?? ""
          }
          onSave={handleSavePaletteTileEdit}
          imageName={`Palette_${selectedPaletteTile}`}
        />
      )}
    </div>
    </div>
  );
}
