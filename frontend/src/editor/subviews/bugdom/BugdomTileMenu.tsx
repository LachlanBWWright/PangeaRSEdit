import { useAtom, useAtomValue } from "jotai";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Game, Globals } from "../../../data/globals/globals";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { ImageEditor } from "@/components/ImageEditor";
import { getSupertileCounts } from "../supertiles/supertileResizeGuards";
import { BugdomTileMenuContent } from "./BugdomTileMenuContent";
import {
  appendBugdomTileImageMapping,
  getEditingTileIndex,
  isValidTileImageSelection,
  normalizeSelectedSupertile,
} from "./bugdomTileMenuState";
import {
  TILE_IMAGE_SIZE,
  computeIsTileImageInUse,
  createBlankTileCanvas,
  findTileIndexForImage,
  flipTileXAtIndex,
  flipTileYAtIndex,
  getFlatIndexForTile,
  getTilesInSelectedSupertile,
  removeTileImageAndRemap,
  replaceTileAtIndex,
  rotateTileAtIndex,
  saveEditedTileImageToIndex,
  uploadTileImageToIndex,
} from "./BugdomTileMenuUtils";
import { TileBrushPanel } from "@/editor/subviews/tileBrushes/TileBrushPanel";
import { MenuEmptyState } from "../MenuEmptyState";
import { ShowRoofInTopology } from "@/data/tiles/tileAtoms";

interface BugdomTileMenuProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
}

function BugdomTileMenuInner({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
}: BugdomTileMenuProps) {
  const hedr = headerData.Hedr[1000].obj;
  const globals = useAtomValue(Globals);
  const showRoof = useAtomValue(ShowRoofInTopology);
  const supertileCounts = getSupertileCounts(
    hedr.mapWidth,
    hedr.mapHeight,
    globals.TILES_PER_SUPERTILE,
  );
  const totalSupertiles = supertileCounts.width * supertileCounts.height;

  const [selectedTileInSupertile, setSelectedTileInSupertile] = useState(0);
  const [manualTileImageIndex, setManualTileImageIndex] = useState<
    number | null
  >(null);
  const [storedSelectedTile, setSelectedTile] = useAtom(SelectedTile);
  const selectedTile = normalizeSelectedSupertile(
    storedSelectedTile,
    totalSupertiles,
  );
  const tileImageUploadInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTileImage, setIsEditingTileImage] = useState(false);
  const [editingTileImageIndex, setEditingTileImageIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (selectedTile !== storedSelectedTile) {
      setSelectedTile(selectedTile);
    }
  }, [selectedTile, setSelectedTile, storedSelectedTile]);

  const activeLayer: 1000 | 1001 =
    globals.GAME_TYPE === Game.BUGDOM &&
    showRoof &&
    terrainData.Layr?.[1001]
      ? 1001
      : 1000;
  const layerData = terrainData.Layr?.[activeLayer]?.obj;
  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  const numTileImages = mapImages.length;

  const updateTileImages = (nextMapImages: HTMLCanvasElement[]) => {
    setMapImages(nextMapImages);
  };

  const tilesInSelectedSupertile = useMemo(
    () =>
      getTilesInSelectedSupertile(
        layerData,
        selectedTile,
        hedr.mapWidth,
        hedr.mapHeight,
        globals.TILES_PER_SUPERTILE,
        numTileImages,
        xlatTable,
      ),
    [
      layerData,
      selectedTile,
      hedr.mapWidth,
      hedr.mapHeight,
      globals.TILES_PER_SUPERTILE,
      numTileImages,
      xlatTable,
    ],
  );

  const currentSelectedTileData =
    tilesInSelectedSupertile[selectedTileInSupertile];
  const selectedTileImageIndex =
    manualTileImageIndex ?? currentSelectedTileData?.info.imageIndex ?? 0;
  const currentFlatIndex = currentSelectedTileData
    ? getFlatIndexForTile(
        selectedTile,
        currentSelectedTileData.row,
        currentSelectedTileData.col,
        hedr.mapWidth,
        globals.TILES_PER_SUPERTILE,
      )
    : -1;

  const handleSelectTileInSupertile = (index: number) => {
    const tile = tilesInSelectedSupertile[index];
    if (!tile) return;
    setSelectedTileInSupertile(index);
    setManualTileImageIndex(null);
  };

  const handleRotateTile = () => {
    if (!layerData || currentFlatIndex < 0) return;
    rotateTileAtIndex(setTerrainData, currentFlatIndex, activeLayer);
    toast.success("Tile rotated");
  };

  const handleFlipX = () => {
    if (!layerData || currentFlatIndex < 0) return;
    flipTileXAtIndex(setTerrainData, currentFlatIndex, activeLayer);
    toast.success("Tile flipped horizontally");
  };

  const handleFlipY = () => {
    if (!layerData || currentFlatIndex < 0) return;
    flipTileYAtIndex(setTerrainData, currentFlatIndex, activeLayer);
    toast.success("Tile flipped vertically");
  };

  const handleReplaceTile = () => {
    if (!layerData || currentFlatIndex < 0) return;

    const tileIndexForImage = findTileIndexForImage(
      selectedTileImageIndex,
      xlatTable,
    );
    if (tileIndexForImage === null) {
      toast.error(
        `Cannot find tile index for image #${selectedTileImageIndex}`,
      );
      return;
    }

    replaceTileAtIndex(
      setTerrainData,
      currentFlatIndex,
      tileIndexForImage,
      activeLayer,
    );
    toast.success(
      `Replaced with image #${selectedTileImageIndex} (tile index ${tileIndexForImage})`,
    );
  };

  const handleUploadTileImage = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const saved = await uploadTileImageToIndex(
      file,
      selectedTileImageIndex,
      mapImages,
      updateTileImages,
    );
    event.target.value = "";
    if (saved) {
      toast.success(`Updated tile image #${selectedTileImageIndex}`);
    }
  };

  const handleSaveTileImageEdit = async (editedImageData: ImageData) => {
    const targetTileIndex = getEditingTileIndex(
      editingTileImageIndex,
      selectedTileImageIndex,
    );
    const saved = saveEditedTileImageToIndex(
      editedImageData,
      targetTileIndex,
      mapImages,
      updateTileImages,
    );
    if (!saved) return;

    setIsEditingTileImage(false);
    setEditingTileImageIndex(null);
    toast.success(`Edited tile #${targetTileIndex}`);
  };

  const isTileImageInUse = useMemo(
    () =>
      computeIsTileImageInUse(
        terrainData.Layr?.[1000]?.obj,
        selectedTileImageIndex,
        xlatTable,
      ) ||
      computeIsTileImageInUse(
        terrainData.Layr?.[1001]?.obj,
        selectedTileImageIndex,
        xlatTable,
      ),
    [terrainData.Layr, selectedTileImageIndex, xlatTable],
  );

  const handleAddTileImage = () => {
    const newImageIndex = mapImages.length;
    updateTileImages([...mapImages, createBlankTileCanvas()]);
    setTerrainData((data) => {
      appendBugdomTileImageMapping(data, newImageIndex);
    });
    setManualTileImageIndex(newImageIndex);
    toast.success(`Added tile image #${newImageIndex}`);
  };

  const handleRemoveTileImage = () => {
    if (!isValidTileImageSelection(selectedTileImageIndex, mapImages.length)) {
      toast.error("Invalid tile image selected");
      return;
    }
    if (isTileImageInUse) {
      toast.error("Cannot remove a tile image that is still in use");
      return;
    }

    removeTileImageAndRemap(
      selectedTileImageIndex,
      mapImages,
      updateTileImages,
      setTerrainData,
    );

    setManualTileImageIndex(Math.max(0, selectedTileImageIndex - 1));
    toast.success("Tile image removed");
  };

  if (!layerData) {
    return (
      <MenuEmptyState
        title="No Tile Layer"
        description="This level doesn't contain tile layer data to edit."
        fillHeight
      />
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
        <BugdomTileMenuContent
          game={globals.GAME_TYPE === Game.NANOSAUR ? "nanosaur1" : "bugdom1"}
          stampLibrary={(
            <TileBrushPanel
              game={globals.GAME_TYPE === Game.NANOSAUR ? "nanosaur1" : "bugdom1"}
              mapImages={mapImages}
              xlatTable={xlatTable}
            />
          )}
          tilesPerSupertile={globals.TILES_PER_SUPERTILE}
          tileImageSize={TILE_IMAGE_SIZE}
          tilesInSelectedSupertile={tilesInSelectedSupertile}
          currentSelectedTileData={currentSelectedTileData}
          mapImages={mapImages}
          selectedTileImageIndex={selectedTileImageIndex}
          selectedTile={selectedTile}
          currentFlatIndex={currentFlatIndex}
          activeLayer={activeLayer}
          isTileImageInUse={isTileImageInUse}
          onSelectTileInSupertile={handleSelectTileInSupertile}
          setSelectedTileImageIndex={setManualTileImageIndex}
          tileImageUploadInputRef={tileImageUploadInputRef}
          onEditPaletteTileImage={() => {
            setEditingTileImageIndex(selectedTileImageIndex);
            setIsEditingTileImage(true);
          }}
          onRotate={handleRotateTile}
          onFlipX={handleFlipX}
          onFlipY={handleFlipY}
          onReplaceTile={handleReplaceTile}
          onUploadPaletteTileImage={handleUploadTileImage}
          onAddTileImage={handleAddTileImage}
          onRemoveTileImage={handleRemoveTileImage}
        />
      </div>
      <ImageEditor
        isOpen={isEditingTileImage}
        onClose={() => {
          setIsEditingTileImage(false);
          setEditingTileImageIndex(null);
        }}
        imageUrl={
          mapImages[
            getEditingTileIndex(editingTileImageIndex, selectedTileImageIndex)
          ]?.toDataURL("image/png") ?? ""
        }
        imageName={`Tile_${getEditingTileIndex(editingTileImageIndex, selectedTileImageIndex)}`}
        onSave={handleSaveTileImageEdit}
      />
    </>
  );
}

function bugdomTileMenuPropsEqual(
  previous: BugdomTileMenuProps,
  next: BugdomTileMenuProps,
): boolean {
  return (
    previous.headerData === next.headerData &&
    previous.setHeaderData === next.setHeaderData &&
    previous.setTerrainData === next.setTerrainData &&
    previous.mapImages === next.mapImages &&
    previous.setMapImages === next.setMapImages &&
    previous.terrainData.Layr === next.terrainData.Layr &&
    previous.terrainData.Xlat === next.terrainData.Xlat
  );
}

export const BugdomTileMenu = memo(
  BugdomTileMenuInner,
  bugdomTileMenuPropsEqual,
);
