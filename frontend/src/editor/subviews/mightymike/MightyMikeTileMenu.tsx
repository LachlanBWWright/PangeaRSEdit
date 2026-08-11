import { useAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import type { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { toast } from "sonner";
import {
  MightyMikeCanvasEditMode,
  MightyMikeCollisionBrushModeValue,
  MightyMikeFlagBrushBit,
  MightyMikeFlagBrushModeValue,
  MightyMikeOverlayMode,
  type MightyMikeCanvasEditModeValue,
  MightyMikeParamsOverlayFlagBit,
  ParamBrushValue,
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
import { Input } from "@/components/ui/input";
import {
  getFlagLabel,
  getTileInfoRows,
  MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS,
} from "./mightyMikeTileInspectorState";
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

type OverlaySelectValue =
  | "none"
  | "collision"
  | "solidEdges"
  | "flagsAny"
  | "p0"
  | "p1"
  | "p2"
  | "altMap"
  | `flagBit:${number}`;

const EMPTY_PALETTE_ATTRIBUTES: Readonly<Record<string, number>> = {
  flags: 0,
  p0: 0,
  p1: 0,
  p2: 0,
  p3: 0,
  p4: 0,
};

function getOverlayOptionValue(flagBit: number): OverlaySelectValue {
  return `flagBit:${flagBit}`;
}

const overlayDropdownItems: readonly {
  value: OverlaySelectValue;
  label: string;
}[] = [
  { value: "none", label: "No Overlay" },
  { value: "collision", label: "Collision Mask" },
  { value: "solidEdges", label: "Solid Sides" },
  { value: "flagsAny", label: "Any Gameplay Flag" },
  ...MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS.filter(([bit]) => bit >= 4).map(
    ([bit, label]) => ({
      value: getOverlayOptionValue(bit),
      label,
    }),
  ),
  { value: "p0", label: "Extra Setting A" },
  { value: "p1", label: "Extra Setting B" },
  { value: "p2", label: "Extra Setting C" },
  { value: "altMap", label: "Alt Map Directions" },
];

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
  const [overlayMode, setOverlayMode] = useAtom(MightyMikeOverlayMode);
  const [canvasEditMode, setCanvasEditMode] = useAtom(MightyMikeCanvasEditMode);
  const [collisionBrushValue, setCollisionBrushValue] = useAtom(
    MightyMikeCollisionBrushModeValue,
  );
  const [flagBrushBit, setFlagBrushBit] = useAtom(MightyMikeFlagBrushBit);
  const [flagBrushModeValue, setFlagBrushModeValue] = useAtom(
    MightyMikeFlagBrushModeValue,
  );
  const [paramBrushValue, setParamBrushValue] = useAtom(ParamBrushValue);
  const [paramsOverlayFlagBit, setParamsOverlayFlagBit] = useAtom(
    MightyMikeParamsOverlayFlagBit,
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

  const overlayModeLabel = useMemo(() => {
    switch (overlayMode) {
      case "collision":
        return "Collision Mask";
      case "solidEdges":
        return "Solid Sides";
      case "flagsAny":
        return "Any Gameplay Flag";
      case "flagBit":
        return `Gameplay Flag: ${getFlagLabel(paramsOverlayFlagBit)}`;
      case "p0":
        return "Extra Setting A";
      case "p1":
        return "Extra Setting B";
      case "p2":
        return "Extra Setting C";
      case "altMap":
        return "Alt Map Directions";
      default:
        return "No Overlay";
    }
  }, [overlayMode, paramsOverlayFlagBit]);

  const overlaySelectValue = useMemo<OverlaySelectValue>(() => {
    return overlayMode === "flagBit"
      ? getOverlayOptionValue(paramsOverlayFlagBit)
      : overlayMode;
  }, [overlayMode, paramsOverlayFlagBit]);

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

  const handleOverlayModeChange = (value: string) => {
    if (value.startsWith("flagBit:")) {
      const parsed = getNumber(value.split(":")[1], 4);
      setParamsOverlayFlagBit(Math.max(0, Math.min(15, parsed)));
      setOverlayMode("flagBit");
      return;
    }

    if (
      value === "none" ||
      value === "collision" ||
      value === "solidEdges" ||
      value === "flagsAny" ||
      value === "p0" ||
      value === "p1" ||
      value === "p2" ||
      value === "altMap"
    ) {
      setOverlayMode(value);
    }
  };

  const handleCanvasEditModeChange = (value: string) => {
    if (
      value === "select" ||
      value === "collision" ||
      value === "flags" ||
      value === "p0" ||
      value === "p1" ||
      value === "p2" ||
      value === "altMap"
    ) {
      const nextMode: MightyMikeCanvasEditModeValue = value;
      setCanvasEditMode(nextMode);
      if (nextMode === "collision" && overlayMode === "none") {
        setOverlayMode("collision");
      }
      if (nextMode === "flags" && overlayMode === "none") {
        if (flagBrushBit <= 3) {
          setOverlayMode("solidEdges");
        } else {
          setOverlayMode("flagBit");
          setParamsOverlayFlagBit(flagBrushBit);
        }
      }
      if (
        (nextMode === "p0" || nextMode === "p1" || nextMode === "p2") &&
        overlayMode === "none"
      ) {
        setOverlayMode(nextMode);
      }
      if (nextMode === "altMap") {
        setOverlayMode("altMap");
      }
    }
  };

  const handleCollisionBrushValueChange = (value: string) => {
    if (value === "enabled" || value === "disabled") {
      setCollisionBrushValue(value);
    }
  };

  const handleFlagBrushModeChange = (value: string) => {
    if (value === "enabled" || value === "disabled") {
      setFlagBrushModeValue(value);
    }
  };

  const handleFlagBrushBitChange = (value: string) => {
    const parsed = getNumber(value, 0);
    const nextBit = Math.max(0, Math.min(15, parsed));
    setFlagBrushBit(nextBit);
    if (canvasEditMode === "flags") {
      if (nextBit <= 3) {
        setOverlayMode("solidEdges");
      } else {
        setParamsOverlayFlagBit(nextBit);
        setOverlayMode("flagBit");
      }
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
        <div className="grid h-full min-h-0 gap-3 p-3 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-3 overflow-auto pr-1 text-sm">
            <div>
              <p className="font-bold text-sm">Canvas Tools</p>
              <p className="text-xs text-gray-400">
                Edit map-cell rendering masks and alt-map directions. Tile
                definition flags stay with their artwork in Visual Tiles.
              </p>
            </div>

            <div className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-2 items-center text-xs">
              <label className="text-gray-300">Canvas Mode</label>
              <Select
                value={canvasEditMode}
                onValueChange={handleCanvasEditModeChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select Tile</SelectItem>
                  <SelectItem value="collision">Paint Rendering Mask</SelectItem>
                  <SelectItem value="altMap">Paint Alt Map</SelectItem>
                </SelectContent>
              </Select>

              <label className="text-gray-300">Overlay</label>
              <Select
                value={overlaySelectValue}
                onValueChange={handleOverlayModeChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No Overlay" />
                </SelectTrigger>
                <SelectContent>
                  {overlayDropdownItems
                    .filter(
                      (item) =>
                        item.value === "none" ||
                        item.value === "collision" ||
                        item.value === "altMap",
                    )
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1.5 items-center text-xs border-t border-gray-700 pt-2.5">
              <span className="text-gray-300">Preview</span>
              <p className="text-gray-300">{overlayModeLabel}</p>

              {canvasEditMode === "collision" && (
                <>
                  <label className="text-gray-300">Mask</label>
                  <Select
                    value={collisionBrushValue}
                    onValueChange={handleCollisionBrushValueChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Paint Enabled</SelectItem>
                      <SelectItem value="disabled">Paint Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {canvasEditMode === "flags" && (
                <>
                  <label className="text-gray-300">Flag Brush</label>
                  <Select
                    value={String(flagBrushBit)}
                    onValueChange={handleFlagBrushBitChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS.map(([bit, label]) => (
                        <SelectItem key={bit} value={String(bit)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="text-gray-300">Paint</label>
                  <Select
                    value={flagBrushModeValue}
                    onValueChange={handleFlagBrushModeChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Set Enabled</SelectItem>
                      <SelectItem value="disabled">Set Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {(canvasEditMode === "p0" || canvasEditMode === "p1") && (
                <>
                  <label className="text-gray-300">Brush Value</label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={paramBrushValue}
                    onChange={(event) =>
                      setParamBrushValue(getNumber(event.target.value, 0))
                    }
                  />
                </>
              )}
            </div>

            {canvasEditMode === "altMap" && (
              <div className="border-t border-gray-700 pt-2.5">
                <MightyMikeAltMapEditorPanel />
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-auto border-l border-gray-700 pl-3">
            <MightyMikeTileInspectorPanel
              showCellMask
              showTileBehavior={false}
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
              currentTileAttributes={null}
              handleUpdateCollisionProperty={handleUpdateCollisionProperty}
              handleUpdateTileAttribute={handleUpdateTileAttribute}
              getNumber={getNumber}
            />
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
