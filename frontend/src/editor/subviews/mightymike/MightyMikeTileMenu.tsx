import { useAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import type { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { toast } from "sonner";
import {
  CollisionBrushMode,
  ShowMightyMikeCollisionOverlay,
  ShowMightyMikeParamsOverlay,
  ParamBrushField,
  ParamBrushValue,
} from "@/data/game/gameAtoms";
import {
  createCloseEditorHandler,
  createParamBrushFieldChangeHandler,
  createSetManualTilePaletteSelectionHandler,
  createToggleBooleanHandler,
  createUpdateCollisionPropertyHandler,
  createUpdateTileAttributeHandler,
} from "./MightyMikeTileMenuHandlers";
import {
  computeSelectedPaletteTile,
  createBlankTileCanvas,
  downloadCanvasAsPng,
  findTileIndexForImage,
  getCurrentTileImageIndex,
  getFileFromInputEvent,
  getNumber,
  getCollisionProperties,
  isPaletteTileInUse,
  isArray,
  isRecord,
  removePaletteTile,
  replaceTileImage,
  saveEditedImage,
} from "./MightyMikeTileMenuUtils";
import {
  appendPaletteMapping,
  applySelectedTileLogicalIndex,
  getCurrentTileAttributes,
  getCurrentTileCanvas,
  getEffectiveSelectedTile,
  getTotalTileCount,
  isValidPaletteTileIndex,
} from "./mightyMikeTileMenuState";
import { MightyMikeTileMenuEditors } from "./MightyMikeTileMenuEditors";
import { MightyMikeTileMenuContent } from "./MightyMikeTileMenuContent";

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

  const [manualTilePaletteSelection, setManualTilePaletteSelection] = useState<{
    tile: number;
    palette: number;
  } | null>(null);
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [isEditingPaletteTile, setIsEditingPaletteTile] = useState(false);
  const paletteUploadInputRef = useRef<HTMLInputElement>(null);

  const header = headerData.Hedr[1000].obj;
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

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
  const totalTiles = getTotalTileCount(mapWidth, mapHeight);
  const effectiveSelectedTile = getEffectiveSelectedTile(
    selectedTile,
    totalTiles,
  );

  const selectedPaletteTile = useMemo(
    () =>
      computeSelectedPaletteTile(
        effectiveSelectedTile,
        layr,
        xlatTable,
        mapImages.length,
        manualTilePaletteSelection,
      ),
    [
      effectiveSelectedTile,
      layr,
      xlatTable,
      mapImages.length,
      manualTilePaletteSelection,
    ],
  );

  const currentImageIndex = getCurrentTileImageIndex(
    effectiveSelectedTile,
    layr,
    xlatTable,
    mapImages.length,
  );

  const collisionProps = getCollisionProperties(
    effectiveSelectedTile,
    mightyMikeTileValuesArray,
  );

  const currentTileCanvas = getCurrentTileCanvas(mapImages, currentImageIndex);

  const currentTileAttributes = getCurrentTileAttributes(
    terrainData,
    currentImageIndex,
  );

  const paletteTileIsInUse = useMemo(
    () => isPaletteTileInUse(layr, selectedPaletteTile, xlatTable),
    [layr, selectedPaletteTile, xlatTable],
  );

  const handleReplaceTile = () => {
    if (
      !isValidPaletteTileIndex(selectedPaletteTile, mapImages.length) ||
      !mapImages[selectedPaletteTile]
    ) {
      toast.error("Invalid palette tile selected");
      return;
    }

    const logicalIndex = findTileIndexForImage(
      selectedPaletteTile,
      xlatTable,
      mapImages.length,
    );
    if (logicalIndex === null) {
      toast.error("Failed to find logical tile index for palette tile");
      return;
    }

    setTerrainData((data) => {
      applySelectedTileLogicalIndex(data, effectiveSelectedTile, logicalIndex);
    });

    toast.success(`Tile ${effectiveSelectedTile} replaced`);
  };

  const handleDownloadTile = () => {
    if (currentImageIndex === null) {
      toast.error("No valid tile to download");
      return;
    }

    const canvas = mapImages[currentImageIndex];
    if (!canvas) {
      toast.error("Tile image not found");
      return;
    }

    downloadCanvasAsPng(
      canvas,
      `mighty_mike_tile_${effectiveSelectedTile}.png`,
    );
  };

  const handleEditTile = () => {
    if (currentImageIndex === null) {
      toast.error("No valid tile to edit");
      return;
    }

    const canvas = mapImages[currentImageIndex];
    if (!canvas) {
      toast.error("Tile image not found");
      return;
    }

    setEditingImageUrl(canvas.toDataURL("image/png"));
    setIsEditingTile(true);
  };

  const handleSaveTileEdit = async (editedImageData: ImageData) => {
    if (currentImageIndex === null) {
      toast.error("Invalid tile index");
      return;
    }

    await saveEditedImage(
      editedImageData,
      currentImageIndex,
      mapImages,
      setMapImages,
    );
    setIsEditingTile(false);
    setEditingImageUrl(null);
    toast.success("Tile updated successfully");
  };

  const handleUploadTile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = getFileFromInputEvent(event);
    if (!file) return;

    if (currentImageIndex === null) {
      toast.error("No valid tile selected for upload");
      return;
    }

    await replaceTileImage(
      file,
      currentImageIndex,
      mapImages,
      setMapImages,
      "Tile image replaced",
    );
  };

  const handleUploadPaletteTile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = getFileFromInputEvent(event);
    if (!file) return;

    if (!isValidPaletteTileIndex(selectedPaletteTile, mapImages.length)) {
      toast.error("Invalid palette tile selected");
      return;
    }

    await replaceTileImage(
      file,
      selectedPaletteTile,
      mapImages,
      setMapImages,
      `Palette tile #${selectedPaletteTile} updated`,
    );

    event.target.value = "";
  };

  const handleSavePaletteTileEdit = async (editedImageData: ImageData) => {
    await saveEditedImage(
      editedImageData,
      selectedPaletteTile,
      mapImages,
      setMapImages,
    );
    setIsEditingPaletteTile(false);
    toast.success(`Edited palette tile #${selectedPaletteTile}`);
  };

  const handleAddPaletteTile = () => {
    const newImageIndex = mapImages.length;
    setMapImages([...mapImages, createBlankTileCanvas()]);
    setTerrainData((data) => {
      appendPaletteMapping(data, newImageIndex);
    });
    setManualTilePaletteSelection({
      tile: effectiveSelectedTile,
      palette: newImageIndex,
    });
    toast.success(`Added palette tile #${newImageIndex}`);
  };

  const handleRemovePaletteTile = () => {
    if (!isValidPaletteTileIndex(selectedPaletteTile, mapImages.length)) {
      toast.error("Invalid palette tile selected");
      return;
    }
    if (paletteTileIsInUse) {
      toast.error("Cannot remove a palette tile that is still in use");
      return;
    }

    removePaletteTile(
      selectedPaletteTile,
      mapImages,
      setMapImages,
      setTerrainData,
    );

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
      <MightyMikeTileMenuContent
        currentImageIndex={currentImageIndex}
        currentTileCanvas={currentTileCanvas}
        effectiveSelectedTile={effectiveSelectedTile}
        handleUploadTile={handleUploadTile}
        handleEditTile={handleEditTile}
        handleDownloadTile={handleDownloadTile}
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        totalTiles={totalTiles}
        mapImagesLength={mapImages.length}
        layr={layr}
        xlatTable={xlatTable}
        collisionProps={collisionProps}
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
        mapImages={mapImages}
        selectedPaletteTile={selectedPaletteTile}
        isPaletteTileInUse={paletteTileIsInUse}
        paletteUploadInputRef={paletteUploadInputRef}
        setIsEditingPaletteTile={setIsEditingPaletteTile}
        handleUploadPaletteTile={handleUploadPaletteTile}
        handleAddPaletteTile={handleAddPaletteTile}
        handleRemovePaletteTile={handleRemovePaletteTile}
        handleReplaceTile={handleReplaceTile}
        onSelectPaletteTile={handleManualTilePaletteSelection}
      />

      <MightyMikeTileMenuEditors
        isEditingTile={isEditingTile}
        editingImageUrl={editingImageUrl}
        isEditingPaletteTile={isEditingPaletteTile}
        selectedPaletteTile={selectedPaletteTile}
        mapImages={mapImages}
        effectiveSelectedTile={effectiveSelectedTile}
        onCloseTileEditor={handleCloseTileEditor}
        onClosePaletteEditor={handleClosePaletteEditor}
        onSaveTileEdit={handleSaveTileEdit}
        onSavePaletteTileEdit={handleSavePaletteTileEdit}
      />
    </div>
  );
}
