import { useAtom, useAtomValue } from "jotai";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Globals } from "../../../data/globals/globals";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { ImageEditor } from "@/components/ImageEditor";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
  getSupertileCounts,
} from "../supertiles/supertileResizeGuards";
import { BugdomTileMenuContent } from "./BugdomTileMenuContent";
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

interface BugdomTileMenuProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  onResizeSupertiles: (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => void;
}

export function BugdomTileMenu({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
  onResizeSupertiles,
}: BugdomTileMenuProps) {
  const hedr = headerData.Hedr[1000].obj;
  const globals = useAtomValue(Globals);
  const supertileCounts = getSupertileCounts(
    hedr.mapWidth,
    hedr.mapHeight,
    globals.TILES_PER_SUPERTILE,
  );
  const totalSupertiles = supertileCounts.width * supertileCounts.height;

  const [selectedTileInSupertile, setSelectedTileInSupertile] = useState(0);
  const [selectedTileImageIndex, setSelectedTileImageIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const tileImageUploadInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTileImage, setIsEditingTileImage] = useState(false);
  const [editingTileImageIndex, setEditingTileImageIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (totalSupertiles <= 0) return;
    if (selectedTile < 0 || selectedTile >= totalSupertiles) {
      setSelectedTile(0);
    }
  }, [selectedTile, setSelectedTile, totalSupertiles]);

  const handleRemoveSupertile = (
    direction: "top" | "bottom" | "left" | "right",
  ) => {
    const removingRow = direction === "top" || direction === "bottom";
    const canRemove = removingRow
      ? canRemoveSupertileRow(supertileCounts.height)
      : canRemoveSupertileColumn(supertileCounts.width);
    if (!canRemove) {
      toast.error("Cannot remove supertile", {
        description:
          "At least one supertile row and one supertile column must remain.",
      });
      return;
    }
    onResizeSupertiles(direction, -1);
  };

  const layerData = terrainData.Layr?.[1000]?.obj;
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
  const currentFlatIndex = currentSelectedTileData
    ? getFlatIndexForTile(
        selectedTile,
        currentSelectedTileData.row,
        currentSelectedTileData.col,
        hedr.mapWidth,
        globals.TILES_PER_SUPERTILE,
      )
    : -1;

  const handleRotateTile = () => {
    if (!layerData || currentFlatIndex < 0) return;
    rotateTileAtIndex(setTerrainData, currentFlatIndex);
    toast.success("Tile rotated");
  };

  const handleFlipX = () => {
    if (!layerData || currentFlatIndex < 0) return;
    flipTileXAtIndex(setTerrainData, currentFlatIndex);
    toast.success("Tile flipped horizontally");
  };

  const handleFlipY = () => {
    if (!layerData || currentFlatIndex < 0) return;
    flipTileYAtIndex(setTerrainData, currentFlatIndex);
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

    replaceTileAtIndex(setTerrainData, currentFlatIndex, tileIndexForImage);
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
    const targetTileIndex = editingTileImageIndex ?? selectedTileImageIndex;
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
    () => computeIsTileImageInUse(layerData, selectedTileImageIndex, xlatTable),
    [layerData, selectedTileImageIndex, xlatTable],
  );

  const handleAddTileImage = () => {
    const newImageIndex = mapImages.length;
    updateTileImages([...mapImages, createBlankTileCanvas()]);
    setTerrainData((data) => {
      if (data.Xlat?.[1000]?.obj) {
        data.Xlat[1000].obj.push({ idx: newImageIndex });
      }
    });
    setSelectedTileImageIndex(newImageIndex);
    toast.success(`Added tile image #${newImageIndex}`);
  };

  const handleRemoveTileImage = () => {
    if (
      selectedTileImageIndex < 0 ||
      selectedTileImageIndex >= mapImages.length
    ) {
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

    setSelectedTileImageIndex((current) => Math.max(0, current - 1));
    toast.success("Tile image removed");
  };

  if (!layerData) {
    return (
      <div className="p-4 text-white">
        <p>No tile layer data available</p>
      </div>
    );
  }

  return (
    <>
      <BugdomTileMenuContent
        tilesPerSupertile={globals.TILES_PER_SUPERTILE}
        tileImageSize={TILE_IMAGE_SIZE}
        tilesInSelectedSupertile={tilesInSelectedSupertile}
        currentSelectedTileData={currentSelectedTileData}
        mapImages={mapImages}
        selectedTileImageIndex={selectedTileImageIndex}
        selectedTile={selectedTile}
        supertileCounts={supertileCounts}
        uniqueSupertiles={hedr.numUniqueSupertiles}
        isTileImageInUse={isTileImageInUse}
        setSelectedTileInSupertile={setSelectedTileInSupertile}
        setSelectedTileImageIndex={setSelectedTileImageIndex}
        setIsEditingTileImage={setIsEditingTileImage}
        setEditingTileImageIndex={setEditingTileImageIndex}
        tileImageUploadInputRef={tileImageUploadInputRef}
        onRotate={handleRotateTile}
        onFlipX={handleFlipX}
        onFlipY={handleFlipY}
        onReplaceTile={handleReplaceTile}
        onUploadTileImage={handleUploadTileImage}
        onAddTileImage={handleAddTileImage}
        onRemoveTileImage={handleRemoveTileImage}
        onResizeSupertiles={onResizeSupertiles}
        onRemoveSupertile={handleRemoveSupertile}
      />
      <ImageEditor
        isOpen={isEditingTileImage}
        onClose={() => {
          setIsEditingTileImage(false);
          setEditingTileImageIndex(null);
        }}
        imageUrl={
          mapImages[editingTileImageIndex ?? selectedTileImageIndex]?.toDataURL(
            "image/png",
          ) ?? ""
        }
        imageName={`Tile_${editingTileImageIndex ?? selectedTileImageIndex}`}
        onSave={handleSaveTileImageEdit}
      />
    </>
  );
}
