import {
  MightyMikePanels,
  MightyMikeTileMenuShell,
} from "@/editor/subviews/mightymike/mightyMikeTileMenuLayout";

interface MightyMikeTileMenuContentProps {
  currentImageIndex: number | null;
  currentTileCanvas: HTMLCanvasElement | null;
  effectiveSelectedTile: number;
  handleUploadTile: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  handleEditTile: () => void;
  handleDownloadTile: () => void;
  mapWidth: number;
  mapHeight: number;
  totalTiles: number;
  mapImagesLength: number;
  layr: number[];
  xlatTable: unknown[] | undefined;
  collisionProps: {
    hasCollisionMask: boolean;
    usePixelAccurateCollision: boolean;
  } | null;
  mightyMikeTileValuesArrayLength: number;
  currentTileAttributes: Record<string, unknown> | null;
  showCollisionOverlay: boolean;
  onToggleCollisionOverlay: () => void;
  collisionBrushMode: boolean;
  onToggleCollisionBrushMode: () => void;
  paramBrushField: "flags" | "p0" | "p1" | null;
  onParamBrushFieldChange: (value: string) => void;
  paramBrushValue: number;
  setParamBrushValue: (value: number) => void;
  showParamsOverlay: boolean;
  onToggleParamsOverlay: () => void;
  onResize: (
    direction: "top" | "bottom" | "left" | "right",
    tileCount: number,
  ) => void;
  handleUpdateCollisionProperty: (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean,
  ) => void;
  handleUpdateTileAttribute: (
    property: "flags" | "p0" | "p1" | "p2" | "p3" | "p4",
    value: number,
  ) => void;
  getNumber: (value: unknown, defaultValue?: number) => number;
  mapImages: HTMLCanvasElement[];
  selectedPaletteTile: number;
  isPaletteTileInUse: boolean;
  paletteUploadInputRef: React.RefObject<HTMLInputElement | null>;
  setIsEditingPaletteTile: (next: boolean) => void;
  handleUploadPaletteTile: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  handleAddPaletteTile: () => void;
  handleRemovePaletteTile: () => void;
  handleReplaceTile: () => void;
  onSelectPaletteTile: (palette: number) => void;
}

export function MightyMikeTileMenuContent({
  currentImageIndex,
  currentTileCanvas,
  effectiveSelectedTile,
  handleUploadTile,
  handleEditTile,
  handleDownloadTile,
  mapWidth,
  mapHeight,
  totalTiles,
  mapImagesLength,
  layr,
  xlatTable,
  collisionProps,
  mightyMikeTileValuesArrayLength,
  currentTileAttributes,
  showCollisionOverlay,
  onToggleCollisionOverlay,
  collisionBrushMode,
  onToggleCollisionBrushMode,
  paramBrushField,
  onParamBrushFieldChange,
  paramBrushValue,
  setParamBrushValue,
  showParamsOverlay,
  onToggleParamsOverlay,
  onResize,
  handleUpdateCollisionProperty,
  handleUpdateTileAttribute,
  getNumber,
  mapImages,
  selectedPaletteTile,
  isPaletteTileInUse,
  paletteUploadInputRef,
  setIsEditingPaletteTile,
  handleUploadPaletteTile,
  handleAddPaletteTile,
  handleRemovePaletteTile,
  handleReplaceTile,
  onSelectPaletteTile,
}: MightyMikeTileMenuContentProps) {
  return (
    <MightyMikeTileMenuShell>
      <MightyMikePanels.Operations
        currentImageIndex={currentImageIndex}
        currentTileCanvas={currentTileCanvas}
        effectiveSelectedTile={effectiveSelectedTile}
        handleUploadTile={handleUploadTile}
        handleEditTile={handleEditTile}
        handleDownloadTile={handleDownloadTile}
      />

      <MightyMikePanels.Inspector
        mapWidth={mapWidth}
        mapHeight={mapHeight}
        totalTiles={totalTiles}
        mapImagesLength={mapImagesLength}
        effectiveSelectedTile={effectiveSelectedTile}
        layr={layr}
        currentImageIndex={currentImageIndex}
        xlatTable={xlatTable}
        collisionProps={collisionProps}
        mightyMikeTileValuesArrayLength={mightyMikeTileValuesArrayLength}
        currentTileAttributes={currentTileAttributes}
        showCollisionOverlay={showCollisionOverlay}
        onToggleCollisionOverlay={onToggleCollisionOverlay}
        collisionBrushMode={collisionBrushMode}
        onToggleCollisionBrushMode={onToggleCollisionBrushMode}
        paramBrushField={paramBrushField}
        onParamBrushFieldChange={onParamBrushFieldChange}
        paramBrushValue={paramBrushValue}
        setParamBrushValue={setParamBrushValue}
        showParamsOverlay={showParamsOverlay}
        onToggleParamsOverlay={onToggleParamsOverlay}
        onResize={onResize}
        handleUpdateCollisionProperty={handleUpdateCollisionProperty}
        handleUpdateTileAttribute={handleUpdateTileAttribute}
        getNumber={getNumber}
      />

      <MightyMikePanels.Palette
        mapImages={mapImages}
        selectedPaletteTile={selectedPaletteTile}
        isPaletteTileInUse={isPaletteTileInUse}
        paletteUploadInputRef={paletteUploadInputRef}
        setIsEditingPaletteTile={setIsEditingPaletteTile}
        handleUploadPaletteTile={handleUploadPaletteTile}
        handleAddPaletteTile={handleAddPaletteTile}
        handleRemovePaletteTile={handleRemovePaletteTile}
        handleReplaceTile={handleReplaceTile}
        onSelectPaletteTile={onSelectPaletteTile}
      />

      <MightyMikePanels.Resize onResize={onResize} />
    </MightyMikeTileMenuShell>
  );
}
