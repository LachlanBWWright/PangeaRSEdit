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
import { ImageEditor } from "@/components/ImageEditor";
import { toast } from "sonner";
import {
  CollisionBrushMode,
  ShowMightyMikeCollisionOverlay,
  ShowMightyMikeParamsOverlay,
  ParamBrushField,
  ParamBrushValue,
} from "@/data/game/gameAtoms";
import { MightyMikeTileOperationsPanel } from "./MightyMikeTileOperationsPanel";
import { MightyMikeTileInspectorPanel } from "./MightyMikeTileInspectorPanel";
import { MightyMikePalettePanel } from "./MightyMikePalettePanel";
import { MightyMikeResizeMapControls } from "./MightyMikeResizeMapControls";
import {
  createCloseEditorHandler,
  createParamBrushFieldChangeHandler,
  createSetManualTilePaletteSelectionHandler,
  createToggleBooleanHandler,
  createUpdateCollisionPropertyHandler,
  createUpdateTileAttributeHandler,
} from "./MightyMikeTileMenuHandlers";

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

interface MightyMikeTileMenuProps {
  headerData: HeaderData;
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
      ? tilesetTileAttributes[currentImageIndex] ?? null
      : null;

  const handleUpdateCollisionProperty = createUpdateCollisionPropertyHandler(
    setTerrainData,
    effectiveSelectedTile,
  );
  const handleUpdateTileAttribute = createUpdateTileAttributeHandler(
    setTerrainData,
    currentImageIndex,
  );
  const handleShowCollisionOverlayClick = createToggleBooleanHandler(
    setShowCollisionOverlay,
    showCollisionOverlay,
  );
  const handleCollisionBrushModeClick = createToggleBooleanHandler(
    setCollisionBrushMode,
    collisionBrushMode,
  );
  const handleShowParamsOverlayClick = createToggleBooleanHandler(
    setShowParamsOverlay,
    showParamsOverlay,
  );
  const handleParamBrushFieldChange =
    createParamBrushFieldChangeHandler(setParamBrushField);
  const handleCloseTileEditor = createCloseEditorHandler(
    setIsEditingTile,
    setEditingImageUrl,
  );
  const handleClosePaletteEditor = createCloseEditorHandler(
    setIsEditingPaletteTile,
  );
  const handleManualTilePaletteSelection =
    createSetManualTilePaletteSelectionHandler(
      setManualTilePaletteSelection,
      effectiveSelectedTile,
    );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-2 flex-1 min-h-0 overflow-hidden">
          <MightyMikeTileOperationsPanel
            currentImageIndex={currentImageIndex}
            currentTileCanvas={currentTileCanvas ?? null}
            effectiveSelectedTile={effectiveSelectedTile}
            handleUploadTile={handleUploadTile}
            handleEditTile={handleEditTile}
            handleDownloadTile={handleDownloadTile}
          />

          <MightyMikeTileInspectorPanel
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            totalTiles={totalTiles}
            mapImagesLength={mapImages.length}
            effectiveSelectedTile={effectiveSelectedTile}
            layr={layr}
            currentImageIndex={currentImageIndex}
            xlatTable={xlatTable}
            collisionProps={collisionProps ?? null}
            mightyMikeTileValuesArrayLength={mightyMikeTileValuesArray.length}
            currentTileAttributes={currentTileAttributes}
            showCollisionOverlay={showCollisionOverlay}
            onToggleCollisionOverlay={handleShowCollisionOverlayClick}
            collisionBrushMode={collisionBrushMode}
            onToggleCollisionBrushMode={handleCollisionBrushModeClick}
            paramBrushField={paramBrushField}
            onParamBrushFieldChange={handleParamBrushFieldChange}
            paramBrushValue={paramBrushValue}
            setParamBrushValue={setParamBrushValue}
            showParamsOverlay={showParamsOverlay}
            onToggleParamsOverlay={handleShowParamsOverlayClick}
            onResize={onResize}
            handleUpdateCollisionProperty={handleUpdateCollisionProperty}
            handleUpdateTileAttribute={handleUpdateTileAttribute}
            getNumber={getNumber}
          />

          <MightyMikePalettePanel
            mapImages={mapImages}
            selectedPaletteTile={selectedPaletteTile}
            isPaletteTileInUse={isPaletteTileInUse}
            paletteUploadInputRef={paletteUploadInputRef}
            setIsEditingPaletteTile={setIsEditingPaletteTile}
            handleUploadPaletteTile={handleUploadPaletteTile}
            handleAddPaletteTile={handleAddPaletteTile}
            handleRemovePaletteTile={handleRemovePaletteTile}
            handleReplaceTile={handleReplaceTile}
            onSelectPaletteTile={handleManualTilePaletteSelection}
          />

          <MightyMikeResizeMapControls onResize={onResize} />
        </div>
      </div>

      {/* Image Editor Modal */}
      {isEditingTile && editingImageUrl && (
        <ImageEditor
          isOpen={isEditingTile}
          onClose={handleCloseTileEditor}
          imageUrl={editingImageUrl}
          onSave={handleSaveTileEdit}
          imageName={`Tile_${effectiveSelectedTile}`}
        />
      )}
      {isEditingPaletteTile && (
        <ImageEditor
          isOpen={isEditingPaletteTile}
          onClose={handleClosePaletteEditor}
          imageUrl={
            mapImages[selectedPaletteTile]?.toDataURL("image/png") ?? ""
          }
          onSave={handleSavePaletteTileEdit}
          imageName={`Palette_${selectedPaletteTile}`}
        />
      )}
    </div>
  );
}
