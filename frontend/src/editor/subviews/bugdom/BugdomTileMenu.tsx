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

import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
} from "../../../python/structSpecs/ottoMaticLevelData";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { toast } from "sonner";
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
}

export function BugdomTileMenu({
  headerData,

  terrainData,
  setTerrainData,
  mapImages,
}: BugdomTileMenuProps) {
  // Mark destructured setters as used to satisfy lint rules (component doesn't use them directly)

  const selectedTile = useAtomValue(SelectedTile);
  const hedr = headerData.Hedr[1000].obj;
  const globals = useAtomValue(Globals);

  // Selected individual tile within the supertile (0-24 for 5x5)
  const [selectedTileInSupertile, setSelectedTileInSupertile] =
    useState<number>(0);

  // Selected tile from the palette for replacement
  const [selectedPaletteTile, setSelectedPaletteTile] = useState<number>(0);

  // Get the Layr and Xlat data
  const layerData = terrainData.Layr?.[1000]?.obj;
  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  const numTileImages = mapImages.length;

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
  const currentSelectedTileData =
    tilesInSelectedSupertile[selectedTileInSupertile];
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

  // Handle replacing the selected tile with one from the palette
  const handleReplaceTile = () => {
    if (!layerData || currentFlatIndex < 0) return;

    // Find the tile index that maps to the selected image
    const tileIndexForImage = findTileIndexForImage(selectedPaletteTile);

    if (tileIndexForImage === null) {
      toast.error(`Cannot find tile index for image #${selectedPaletteTile}`);
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
      `Replaced with image #${selectedPaletteTile} (tile index ${tileIndexForImage})`,
    );
  };

  if (!layerData) {
    return (
      <div className="p-4 text-white">
        <p>No tile layer data available</p>
      </div>
    );
  }

  const boxHeight = "h-80"; // Consistent height for all columns

  return (
    <div className="grid grid-cols-3 gap-4 p-2">
      {/* Left column: Selected Supertile Tiles */}
      <div className={`flex flex-col gap-2 ${boxHeight}`}>
        <h3 className="font-bold text-white text-center">
          Supertile #{selectedTile}
        </h3>
        <p className="text-sm text-gray-300 text-center">
          Click a tile to select it
        </p>

        {/* Show tiles in a 5x5 grid - clickable for selection */}
        <div className="border border-gray-600 p-3 rounded flex-1 flex flex-col justify-center">
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
        </div>
      </div>

      {/* Middle column: Edit Controls for selected tile */}
      <div className={`flex flex-col gap-2 ${boxHeight}`}>
        <h3 className="font-bold text-white text-center">Edit Selected Tile</h3>
        <p className="text-sm text-gray-300 text-center">
          Transform or replace
        </p>

        {currentSelectedTileData ? (
          <div className="border border-gray-600 p-3 rounded flex-1 flex flex-col">
            {/* Preview of selected tile */}
            <div className="flex justify-center mb-3">
              <div className="border-2 border-blue-500 rounded p-1 bg-gray-800">
                <Stage width={64} height={64}>
                  <Layer>
                    {mapImages[currentSelectedTileData.info.imageIndex] && (
                      <Image
                        image={
                          mapImages[currentSelectedTileData.info.imageIndex]
                        }
                        width={64}
                        height={64}
                        x={32}
                        y={32}
                        offsetX={32}
                        offsetY={32}
                        rotation={currentSelectedTileData.info.rotationDegrees}
                        scaleX={currentSelectedTileData.info.flipX ? -1 : 1}
                        scaleY={currentSelectedTileData.info.flipY ? -1 : 1}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>

            {/* Transform buttons */}
            <div className="flex justify-center gap-2 mb-3">
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
            </div>

            {/* Replace with palette tile */}
            <div className="flex justify-center mb-3">
              <Button
                size="sm"
                variant="default"
                onClick={handleReplaceTile}
                title="Replace with selected palette tile"
              >
                Replace with Palette Tile #{selectedPaletteTile}
              </Button>
            </div>

            {/* Tile info */}
            <div className="text-xs text-gray-400 text-center mt-auto">
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
          <div className="border border-gray-600 p-3 rounded flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-center">No tile selected</p>
          </div>
        )}
      </div>

      {/* Right column: Tile Palette */}
      <div className={`flex flex-col gap-2 ${boxHeight}`}>
        <h3 className="font-bold text-white text-center">Tile Palette</h3>
        <p className="text-xs text-gray-400 text-center">
          {mapImages.length} tiles • Selected: #{selectedPaletteTile}
        </p>

        <div className="flex-1 overflow-y-auto border border-gray-600 rounded p-2">
          <div className="grid grid-cols-4 gap-1">
            {mapImages.map((img, idx) => (
              <div
                key={idx}
                className={`cursor-pointer rounded transition-all ${
                  selectedPaletteTile === idx
                    ? "ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900"
                    : "border border-gray-700 hover:border-gray-500"
                }`}
                onClick={() => setSelectedPaletteTile(idx)}
                title={`Tile #${idx}`}
              >
                <Stage width={32} height={32}>
                  <Layer>
                    {img && <Image image={img} width={32} height={32} />}
                  </Layer>
                </Stage>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
