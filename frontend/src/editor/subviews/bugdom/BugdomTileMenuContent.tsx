import { Layer, Stage, Image, Rect } from "react-konva";
import type { ChangeEvent, ReactNode, RefObject } from "react";
import { useMemo } from "react";
import { ReusableTilePalettePanel } from "../shared/ReusableTilePalettePanel";
import { TileTransformActions } from "../shared/TileTransformActions";
import { Button } from "@/components/ui/button";
import { TileSelectionModePanel } from "../shared/TileSelectionModePanel";
import type { TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";

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

interface BugdomTileMenuContentProps {
  game: TileBrushGame;
  stampLibrary: ReactNode;
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
  currentFlatIndex: number;
  activeLayer: 1000 | 1001;
  isTileImageInUse: boolean;
  onSelectTileInSupertile: (index: number) => void;
  setSelectedTileImageIndex: (index: number) => void;
  tileImageUploadInputRef: RefObject<HTMLInputElement | null>;
  onEditPaletteTileImage: () => void;
  onRotate: () => void;
  onFlipX: () => void;
  onFlipY: () => void;
  onReplaceTile: () => void;
  onUploadPaletteTileImage: (
    event: ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  onAddTileImage: () => void;
  onRemoveTileImage: () => void;
}

export function BugdomTileMenuContent({
  game,
  stampLibrary,
  tilesPerSupertile,
  tileImageSize,
  tilesInSelectedSupertile,
  currentSelectedTileData,
  mapImages,
  selectedTileImageIndex,
  selectedTile,
  currentFlatIndex,
  activeLayer,
  isTileImageInUse,
  onSelectTileInSupertile,
  setSelectedTileImageIndex,
  tileImageUploadInputRef,
  onEditPaletteTileImage,
  onRotate,
  onFlipX,
  onFlipY,
  onReplaceTile,
  onUploadPaletteTileImage,
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
  return (
    <div className="flex h-[320px] min-h-0 flex-none flex-col gap-4 overflow-hidden p-2">
      <div className="grid h-full min-h-0 grid-cols-2 gap-4">
        <TileSelectionModePanel
          game={game}
          stampLibrary={stampLibrary}
          individualTile={(
          <div className="flex min-h-0 flex-col overflow-hidden p-3">
          <div className="mx-auto cursor-pointer">
            <Stage
              width={tilesPerSupertile * tileImageSize}
              height={tilesPerSupertile * tileImageSize}
              onClick={(event) => {
                const position = event.target.getStage()?.getPointerPosition();
                if (!position) return;
                const col = Math.floor(position.x / tileImageSize);
                const row = Math.floor(position.y / tileImageSize);
                const index = tilesInSelectedSupertile.findIndex(
                  (tile) => tile.col === col && tile.row === row,
                );
                if (index >= 0) onSelectTileInSupertile(index);
              }}
            >
              <Layer>
                <Image image={supertilePreview} listening={false} />
                {currentSelectedTileData ? (
                  <Rect
                    x={currentSelectedTileData.col * tileImageSize}
                    y={currentSelectedTileData.row * tileImageSize}
                    width={tileImageSize}
                    height={tileImageSize}
                    stroke="#22c55e"
                    strokeWidth={2}
                    listening={false}
                  />
                ) : null}
              </Layer>
            </Stage>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="flex-1">
              <TileTransformActions
                onRotate={onRotate}
                onFlipHorizontal={onFlipX}
                onFlipVertical={onFlipY}
                disabled={!currentSelectedTileData}
              />
            </div>
            <Button size="sm" onClick={onReplaceTile} disabled={!currentSelectedTileData}>
              Replace with Tile Image #{selectedTileImageIndex}
            </Button>
          </div>
          {currentSelectedTileData ? (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 text-xs text-gray-400">
              <p>Position: ({currentSelectedTileData.col}, {currentSelectedTileData.row})</p>
              <p>Cell: #{currentFlatIndex}</p>
              <p>Tile Index: {currentSelectedTileData.info.tileIndex} → Image: {currentSelectedTileData.info.imageIndex}</p>
              <p>Rotation: {currentSelectedTileData.info.rotationDegrees}° | Flip: {currentSelectedTileData.info.flipX ? "X" : ""}{currentSelectedTileData.info.flipY ? "Y" : ""}{!currentSelectedTileData.info.flipX && !currentSelectedTileData.info.flipY ? "None" : ""}</p>
              <p>{activeLayer === 1001 ? "Roof" : "Floor"} · Supertile #{selectedTile}</p>
            </div>
          ) : null}
          </div>
          )}
        />
        <div className="min-h-0 overflow-hidden">
          <ReusableTilePalettePanel
            images={mapImages}
            selectedIndex={selectedTileImageIndex}
            selectedImageInUse={isTileImageInUse}
            uploadInputRef={tileImageUploadInputRef}
            onEdit={onEditPaletteTileImage}
            onUpload={onUploadPaletteTileImage}
            onAdd={onAddTileImage}
            onRemove={onRemoveTileImage}
            onReplace={onReplaceTile}
            onSelect={setSelectedTileImageIndex}
            title={`Tile Images · ${mapImages.length} tiles · Selected #${selectedTileImageIndex}`}
            itemLabel="tile image"
            replaceLabel="Replace with Tile Image #"
            thumbnailSize={32}
            itemClassName="border border-gray-700"
          />
        </div>
      </div>
    </div>
  );
}
