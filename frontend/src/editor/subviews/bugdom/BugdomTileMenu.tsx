/**
 * BugdomTileMenu.tsx
 *
 * Tile/Supertile menu for Bugdom 1 which uses individual tiles
 * instead of pre-composed supertiles like other games.
 *
 * Features:
 * - Display individual tile images
 * - Show tile transformations (flip/rotate)
 * - Edit tile assignments in the layer data
 */

import { useAtom, useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useRef } from "react";
import { Edit, FlipHorizontal, FlipVertical, RotateCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { ImageEditor } from "@/components/ImageEditor";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
  getSupertileCounts,
} from "../supertiles/supertileResizeGuards";
import { TileCanvas } from "../shared/TileCanvas";
import {
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_ROTATE_MASK,
  TILE_ROT1,
  TILE_ROT2,
  TILE_ROT3,
  translateTileIndex,
} from "./BugdomTileRenderer.utils";

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

  // Selected individual tile within the supertile (0-24 for 5x5)
  const [selectedTileInSupertile, setSelectedTileInSupertile] =
    useState<number>(0);

  // Selected tile image for replacement and editing
  const [selectedTileImageIndex, setSelectedTileImageIndex] = useState<number>(0);
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const tileImageUploadInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTileImage, setIsEditingTileImage] = useState(false);
  const [editingTileImageIndex, setEditingTileImageIndex] = useState<number | null>(null);

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

  // Get the Layr and Xlat data
  const layerData = terrainData.Layr?.[1000]?.obj;
  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  const numTileImages = mapImages.length;

  // Bugdom 1/Nanosaur 1 store tile art as individual 32x32 images.
  // Keep replacement and edits constrained to the selected tile image list.
  const TILE_IMAGE_SIZE = 32;

  const updateTileImages = (nextMapImages: HTMLCanvasElement[]) => {
    setMapImages(nextMapImages);
  };

  // NOTE: tile info helper is defined inside useMemo to avoid changing the memo's dependencies

  // Calculate which tiles are in the selected supertile
  const tilesInSelectedSupertile = useMemo(() => {
    if (!layerData) return [];

    // Local helper to avoid creating a wide dependency for useMemo
    const getTileInfo = (tileValue: number) => {
      const tileIndex = tileValue & TILENUM_MASK;
      const flipX = (tileValue & TILE_FLIPX_MASK) !== 0;
      const flipY = (tileValue & TILE_FLIPY_MASK) !== 0;
      const rotation = tileValue & TILE_ROTATE_MASK;

      let rotationDegrees = 0;
      switch (rotation) {
        case TILE_ROT1:
          rotationDegrees = 90;
          break;
        case TILE_ROT2:
          rotationDegrees = 180;
          break;
        case TILE_ROT3:
          rotationDegrees = 270;
          break;
      }

      const translatedValue = translateTileIndex(
        tileValue,
        xlatTable,
        numTileImages,
      );
      const imageIndex = translatedValue & TILENUM_MASK;

      return { tileIndex, flipX, flipY, rotationDegrees, imageIndex };
    };

    const tilesPerSupertile = globals.TILES_PER_SUPERTILE;
    const supertilesWide = Math.ceil(hedr.mapWidth / tilesPerSupertile);

    const stRow = Math.floor(selectedTile / supertilesWide);
    const stCol = selectedTile % supertilesWide;

    const startRow = stRow * tilesPerSupertile;
    const startCol = stCol * tilesPerSupertile;

    const tiles: {
      row: number;
      col: number;
      value: number;
      info: ReturnType<typeof getTileInfo>;
    }[] = [];

    for (let tileRow = 0; tileRow < tilesPerSupertile; tileRow++) {
      for (let tileCol = 0; tileCol < tilesPerSupertile; tileCol++) {
        const mapRow = startRow + tileRow;
        const mapCol = startCol + tileCol;

        if (mapRow >= hedr.mapHeight || mapCol >= hedr.mapWidth) continue;

        const flatIndex = mapRow * hedr.mapWidth + mapCol;
        if (flatIndex >= layerData.length) continue;

        const tileValue = layerData[flatIndex];
        if (tileValue === undefined) continue;
        tiles.push({
          row: tileRow,
          col: tileCol,
          value: tileValue,
          info: getTileInfo(tileValue),
        });
      }
    }

    return tiles;
  }, [
    layerData,
    selectedTile,
    hedr.mapWidth,
    hedr.mapHeight,
    globals.TILES_PER_SUPERTILE,
    numTileImages,
    xlatTable,
  ]);

  // Handle rotating a tile (cycles through 0, 90, 180, 270)
  const handleRotateTile = (flatIndex: number) => {
    if (!layerData) return;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj) return;

      const currentValue = data.Layr[1000].obj[flatIndex];
      if (currentValue === undefined) return;
      const currentRotation = currentValue & TILE_ROTATE_MASK;

      // Cycle through rotations: 0 -> ROT1 -> ROT2 -> ROT3 -> 0
      let newRotation = 0;
      switch (currentRotation) {
        case 0:
          newRotation = TILE_ROT1;
          break;
        case TILE_ROT1:
          newRotation = TILE_ROT2;
          break;
        case TILE_ROT2:
          newRotation = TILE_ROT3;
          break;
        case TILE_ROT3:
          newRotation = 0;
          break;
      }

      data.Layr[1000].obj[flatIndex] =
        (currentValue & ~TILE_ROTATE_MASK) | newRotation;
    });

    toast.success("Tile rotated");
  };

  // Handle flipping a tile horizontally
  const handleFlipX = (flatIndex: number) => {
    if (!layerData) return;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj) return;

      const currentValue = data.Layr[1000].obj[flatIndex];
      if (currentValue === undefined) return;
      data.Layr[1000].obj[flatIndex] = currentValue ^ TILE_FLIPX_MASK;
    });

    toast.success("Tile flipped horizontally");
  };

  // Handle flipping a tile vertically
  const handleFlipY = (flatIndex: number) => {
    if (!layerData) return;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj) return;

      const currentValue = data.Layr[1000].obj[flatIndex];
      if (currentValue === undefined) return;
      data.Layr[1000].obj[flatIndex] = currentValue ^ TILE_FLIPY_MASK;
    });

    toast.success("Tile flipped vertically");
  };

  // Get the flat index for a tile position in the current supertile
  const getFlatIndexForTile = (tileRow: number, tileCol: number): number => {
    const tilesPerSupertile = globals.TILES_PER_SUPERTILE;
    const supertilesWide = Math.ceil(hedr.mapWidth / tilesPerSupertile);

    const stRow = Math.floor(selectedTile / supertilesWide);
    const stCol = selectedTile % supertilesWide;

    const mapRow = stRow * tilesPerSupertile + tileRow;
    const mapCol = stCol * tilesPerSupertile + tileCol;

    return mapRow * hedr.mapWidth + mapCol;
  };

  // Get the currently selected tile data
  const currentSelectedTileData = tilesInSelectedSupertile[selectedTileInSupertile];
  const currentFlatIndex = currentSelectedTileData
    ? getFlatIndexForTile(
        currentSelectedTileData.row,
        currentSelectedTileData.col,
      )
    : -1;

  // Find tile index that maps to a given image index (reverse Xlat lookup)
  const findTileIndexForImage = (imageIndex: number): number | null => {
    if (!xlatTable) {
      // No translation table - tile index equals image index
      return imageIndex;
    }

    // Search through Xlat to find a tile index that maps to this image
    for (let tileIdx = 0; tileIdx < xlatTable.length; tileIdx++) {
      const entry = xlatTable[tileIdx];
      if (entry && entry.idx === imageIndex) {
        return tileIdx;
      }
    }

    // No mapping found - the image index might be usable directly
    // if it's within bounds of the Xlat table
    if (imageIndex < xlatTable.length) {
      return imageIndex;
    }

    return null;
  };

  // Handle replacing the selected tile with one from the image list
  const handleReplaceTile = () => {
    if (!layerData || currentFlatIndex < 0) return;

    // Find the tile index that maps to the selected image
    const tileIndexForImage = findTileIndexForImage(selectedTileImageIndex);

    if (tileIndexForImage === null) {
      toast.error(`Cannot find tile index for image #${selectedTileImageIndex}`);
      return;
    }

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj) return;

      const currentValue = data.Layr[1000].obj[currentFlatIndex];
      if (currentValue === undefined) return;
      // Keep the flip/rotate bits, replace the tile index
      const newValue =
        (currentValue & ~TILENUM_MASK) | (tileIndexForImage & TILENUM_MASK);
      data.Layr[1000].obj[currentFlatIndex] = newValue;
    });

    toast.success(
      `Replaced with image #${selectedTileImageIndex} (tile index ${tileIndexForImage})`,
    );
  };

  const handleUploadTileImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!mapImages[selectedTileImageIndex]) {
      toast.error("Selected tile image is missing");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = TILE_IMAGE_SIZE;
    canvas.height = TILE_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to create canvas context");
      return;
    }
    const sourceBitmap = await createImageBitmap(file);
    if (
      sourceBitmap.width !== TILE_IMAGE_SIZE ||
      sourceBitmap.height !== TILE_IMAGE_SIZE
    ) {
      event.target.value = "";
      toast.error(`Tile images must be ${TILE_IMAGE_SIZE}×${TILE_IMAGE_SIZE}`);
      return;
    }
    context.fillStyle = "black";
    context.fillRect(0, 0, TILE_IMAGE_SIZE, TILE_IMAGE_SIZE);
    const imageBitmap = await createImageBitmap(file, {
      resizeWidth: TILE_IMAGE_SIZE,
      resizeHeight: TILE_IMAGE_SIZE,
      resizeQuality: "high",
    });
    context.drawImage(imageBitmap, 0, 0);

    const newMapImages = [...mapImages];
    newMapImages[selectedTileImageIndex] = canvas;
    updateTileImages(newMapImages);
    event.target.value = "";
    toast.success(`Updated tile image #${selectedTileImageIndex}`);
  };

  const handleSaveTileImageEdit = async (editedImageData: ImageData) => {
    const targetTileIndex = editingTileImageIndex ?? selectedTileImageIndex;
    if (!mapImages[targetTileIndex]) {
      toast.error("Selected tile has no image");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = editedImageData.width;
    canvas.height = editedImageData.height;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to create canvas context");
      return;
    }
    context.putImageData(editedImageData, 0, 0);
    const newMapImages = [...mapImages];
    newMapImages[targetTileIndex] = canvas;
    updateTileImages(newMapImages);
    setIsEditingTileImage(false);
    setEditingTileImageIndex(null);
    toast.success(`Edited tile #${targetTileIndex}`);
  };

  const createBlankTileCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_IMAGE_SIZE;
    canvas.height = TILE_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, TILE_IMAGE_SIZE, TILE_IMAGE_SIZE);
    }
    return canvas;
  };

  const isTileImageInUse = useMemo(() => {
    if (!layerData) {
      return false;
    }

    const matchingLogicalIndices = new Set<number>();
    if (xlatTable) {
      xlatTable.forEach((entry, logicalIndex) => {
        if (entry?.idx === selectedTileImageIndex) {
          matchingLogicalIndices.add(logicalIndex);
        }
      });
    } else {
      matchingLogicalIndices.add(selectedTileImageIndex);
    }

    if (matchingLogicalIndices.size === 0) {
      return false;
    }

    return layerData.some((tileValue) =>
      matchingLogicalIndices.has(tileValue & TILENUM_MASK),
    );
  }, [layerData, selectedTileImageIndex, xlatTable]);

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
    if (selectedTileImageIndex < 0 || selectedTileImageIndex >= mapImages.length) {
      toast.error("Invalid tile image selected");
      return;
    }
    if (isTileImageInUse) {
      toast.error("Cannot remove a tile image that is still in use");
      return;
    }

    const nextMapImages = mapImages.filter((_, index) => index !== selectedTileImageIndex);
    updateTileImages(nextMapImages);
    setTerrainData((data) => {
      const xlat = data.Xlat?.[1000]?.obj;
      if (xlat) {
        const keptEntries = xlat
          .map((entry, logicalIndex) => ({ entry, logicalIndex }))
          .filter(({ entry }) => entry.idx !== selectedTileImageIndex);
        const logicalIndexMap = new Map<number, number>();
        keptEntries.forEach(({ logicalIndex }, nextLogicalIndex) => {
          logicalIndexMap.set(logicalIndex, nextLogicalIndex);
        });

        const xlatEntry = data.Xlat?.[1000];
        if (xlatEntry) {
          xlatEntry.obj = keptEntries.map(({ entry }) => ({
            idx:
              entry.idx > selectedTileImageIndex ? entry.idx - 1 : entry.idx,
          }));
        }

        if (data.Layr?.[1000]?.obj) {
          data.Layr[1000].obj = data.Layr[1000].obj.map((tileValue) => {
            const logicalIndex = tileValue & TILENUM_MASK;
            const remappedLogicalIndex = logicalIndexMap.get(logicalIndex);
            if (remappedLogicalIndex === undefined) {
              return tileValue;
            }
            return (tileValue & ~TILENUM_MASK) | remappedLogicalIndex;
          });
        }
      }

    });
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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-2">
      <div className="grid h-full min-h-0 grid-cols-3 gap-4">
        {/* Left column: selected tile grid and edit actions */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <div
                className="grid gap-1 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${globals.TILES_PER_SUPERTILE}, 1fr)`,
                }}
              >
                {tilesInSelectedSupertile.map((tile, idx) => (
                  <div
                    key={idx}
                    className={`relative cursor-pointer rounded transition-all ${
                      selectedTileInSupertile === idx
                        ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-900"
                        : "border border-gray-700 hover:border-gray-500"
                    }`}
                    title={`Tile ${tile.info.tileIndex}, Image ${tile.info.imageIndex}, Rot: ${tile.info.rotationDegrees}°, FlipX: ${tile.info.flipX}, FlipY: ${tile.info.flipY}`}
                    onClick={() => setSelectedTileInSupertile(idx)}
                  >
                    <Stage width={32} height={32}>
                      <Layer>
                        {mapImages[tile.info.imageIndex] && (
                          <Image
                            image={mapImages[tile.info.imageIndex]}
                            width={32}
                            height={32}
                            x={16}
                            y={16}
                            offsetX={16}
                            offsetY={16}
                            rotation={tile.info.rotationDegrees}
                            scaleX={tile.info.flipX ? -1 : 1}
                            scaleY={tile.info.flipY ? -1 : 1}
                          />
                        )}
                      </Layer>
                    </Stage>
                  </div>
                ))}
              </div>

              {currentSelectedTileData ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRotateTile(currentFlatIndex)}
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4 mr-1" />
                      Rotate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFlipX(currentFlatIndex)}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4 mr-1" />
                      Flip X
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFlipY(currentFlatIndex)}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4 mr-1" />
                      Flip Y
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleReplaceTile}
                      title="Replace with selected tile image"
                    >
                      Replace with Tile Image #{selectedTileImageIndex}
                    </Button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400 text-center">
                    <p>
                      Position: ({currentSelectedTileData.row},{" "}
                      {currentSelectedTileData.col})
                    </p>
                    <p>
                      Tile Index: {currentSelectedTileData.info.tileIndex} → Image:{" "}
                      {currentSelectedTileData.info.imageIndex}
                    </p>
                    <p>
                      Rotation: {currentSelectedTileData.info.rotationDegrees}° |
                      Flip: {currentSelectedTileData.info.flipX ? "X" : ""}
                      {currentSelectedTileData.info.flipY ? "Y" : ""}
                      {!currentSelectedTileData.info.flipX &&
                      !currentSelectedTileData.info.flipY
                        ? "None"
                        : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded border border-gray-600 p-3">
                  <p className="text-gray-400 text-center">No tile selected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle column: tile image palette */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-white text-center">Tile Images</h3>
              <p className="text-xs text-gray-400 text-center">
                {mapImages.length} tiles • Selected: #{selectedTileImageIndex}
              </p>

              <div className="grid grid-cols-4 gap-1">
                {mapImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`cursor-pointer rounded transition-all ${
                      selectedTileImageIndex === idx
                        ? "ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900"
                        : "border border-gray-700 hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedTileImageIndex(idx)}
                    title={`Tile #${idx}`}
                  >
                    <TileCanvas image={img} size={32} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingTileImageIndex(selectedTileImageIndex);
                setIsEditingTileImage(true);
              }}
              disabled={!mapImages[selectedTileImageIndex]}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit tile image
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => tileImageUploadInputRef.current?.click()}
              disabled={!mapImages[selectedTileImageIndex]}
            >
              <Upload className="mr-1 h-4 w-4" />
              Upload tile image
            </Button>
            <input
              ref={tileImageUploadInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUploadTileImage}
            />
            <Button size="sm" variant="outline" onClick={handleAddTileImage}>
              Add tile image
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemoveTileImage}
              disabled={isTileImageInUse || mapImages.length <= 1}
            >
              Remove tile image
            </Button>
          </div>
        </div>

        {/* Right column: supertile resize controls */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => onResizeSupertiles("top", 1)}>
                  Add Supertile Row Top
                </Button>
                <Button onClick={() => onResizeSupertiles("bottom", 1)}>
                  Add Supertile Row Bottom
                </Button>
                <Button onClick={() => onResizeSupertiles("left", 1)}>
                  Add Supertile Column Left
                </Button>
                <Button onClick={() => onResizeSupertiles("right", 1)}>
                  Add Supertile Column Right
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveSupertile("top")}
                >
                  Remove Supertile Row Top
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveSupertile("bottom")}
                >
                  Remove Supertile Row Bottom
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveSupertile("left")}
                >
                  Remove Supertile Column Left
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveSupertile("right")}
                >
                  Remove Supertile Column Right
                </Button>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <p>Supertiles Wide: {supertileCounts.width}</p>
                  <p>Supertiles High: {supertileCounts.height}</p>
                  <p>Unique Supertiles: {hedr.numUniqueSupertiles}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <p>Current Tile: #{selectedTile}</p>
                  <p>
                    Texture ID: {currentSelectedTileData?.info.imageIndex ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ImageEditor
        isOpen={isEditingTileImage}
        onClose={() => {
          setIsEditingTileImage(false);
          setEditingTileImageIndex(null);
        }}
        imageUrl={mapImages[editingTileImageIndex ?? selectedTileImageIndex]?.toDataURL("image/png") ?? ""}
        imageName={`Tile_${editingTileImageIndex ?? selectedTileImageIndex}`}
        onSave={handleSaveTileImageEdit}
      />
    </div>
  );
}
