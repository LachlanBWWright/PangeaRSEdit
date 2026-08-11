import { Layer, Stage, Image, Rect } from "react-konva";
import {
  Edit,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChangeEvent, RefObject } from "react";
import { MenuEmptyState } from "../MenuEmptyState";
import { useMemo } from "react";

interface SupertilePreviewTile {
  readonly row: number;
  readonly col: number;
  readonly info: {
    readonly flipX: boolean;
    readonly flipY: boolean;
    readonly rotationDegrees: number;
    readonly imageIndex: number;
  };
}

function buildSupertilePreview(
  tiles: readonly SupertilePreviewTile[],
  mapImages: readonly HTMLCanvasElement[],
  tilesPerSupertile: number,
  tileImageSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = tilesPerSupertile * tileImageSize;
  canvas.height = tilesPerSupertile * tileImageSize;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  tiles.forEach((tile) => {
    const image = mapImages[tile.info.imageIndex];
    if (!image) return;
    const centerX = tile.col * tileImageSize + tileImageSize / 2;
    const centerY = tile.row * tileImageSize + tileImageSize / 2;
    context.save();
    context.translate(centerX, centerY);
    context.rotate((tile.info.rotationDegrees * Math.PI) / 180);
    context.scale(tile.info.flipX ? -1 : 1, tile.info.flipY ? -1 : 1);
    context.drawImage(
      image,
      -tileImageSize / 2,
      -tileImageSize / 2,
      tileImageSize,
      tileImageSize,
    );
    context.restore();
  });
  return canvas;
}

function buildTilePalette(
  mapImages: readonly HTMLCanvasElement[],
  columns: number,
  tileSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = columns * tileSize;
  canvas.height = Math.ceil(mapImages.length / columns) * tileSize;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  mapImages.forEach((image, index) => {
    context.drawImage(
      image,
      (index % columns) * tileSize,
      Math.floor(index / columns) * tileSize,
      tileSize,
      tileSize,
    );
  });
  return canvas;
}

interface BugdomTileMenuContentProps {
  tilesPerSupertile: number;
  tileImageSize: number;
  tilesInSelectedSupertile: {
    row: number;
    col: number;
    info: {
      tileIndex: number;
      flipX: boolean;
      flipY: boolean;
      rotationDegrees: number;
      imageIndex: number;
    };
  }[];
  currentSelectedTileData:
    | {
        row: number;
        col: number;
        info: {
          tileIndex: number;
          flipX: boolean;
          flipY: boolean;
          rotationDegrees: number;
          imageIndex: number;
        };
      }
    | undefined;
  mapImages: HTMLCanvasElement[];
  selectedTileImageIndex: number;
  selectedTile: number;
  supertileCounts: { width: number; height: number };
  uniqueSupertiles: number;
  isTileImageInUse: boolean;
  setSelectedTileInSupertile: (index: number) => void;
  setSelectedTileImageIndex: (index: number) => void;
  setIsEditingTileImage: (next: boolean) => void;
  setEditingTileImageIndex: (index: number) => void;
  tileImageUploadInputRef: RefObject<HTMLInputElement | null>;
  onRotate: () => void;
  onFlipX: () => void;
  onFlipY: () => void;
  onReplaceTile: () => void;
  onUploadTileImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddTileImage: () => void;
  onRemoveTileImage: () => void;
}

export function BugdomTileMenuContent({
  tilesPerSupertile,
  tileImageSize,
  tilesInSelectedSupertile,
  currentSelectedTileData,
  mapImages,
  selectedTileImageIndex,
  selectedTile,
  supertileCounts,
  uniqueSupertiles,
  isTileImageInUse,
  setSelectedTileInSupertile,
  setSelectedTileImageIndex,
  setIsEditingTileImage,
  setEditingTileImageIndex,
  tileImageUploadInputRef,
  onRotate,
  onFlipX,
  onFlipY,
  onReplaceTile,
  onUploadTileImage,
  onAddTileImage,
  onRemoveTileImage,
}: BugdomTileMenuContentProps) {
  const supertilePreview = useMemo(
    () =>
      buildSupertilePreview(
        tilesInSelectedSupertile,
        mapImages,
        tilesPerSupertile,
        tileImageSize,
      ),
    [mapImages, tileImageSize, tilesInSelectedSupertile, tilesPerSupertile],
  );
  const paletteColumns = 4;
  const paletteTileSize = 32;
  const tilePalette = useMemo(
    () => buildTilePalette(mapImages, paletteColumns, paletteTileSize),
    [mapImages],
  );
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-2">
      <div className="grid h-full min-h-0 grid-cols-3 gap-4">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <div
                className="mx-auto cursor-pointer"
                style={{
                  width: tilesPerSupertile * tileImageSize,
                  height: tilesPerSupertile * tileImageSize,
                }}
              >
                <Stage
                  width={tilesPerSupertile * tileImageSize}
                  height={tilesPerSupertile * tileImageSize}
                  onClick={(e) => {
                    const pos = e.target.getStage()?.getPointerPosition();
                    if (!pos) return;
                    const col = Math.floor(pos.x / tileImageSize);
                    const row = Math.floor(pos.y / tileImageSize);
                    if (col >= tilesPerSupertile || row >= tilesPerSupertile)
                      return;
                    const tileIdx = tilesInSelectedSupertile.findIndex(
                      (t) => t.col === col && t.row === row,
                    );
                    if (tileIdx >= 0) setSelectedTileInSupertile(tileIdx);
                  }}
                >
                  <Layer>
                    <Image image={supertilePreview} listening={false} />
                    {currentSelectedTileData && (
                      <Rect
                        x={currentSelectedTileData.col * tileImageSize}
                        y={currentSelectedTileData.row * tileImageSize}
                        width={tileImageSize}
                        height={tileImageSize}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        listening={false}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>

              {currentSelectedTileData ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRotate}
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4 mr-1" />
                      Rotate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onFlipX}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4 mr-1" />
                      Flip X
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onFlipY}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4 mr-1" />
                      Flip Y
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={onReplaceTile}
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
                      Tile Index: {currentSelectedTileData.info.tileIndex}{" "}
                      {"->"} Image: {currentSelectedTileData.info.imageIndex}
                    </p>
                    <p>
                      Rotation: {currentSelectedTileData.info.rotationDegrees}°
                      | Flip: {currentSelectedTileData.info.flipX ? "X" : ""}
                      {currentSelectedTileData.info.flipY ? "Y" : ""}
                      {!currentSelectedTileData.info.flipX &&
                      !currentSelectedTileData.info.flipY
                        ? "None"
                        : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <MenuEmptyState
                  title="No Tile Selected"
                  description="Select a tile on the canvas to inspect and edit it."
                  compact
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-white text-center">Tile Images</h3>
              <p className="text-xs text-gray-400 text-center">
                {mapImages.length} tiles • Selected: #{selectedTileImageIndex}
              </p>

              <div className="relative mx-auto w-fit">
                <canvas
                  width={tilePalette.width}
                  height={tilePalette.height}
                  className="block cursor-pointer"
                  ref={(canvas) => {
                    const context = canvas?.getContext("2d");
                    if (!canvas || !context) return;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(tilePalette, 0, 0);
                  }}
                  onClick={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const column = Math.floor((event.clientX - bounds.left) / paletteTileSize);
                    const row = Math.floor((event.clientY - bounds.top) / paletteTileSize);
                    const index = row * paletteColumns + column;
                    if (index < mapImages.length) setSelectedTileImageIndex(index);
                  }}
                />
                <div
                  className="pointer-events-none absolute h-8 w-8 ring-2 ring-green-500"
                  style={{
                    left: (selectedTileImageIndex % paletteColumns) * paletteTileSize,
                    top: Math.floor(selectedTileImageIndex / paletteColumns) * paletteTileSize,
                  }}
                />
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
              onChange={onUploadTileImage}
            />
            <Button size="sm" variant="outline" onClick={onAddTileImage}>
              Add tile image
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRemoveTileImage}
              disabled={isTileImageInUse || mapImages.length <= 1}
            >
              Remove tile image
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto rounded border border-gray-600 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <p>Supertiles Wide: {supertileCounts.width}</p>
                  <p>Supertiles High: {supertileCounts.height}</p>
                  <p>Unique Supertiles: {uniqueSupertiles}</p>
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
    </div>
  );
}
