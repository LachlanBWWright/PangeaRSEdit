import { useAtom, useSetAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import type { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { toast } from "sonner";
import {
  MightyMikeCanvasEditMode,
  MightyMikeCollisionBrushModeValue,
  MightyMikeOverlayMode,
  type MightyMikeCanvasEditModeValue,
} from "@/data/game/gameAtoms";
import {
  createCloseEditorHandler,
  createSetManualTilePaletteSelectionHandler,
  createUpdateCollisionPropertyHandler,
  createUpdatePaletteAttributeHandler,
} from "./MightyMikeTileMenuHandlers";
import {
  computeSelectedPaletteTile,
  getCurrentTileImageIndex,
  getFileFromInputEvent,
  getNumber,
  getCollisionProperties,
  isPaletteTileInUse,
  isArray,
  isRecord,
  removePaletteTile,
  type TileImageTransform,
} from "./MightyMikeTileMenuUtils";
import {
  applySelectedTileLogicalIndex,
  getCurrentTileCanvas,
  getEffectiveSelectedTile,
  getPaletteTileAttributes,
  getTotalTileCount,
  findOrCreateLogicalIndexForImage,
  isValidPaletteTileIndex,
} from "./mightyMikeTileMenuState";
import { MightyMikeTileMenuEditors } from "./MightyMikeTileMenuEditors";
import { TileBrushPanel } from "@/editor/subviews/tileBrushes/TileBrushPanel";
import { MightyMikeTileOperationsPanel } from "./MightyMikeTileOperationsPanel";
import { MightyMikePalettePanel } from "./MightyMikePalettePanel";
import { MightyMikeTileInspectorPanel } from "./MightyMikeTileInspectorPanel";
import { MenuEmptyState } from "../MenuEmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTileInfoRows } from "./mightyMikeTileInspectorState";
import { MightyMikeAltMapEditorPanel } from "./MightyMikeAltMapEditor";
import { TileSelectionModePanel } from "../shared/TileSelectionModePanel";
import {
  createMightyMikePaletteCanvas,
  findMatchingMightyMikePaletteTile,
  loadAndQuantizeMightyMikeTile,
  quantizeMightyMikeCanvas,
  quantizeMightyMikeTile,
  renderMightyMikePaletteIndices,
  transformMightyMikePaletteIndices,
} from "./mightyMikePaletteQuantization";
import {
  getMightyMikePaletteTileState,
  replaceMightyMikePaletteTileIndices,
} from "./mightyMikePaletteTileState";

const EMPTY_PALETTE_ATTRIBUTES: Readonly<Record<string, number>> = {
  flags: 0,
  p0: 0,
  p1: 0,
  p2: 0,
  p3: 0,
  p4: 0,
};

interface MightyMikeTileMenuProps {
  mode: "visual" | "behavior";
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
}

export function MightyMikeTileMenu({
  mode,
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
}: MightyMikeTileMenuProps) {
  const [selectedTile] = useAtom(SelectedTile);
  const setOverlayMode = useSetAtom(MightyMikeOverlayMode);
  const [canvasEditMode, setCanvasEditMode] = useAtom(MightyMikeCanvasEditMode);
  const [collisionBrushValue, setCollisionBrushValue] = useAtom(
    MightyMikeCollisionBrushModeValue,
  );

  const [manualTilePaletteSelection, setManualTilePaletteSelection] = useState<{
    tile: number;
    palette: number;
  } | null>(null);
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

  const currentPaletteAttributes = getPaletteTileAttributes(
    terrainData,
    selectedPaletteTile,
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

    setTerrainData((data) => {
      const logicalIndex = findOrCreateLogicalIndexForImage(
        data,
        selectedPaletteTile,
      );
      if (logicalIndex === null) {
        return;
      }
      applySelectedTileLogicalIndex(data, effectiveSelectedTile, logicalIndex);
    });

    toast.success(`Tile ${effectiveSelectedTile} replaced`);
  };

  const handleApplyPaletteTransform = (transform: TileImageTransform) => {
    if (!isValidPaletteTileIndex(selectedPaletteTile, mapImages.length)) {
      toast.error("Invalid palette tile selected");
      return;
    }

    const sourceCanvas = mapImages[selectedPaletteTile];
    if (!sourceCanvas) {
      toast.error("Palette tile image not found");
      return;
    }

    const paletteState = getMightyMikePaletteTileState(terrainData);
    if (paletteState.isErr()) {
      toast.error(paletteState.error);
      return;
    }
    const sourceIndices = paletteState.value.paletteIndices[selectedPaletteTile];
    const quantizedSource = quantizeMightyMikeCanvas(
      sourceCanvas,
      paletteState.value.palette,
      paletteState.value.transparencyColors,
    );
    if (!sourceIndices && quantizedSource.isErr()) {
      toast.error(quantizedSource.error);
      return;
    }
    const sourceResult = sourceIndices
      ? [...sourceIndices]
      : quantizedSource.isOk()
        ? quantizedSource.value.indices
        : [];
    const transformedIndices = transformMightyMikePaletteIndices(
      sourceResult,
      transform,
    );
    if (transformedIndices.isErr()) {
      toast.error(transformedIndices.error);
      return;
    }
    const rendered = renderMightyMikePaletteIndices(
      transformedIndices.value,
      paletteState.value.palette,
      paletteState.value.transparencyColors,
    );
    if (rendered.isErr()) {
      toast.error(rendered.error);
      return;
    }
    const transformedCanvas = createMightyMikePaletteCanvas(rendered.value);
    if (transformedCanvas.isErr()) {
      toast.error(transformedCanvas.error);
      return;
    }
    const existingImageIndex = findMatchingMightyMikePaletteTile(
      paletteState.value.paletteIndices,
      transformedIndices.value,
    );
    const targetImageIndex =
      existingImageIndex === null ? mapImages.length : existingImageIndex;

    if (existingImageIndex === null) {
      setMapImages([...mapImages, transformedCanvas.value]);
    }

    setTerrainData((data) => {
      if (existingImageIndex === null) {
        replaceMightyMikePaletteTileIndices(
          data,
          targetImageIndex,
          transformedIndices.value,
        );
      }
      const logicalIndex = findOrCreateLogicalIndexForImage(
        data,
        targetImageIndex,
        selectedPaletteTile,
      );
      if (logicalIndex !== null) {
        applySelectedTileLogicalIndex(data, effectiveSelectedTile, logicalIndex);
      }
    });

    setManualTilePaletteSelection({
      tile: effectiveSelectedTile,
      palette: targetImageIndex,
    });

    toast.success(
      transform === "rotate"
        ? "Tile rotated"
        : transform === "flipX"
          ? "Tile mirrored horizontally"
          : "Tile mirrored vertically",
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

    const paletteState = getMightyMikePaletteTileState(terrainData);
    if (paletteState.isErr()) {
      toast.error(paletteState.error);
      return;
    }
    const quantized = await loadAndQuantizeMightyMikeTile(
      file,
      paletteState.value.palette,
      paletteState.value.transparencyColors,
    );
    if (quantized.isErr()) {
      toast.error(quantized.error);
      return;
    }
    const nextImages = [...mapImages];
    nextImages[selectedPaletteTile] = quantized.value.canvas;
    setMapImages(nextImages);
    setTerrainData((data) => {
      replaceMightyMikePaletteTileIndices(
        data,
        selectedPaletteTile,
        quantized.value.indices,
      );
    });
    toast.success(`Palette tile #${selectedPaletteTile} replaced and quantized`);

    event.target.value = "";
  };

  const handleSavePaletteTileEdit = async (editedImageData: ImageData) => {
    const paletteState = getMightyMikePaletteTileState(terrainData);
    if (paletteState.isErr()) {
      toast.error(paletteState.error);
      return;
    }
    const quantized = quantizeMightyMikeTile({
      rgba: editedImageData.data,
      palette: paletteState.value.palette,
      transparencyColors: paletteState.value.transparencyColors,
    });
    if (quantized.isErr()) {
      toast.error(quantized.error);
      return;
    }
    const canvas = createMightyMikePaletteCanvas(quantized.value.rgba);
    if (canvas.isErr()) {
      toast.error(canvas.error);
      return;
    }
    const nextImages = [...mapImages];
    nextImages[selectedPaletteTile] = canvas.value;
    setMapImages(nextImages);
    setTerrainData((data) => {
      replaceMightyMikePaletteTileIndices(
        data,
        selectedPaletteTile,
        quantized.value.indices,
      );
    });
    setIsEditingPaletteTile(false);
    toast.success(`Edited and quantized palette tile #${selectedPaletteTile}`);
  };

  const handleAddPaletteTile = () => {
    const paletteState = getMightyMikePaletteTileState(terrainData);
    if (paletteState.isErr()) {
      toast.error(paletteState.error);
      return;
    }
    const blankIndex = paletteState.value.transparencyColors[0] ?? 0;
    const blankIndices = new Array<number>(32 * 32).fill(blankIndex);
    const rendered = renderMightyMikePaletteIndices(
      blankIndices,
      paletteState.value.palette,
      paletteState.value.transparencyColors,
    );
    if (rendered.isErr()) {
      toast.error(rendered.error);
      return;
    }
    const canvas = createMightyMikePaletteCanvas(rendered.value);
    if (canvas.isErr()) {
      toast.error(canvas.error);
      return;
    }
    const newImageIndex = mapImages.length;
    setMapImages([...mapImages, canvas.value]);
    setTerrainData((data) => {
      replaceMightyMikePaletteTileIndices(data, newImageIndex, blankIndices);
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

  const handleUpdateCollisionProperty = createUpdateCollisionPropertyHandler(
    setTerrainData,
    effectiveSelectedTile,
  );
  const handleUpdateTileAttribute = createUpdatePaletteAttributeHandler(
    setTerrainData,
    selectedPaletteTile,
  );
  const handleClosePaletteEditor = createCloseEditorHandler(
    setIsEditingPaletteTile,
  );
  const handleManualTilePaletteSelection =
    createSetManualTilePaletteSelectionHandler(
      setManualTilePaletteSelection,
      effectiveSelectedTile,
    );

  const tileInfoRows = useMemo(
    () =>
      getTileInfoRows({
        mapWidth,
        mapHeight,
        totalTiles,
        mapImagesLength: mapImages.length,
        effectiveSelectedTile,
        layr,
        currentImageIndex,
        hasXlatTable: Boolean(xlatTable),
      }),
    [
      mapWidth,
      mapHeight,
      totalTiles,
      mapImages.length,
      effectiveSelectedTile,
      layr,
      currentImageIndex,
      xlatTable,
    ],
  );

  const handleBrushModeChange = (value: string) => {
    if (value !== "select" && value !== "collision" && value !== "altMap") {
      return;
    }
    const nextMode: MightyMikeCanvasEditModeValue = value;
    setCanvasEditMode(nextMode);
    setOverlayMode(
      nextMode === "collision"
        ? "collision"
        : nextMode === "altMap"
          ? "altMap"
          : "none",
    );
  };

  const handleCollisionBrushValueChange = (value: string) => {
    if (value === "enabled" || value === "disabled") {
      setCollisionBrushValue(value);
    }
  };


  if (totalTiles <= 0) {
    return (
      <MenuEmptyState
        title="No Map Tiles"
        description="This level doesn't contain any map tiles to edit."
        fillHeight
      />
    );
  }

  return (
    <>
      {mode === "visual" ? (
        <div className="grid h-full min-h-0 gap-3 p-3 xl:grid-cols-3">
          <div className="min-h-0 overflow-auto pr-1 xl:border-r xl:border-gray-700 xl:pr-3">
            <TileSelectionModePanel
              game="mightymike"
              individualTile={(
                <MightyMikeTileOperationsPanel
                  currentImageIndex={currentImageIndex}
                  currentTileCanvas={currentTileCanvas}
                  selectedPaletteTile={selectedPaletteTile}
                  handleRotateTile={() => handleApplyPaletteTransform("rotate")}
                  handleFlipTileHorizontal={() =>
                    handleApplyPaletteTransform("flipX")
                  }
                  handleFlipTileVertical={() =>
                    handleApplyPaletteTransform("flipY")
                  }
                />
              )}
              stampLibrary={(
                <TileBrushPanel
                  game="mightymike"
                  mapImages={mapImages}
                  xlatTable={xlatTable}
                />
              )}
            />
          </div>

          <div className="min-h-0 overflow-hidden xl:border-r xl:border-gray-700 xl:px-3">
            <MightyMikePalettePanel
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
          </div>

          <div className="min-h-0 overflow-auto xl:pl-3">
            <p className="mb-1 text-xs font-bold text-gray-300">
              Shared behavior for image #{selectedPaletteTile}
            </p>
            <MightyMikeTileInspectorPanel
              showCellMask={false}
              showTileBehavior
              mapWidth={mapWidth}
              mapHeight={mapHeight}
              totalTiles={totalTiles}
              mapImagesLength={mapImages.length}
              effectiveSelectedTile={effectiveSelectedTile}
              layr={layr}
              currentImageIndex={currentImageIndex}
              xlatTable={xlatTable}
              collisionProps={collisionProps}
              mightyMikeTileValuesArrayLength={mightyMikeTileValuesArray.length}
              currentTileAttributes={
                currentPaletteAttributes ?? EMPTY_PALETTE_ATTRIBUTES
              }
              handleUpdateCollisionProperty={handleUpdateCollisionProperty}
              handleUpdateTileAttribute={handleUpdateTileAttribute}
              getNumber={getNumber}
            />
            <div className="my-2 grid grid-cols-2 gap-x-2 text-[11px] text-gray-400">
              {tileInfoRows.slice(3).map((row) => <span key={row}>{row}</span>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full min-h-0 overflow-auto p-3">
          <div className="grid min-h-0 gap-4 md:grid-cols-2">
            <div className="flex min-h-0 flex-col gap-3">
              <div>
                <p className="font-bold text-sm">Brush</p>
                <p className="text-xs text-gray-400">
                  Choose what painting on the map changes.
                </p>
              </div>
              <Select value={canvasEditMode} onValueChange={handleBrushModeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select Tile</SelectItem>
                  <SelectItem value="collision">Rendering Mask</SelectItem>
                  <SelectItem value="altMap">Alt Map Directions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0">
              {canvasEditMode === "select" && (
                <p className="text-xs text-gray-400">
                  Select a brush to see its painting controls.
                </p>
              )}
              {canvasEditMode === "collision" && (
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-sm">Rendering Mask</p>
                  <label className="text-xs text-gray-300">Paint</label>
                  <Select
                    value={collisionBrushValue}
                    onValueChange={handleCollisionBrushValueChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Set Enabled</SelectItem>
                      <SelectItem value="disabled">Set Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canvasEditMode === "altMap" && (
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-sm">Alt Map Directions</p>
                  <MightyMikeAltMapEditorPanel />
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      <MightyMikeTileMenuEditors
        isEditingPaletteTile={isEditingPaletteTile}
        selectedPaletteTile={selectedPaletteTile}
        mapImages={mapImages}
        onClosePaletteEditor={handleClosePaletteEditor}
        onSavePaletteTileEdit={handleSavePaletteTileEdit}
      />
    </>
  );
}
