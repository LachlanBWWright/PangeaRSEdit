import { Layer, Stage, Image, Rect } from "react-konva";
import {
  Edit,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TileCanvas } from "../shared/TileCanvas";
import type { ChangeEvent, RefObject } from "react";

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
  onResizeSupertiles: (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => void;
  onRemoveSupertile: (direction: "top" | "bottom" | "left" | "right") => void;
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
  onResizeSupertiles,
  onRemoveSupertile,
}: BugdomTileMenuContentProps) {
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
                    {tilesInSelectedSupertile.map((tile, idx) => {
                      const img = mapImages[tile.info.imageIndex];
                      if (!img) return null;
                      const cx = tile.col * tileImageSize + tileImageSize / 2;
                      const cy = tile.row * tileImageSize + tileImageSize / 2;
                      return (
                        <Image
                          key={idx}
                          image={img}
                          width={tileImageSize}
                          height={tileImageSize}
                          x={cx}
                          y={cy}
                          offsetX={tileImageSize / 2}
                          offsetY={tileImageSize / 2}
                          rotation={tile.info.rotationDegrees}
                          scaleX={tile.info.flipX ? -1 : 1}
                          scaleY={tile.info.flipY ? -1 : 1}
                          listening={false}
                        />
                      );
                    })}
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
                <div className="flex items-center justify-center rounded border border-gray-600 p-3">
                  <p className="text-gray-400 text-center">No tile selected</p>
                </div>
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

              <div className="grid grid-cols-4 gap-1">
                {mapImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`cursor-pointer rounded transition-all ${selectedTileImageIndex === idx ? "ring-2 ring-green-500 ring-offset-1 ring-offset-gray-900" : "border border-gray-700 hover:border-gray-500"}`}
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
                  onClick={() => onRemoveSupertile("top")}
                >
                  Remove Supertile Row Top
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onRemoveSupertile("bottom")}
                >
                  Remove Supertile Row Bottom
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onRemoveSupertile("left")}
                >
                  Remove Supertile Column Left
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onRemoveSupertile("right")}
                >
                  Remove Supertile Column Right
                </Button>
              </div>
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
