import { useAtomValue } from "jotai";
import { Layer, Stage } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
  isSupertileEmpty,
} from "@/python/structSpecs/LevelTypes";
import { useRef, useState } from "react";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { downloadSelectedTile, downloadMapImage } from "./supertileUtils";
import { ImageEditor } from "@/components/ImageEditor";
import { ImageDisplay, ImageDropzone } from "./SupertileMenuParts";
import {
  applyWholeMapCanvas,
  buildWholeMapCanvas,
  loadImageIntoCanvas,
  saveWholeMapImageData,
  setSelectedTileBlank,
} from "./SupertileMenuHelpers";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
  getSupertileCounts,
} from "./supertileResizeGuards";

/**
 * Standard Supertile Menu for games with STgd-based terrain
 * (Otto Matic, Bugdom 2, Nanosaur 2, Cro-Mag Rally, Billy Frontier)
 *
 * For Bugdom 1 and Nanosaur 1 which use individual tiles, use BugdomTileMenu instead.
 */
export function SupertileMenu({
  headerData,
  setHeaderData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
  onResizeSupertiles,
}: {
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  onResizeSupertiles: (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => void;
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
}) {
  const selectedTile = useAtomValue(SelectedTile);
  const hedr = headerData.Hedr[1000].obj;
  const globals = useAtomValue(Globals);
  const supertileCounts = getSupertileCounts(
    hedr.mapWidth,
    hedr.mapHeight,
    globals.TILES_PER_SUPERTILE,
  );
  const tileUploadInputRef = useRef<HTMLInputElement>(null);
  const mapUploadInputRef = useRef<HTMLInputElement>(null);
  const [tileEditorOpen, setTileEditorOpen] = useState(false);
  const [mapEditorOpen, setMapEditorOpen] = useState(false);
  const [mapEditorImageUrl, setMapEditorImageUrl] = useState("");

  // Check if STgd exists
  if (!terrainData.STgd?.[1000]?.obj) {
    return (
      <div className="p-4 text-white">
        <p>No supertile grid data available</p>
      </div>
    );
  }

  // Now TypeScript knows STgd exists
  const stgd = terrainData.STgd[1000].obj;

  const updateSelectedTileFromCanvas = (canvas: HTMLCanvasElement) => {
    const tileEntry = stgd[selectedTile];
    if (!tileEntry) {
      toast.error("No tile data at this position");
      return;
    }
    const tileId = tileEntry.superTileId;
    if (tileId === 0) {
      toast.error("Selected tile is empty and cannot be replaced");
      return;
    }
    const newMapImages = [...mapImages];
    newMapImages[tileId] = canvas;
    setMapImages(newMapImages);
    toast.success("Selected tile texture updated");
  };

  const applyCanvasToMap = (
    canvas: HTMLCanvasElement,
    mode: "non-empty" | "regenerate-all",
  ) => {
    applyWholeMapCanvas(
      canvas,
      mode,
      hedr,
      globals,
      mapImages,
      setTerrainData,
      setMapImages,
      setHeaderData,
    );
  };

  const handleEditTileTexture = () => {
    const tileEntry = stgd[selectedTile];
    if (!tileEntry) {
      toast.error("No tile data at this position");
      return;
    }
    const tileId = tileEntry.superTileId;
    if (tileId === 0 || !mapImages[tileId]) {
      toast.error("No texture available for this tile");
      return;
    }
    setTileEditorOpen(true);
  };

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-1 gap-2">
        <div className="flex h-full min-h-0 flex-col gap-2">
          <p>Replace Selected Tile ({selectedTile})</p>
          <ImageDropzone
            inputRef={tileUploadInputRef}
            label="Drop tile image or click to browse"
            accept="image/*"
            disabled={
              selectedTile >= stgd.length ||
              !stgd[selectedTile] ||
              isSupertileEmpty(stgd[selectedTile])
            }
            onFile={async (file) => {
              const canvas = await loadImageIntoCanvas(
                file,
                globals.SUPERTILE_TEXMAP_SIZE,
                globals.SUPERTILE_TEXMAP_SIZE,
              );
              if (canvas) {
                updateSelectedTileFromCanvas(canvas);
              }
            }}
          />
          {/* Edit button in same group as upload */}
          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              size="sm"
              variant="outline"
              onClick={handleEditTileTexture}
              disabled={
                !stgd[selectedTile] || isSupertileEmpty(stgd[selectedTile])
              }
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
          <Stage width={120} height={120} className="mx-auto">
            <Layer>
              <ImageDisplay
                image={
                  mapImages[stgd[selectedTile]?.superTileId ?? 0] ?? undefined
                }
              />
            </Layer>
          </Stage>
          <p>Download Selected Tile</p>
          <Button
            size="sm"
            onClick={() => {
              const tileEntry = stgd[selectedTile];
              if (tileEntry) {
                downloadSelectedTile(
                  mapImages,
                  tileEntry.superTileId,
                  selectedTile,
                );
              }
            }}
          >
            Download
          </Button>
        </div>
        <div className="flex h-full min-h-0 flex-col gap-2">
          <p>Upload Image For Whole Map</p>
          <ImageDropzone
            inputRef={mapUploadInputRef}
            label="Drop map image or click to browse"
            accept="image/*"
            onFile={async (file) => {
              const canvas = await loadImageIntoCanvas(
                file,
                globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapWidth / globals.TILES_PER_SUPERTILE),
                globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapHeight / globals.TILES_PER_SUPERTILE),
              );
              if (canvas) {
                applyCanvasToMap(canvas, "regenerate-all");
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const mapCanvas = buildWholeMapCanvas(
                hedr,
                globals,
                stgd,
                mapImages,
              );
              if (!mapCanvas) {
                return;
              }
              setMapEditorImageUrl(mapCanvas.toDataURL("image/png"));
              setMapEditorOpen(true);
            }}
          >
            Edit whole map in texture editor
          </Button>
          <div className="flex-1" />
          <p>Download Image For Whole Map</p>
          <Button
            size="sm"
            onClick={() =>
              downloadMapImage(mapImages, headerData, terrainData, globals)
            }
          >
            Download
          </Button>
        </div>
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto pr-1">
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
          </div>
          <div className="grid grid-cols-2 gap-2">
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
              <p>Texture ID: {stgd[selectedTile]?.superTileId || 0}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={
              selectedTile >= stgd.length ||
              !stgd[selectedTile] ||
              isSupertileEmpty(stgd[selectedTile])
            }
            onClick={() => {
              setSelectedTileBlank(selectedTile, globals, setTerrainData);
            }}
          >
            Set to Blank
          </Button>
        </div>
      </div>
      <ImageEditor
        isOpen={tileEditorOpen}
        onClose={() => setTileEditorOpen(false)}
        imageUrl={
          mapImages[stgd[selectedTile]?.superTileId ?? 0]?.toDataURL(
            "image/png",
          ) ?? ""
        }
        imageName={`Tile ${selectedTile}`}
        onSave={async (editedImageData) => {
          const editedCanvas = document.createElement("canvas");
          editedCanvas.width = editedImageData.width;
          editedCanvas.height = editedImageData.height;
          const context = editedCanvas.getContext("2d");
          if (!context) {
            toast.error("Failed to create canvas context");
            return;
          }
          context.putImageData(editedImageData, 0, 0);
          updateSelectedTileFromCanvas(editedCanvas);
        }}
      />
      <ImageEditor
        isOpen={mapEditorOpen}
        onClose={() => setMapEditorOpen(false)}
        imageUrl={mapEditorImageUrl}
        imageName="Whole map texture"
        saveActions={[
          {
            label: "Update non-empty tiles",
            onSave: async (editedImageData) =>
              saveWholeMapImageData(
                editedImageData,
                "non-empty",
                applyCanvasToMap,
              ),
          },
          {
            label: "Save all tiles",
            onSave: async (editedImageData) =>
              saveWholeMapImageData(
                editedImageData,
                "regenerate-all",
                applyCanvasToMap,
              ),
          },
        ]}
        onSave={async (editedImageData) =>
          saveWholeMapImageData(editedImageData, "non-empty", applyCanvasToMap)
        }
      />
    </div>
  );
}
