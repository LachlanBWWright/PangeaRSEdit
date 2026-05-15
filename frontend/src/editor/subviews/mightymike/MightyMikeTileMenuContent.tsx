import {
  MightyMikePanels,
  MightyMikeTileMenuShell,
} from "@/editor/subviews/mightymike/mightyMikeTileMenuLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface MightyMikeTileMenuContentProps {
  currentImageIndex: number | null;
  currentTileCanvas: HTMLCanvasElement | null;
  effectiveSelectedTile: number;
  handleUploadTile: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  handleEditTile: () => void;
  handleDownloadTile: () => void;
  selectedPaletteTile: number;
  handleRotateTile: () => void;
  handleFlipTileHorizontal: () => void;
  handleFlipTileVertical: () => void;
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
  paramsOverlayMode: "flagsAny" | "flagBit" | "p0" | "p1";
  onParamsOverlayModeChange: (
    value: "flagsAny" | "flagBit" | "p0" | "p1",
  ) => void;
  paramsOverlayFlagBit: number;
  onParamsOverlayFlagBitChange: (value: number) => void;
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
  brushPanel: ReactNode;
}

export function MightyMikeTileMenuContent({
  currentImageIndex,
  currentTileCanvas,
  effectiveSelectedTile,
  handleUploadTile,
  handleEditTile,
  handleDownloadTile,
  selectedPaletteTile,
  handleRotateTile,
  handleFlipTileHorizontal,
  handleFlipTileVertical,
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
  paramsOverlayMode,
  onParamsOverlayModeChange,
  paramsOverlayFlagBit,
  onParamsOverlayFlagBitChange,
  onResize,
  handleUpdateCollisionProperty,
  handleUpdateTileAttribute,
  getNumber,
  mapImages,
  isPaletteTileInUse,
  paletteUploadInputRef,
  setIsEditingPaletteTile,
  handleUploadPaletteTile,
  handleAddPaletteTile,
  handleRemovePaletteTile,
  handleReplaceTile,
  onSelectPaletteTile,
  brushPanel,
}: MightyMikeTileMenuContentProps) {
  return (
    <Tabs defaultValue="tiles" className="flex w-full flex-col gap-2 p-2">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="tiles">Tile Tools</TabsTrigger>
        <TabsTrigger value="overlays">Overlays</TabsTrigger>
        <TabsTrigger value="palette">Palette</TabsTrigger>
        <TabsTrigger value="brushes">Brushes</TabsTrigger>
      </TabsList>

      <TabsContent value="tiles" className="mt-0 space-y-2">
        <MightyMikeTileMenuShell>
          <MightyMikePanels.Operations
            currentImageIndex={currentImageIndex}
            currentTileCanvas={currentTileCanvas}
            effectiveSelectedTile={effectiveSelectedTile}
            handleUploadTile={handleUploadTile}
            handleEditTile={handleEditTile}
            handleDownloadTile={handleDownloadTile}
            selectedPaletteTile={selectedPaletteTile}
            handleRotateTile={handleRotateTile}
            handleFlipTileHorizontal={handleFlipTileHorizontal}
            handleFlipTileVertical={handleFlipTileVertical}
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
            paramsOverlayMode={paramsOverlayMode}
            onParamsOverlayModeChange={onParamsOverlayModeChange}
            paramsOverlayFlagBit={paramsOverlayFlagBit}
            onParamsOverlayFlagBitChange={onParamsOverlayFlagBitChange}
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
        </MightyMikeTileMenuShell>
      </TabsContent>

      <TabsContent value="overlays" className="mt-0 space-y-2">
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
            Tile Behavior Painting
          </p>
          <p className="mb-3 text-xs text-gray-300">
            Choose what to paint, then drag on the map. The highlight is linked
            to your paint tool so you can see exactly what will change.
          </p>
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
            paramsOverlayMode={paramsOverlayMode}
            onParamsOverlayModeChange={onParamsOverlayModeChange}
            paramsOverlayFlagBit={paramsOverlayFlagBit}
            onParamsOverlayFlagBitChange={onParamsOverlayFlagBitChange}
            onResize={onResize}
            handleUpdateCollisionProperty={handleUpdateCollisionProperty}
            handleUpdateTileAttribute={handleUpdateTileAttribute}
            getNumber={getNumber}
          />
        </div>
      </TabsContent>

      <TabsContent value="palette" className="mt-0 space-y-2">
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3">
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
        </div>
      </TabsContent>

      <TabsContent value="brushes" className="mt-0 space-y-2">
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3">
          <p className="mb-2 text-xs text-gray-300">
            Capture patterns and stamp large swathes of tiles quickly.
          </p>
          {brushPanel}
        </div>
      </TabsContent>
    </Tabs>
  );
}
