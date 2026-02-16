import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { RefObject, useRef, useState } from "react";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { downloadSelectedTile, downloadMapImage } from "./supertileUtils";
import { ImageEditor } from "@/components/ImageEditor";
import { cn } from "@/lib/utils";
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
  const [mapEditorMode, setMapEditorMode] = useState<
    "non-empty" | "regenerate-all"
  >("non-empty");

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

  const loadImageIntoCanvas = async (
    file: File,
    width: number,
    height: number,
  ): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to create canvas context");
      return null;
    }
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);
    const imageBitmap = await createImageBitmap(file, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    context.drawImage(imageBitmap, 0, 0);
    return canvas;
  };

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

  const applyWholeMapCanvas = (canvas: HTMLCanvasElement) => {
    const tilesWide = hedr.mapWidth / globals.TILES_PER_SUPERTILE;
    const tilesHigh = hedr.mapHeight / globals.TILES_PER_SUPERTILE;
    const nextImages = [...mapImages];
    let nextId = 1;

    setTerrainData((terrainDraft) => {
      const stgdEntry = terrainDraft.STgd?.[1000];
      if (!stgdEntry?.obj) {
        return;
      }
      for (let y = 0; y < tilesHigh; y++) {
        for (let x = 0; x < tilesWide; x++) {
          const tileIndex = y * tilesWide + x;
          const slice = document.createElement("canvas");
          slice.width = globals.SUPERTILE_TEXMAP_SIZE;
          slice.height = globals.SUPERTILE_TEXMAP_SIZE;
          const sliceContext = slice.getContext("2d");
          if (!sliceContext) {
            continue;
          }
          sliceContext.drawImage(
            canvas,
            x * globals.SUPERTILE_TEXMAP_SIZE,
            y * globals.SUPERTILE_TEXMAP_SIZE,
            globals.SUPERTILE_TEXMAP_SIZE,
            globals.SUPERTILE_TEXMAP_SIZE,
            0,
            0,
            globals.SUPERTILE_TEXMAP_SIZE,
            globals.SUPERTILE_TEXMAP_SIZE,
          );

          const tileEntry = stgdEntry.obj[tileIndex];
          if (!tileEntry) {
            continue;
          }
          if (mapEditorMode === "non-empty") {
            if (tileEntry.superTileId !== 0) {
              nextImages[tileEntry.superTileId] = slice;
            }
          } else {
            tileEntry.superTileId = nextId;
            nextImages[nextId] = slice;
            nextId++;
          }
        }
      }
    });

    setMapImages(nextImages);
    if (mapEditorMode === "regenerate-all") {
      setHeaderData((draft) => {
        draft.Hedr[1000].obj.numUniqueSupertiles = nextId;
      });
    }
    toast.success("Map image updated");
  };

  const buildWholeMapCanvas = (): HTMLCanvasElement | null => {
    const tilesWide = hedr.mapWidth / globals.TILES_PER_SUPERTILE;
    const tilesHigh = hedr.mapHeight / globals.TILES_PER_SUPERTILE;
    const canvas = document.createElement("canvas");
    canvas.width = globals.SUPERTILE_TEXMAP_SIZE * tilesWide;
    canvas.height = globals.SUPERTILE_TEXMAP_SIZE * tilesHigh;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to create map canvas");
      return null;
    }
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < tilesHigh; y++) {
      for (let x = 0; x < tilesWide; x++) {
        const tileIndex = y * tilesWide + x;
        const tileEntry = stgd[tileIndex];
        if (!tileEntry || tileEntry.superTileId === 0) {
          continue;
        }
        const tileImage = mapImages[tileEntry.superTileId];
        if (!tileImage) {
          continue;
        }
        context.drawImage(
          tileImage,
          x * globals.SUPERTILE_TEXMAP_SIZE,
          y * globals.SUPERTILE_TEXMAP_SIZE,
        );
      }
    }
    return canvas;
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
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
      <div className="grid grid-cols-4 gap-2">
        <Button variant="destructive" onClick={() => handleRemoveSupertile("top")}>
          Remove Supertile Row Top
        </Button>
        <Button variant="destructive" onClick={() => handleRemoveSupertile("bottom")}>
          Remove Supertile Row Bottom
        </Button>
        <Button variant="destructive" onClick={() => handleRemoveSupertile("left")}>
          Remove Supertile Column Left
        </Button>
        <Button variant="destructive" onClick={() => handleRemoveSupertile("right")}>
          Remove Supertile Column Right
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-2">
        <p>Replace Selected Tile ({selectedTile})</p>
        <ImageDropzone
          inputRef={tileUploadInputRef}
          label="Drop tile image or click to browse"
          accept="image/*"
          disabled={
            selectedTile >= stgd.length ||
            (stgd[selectedTile]?.superTileId ?? 0) === 0
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
        {/* Edit button moved to its own row */}
        <div className="flex gap-2 w-full pt-2">
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={handleEditTileTexture}
            disabled={(stgd[selectedTile]?.superTileId ?? 0) === 0}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <Stage width={120} height={120} className="mx-auto">
          <Layer>
            <ImageDisplay
              image={mapImages[stgd[selectedTile]?.superTileId ?? 0] ?? undefined}
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
      <div className="flex flex-col gap-2">
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
              applyWholeMapCanvas(canvas);
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const mapCanvas = buildWholeMapCanvas();
            if (!mapCanvas) {
              return;
            }
            setMapEditorImageUrl(mapCanvas.toDataURL("image/png"));
            setMapEditorOpen(true);
          }}
        >
          Edit whole map in texture editor
        </Button>
        <Button
          size="sm"
          variant={mapEditorMode === "non-empty" ? "default" : "outline"}
          onClick={() =>
            setMapEditorMode((mode) =>
              mode === "non-empty" ? "regenerate-all" : "non-empty",
            )
          }
        >
          {mapEditorMode === "non-empty"
            ? "Saving mode: non-empty tiles only"
            : "Saving mode: regenerate all texture IDs"}
        </Button>
        <div className="flex-1" />
        <p>Download Image For Whole Map</p>
        <Button size="sm" onClick={() => downloadMapImage(mapImages, headerData, terrainData, globals)}>
          Download
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p>Supertiles Wide: {supertileCounts.width}</p>
        <p>Supertiles High: {supertileCounts.height}</p>
        <p>Unique Supertiles {hedr.numUniqueSupertiles}</p>

        <p>Current Tile: #{selectedTile}</p>
        <p>Texture ID: {stgd[selectedTile]?.superTileId || 0}</p>
      </div>
      </div>
      <ImageEditor
        isOpen={tileEditorOpen}
        onClose={() => setTileEditorOpen(false)}
        imageUrl={
          mapImages[stgd[selectedTile]?.superTileId ?? 0]?.toDataURL("image/png") ??
          ""
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
          applyWholeMapCanvas(editedCanvas);
        }}
      />
    </div>
  );
}

function ImageDisplay({ image }: { image?: HTMLCanvasElement }) {
  if (!image) return <></>;

  return <Image image={image} width={250} height={250} />;
}

/**
 * Shared image upload dropzone used for tile and whole-map texture updates.
 * It supports click-to-browse and drag/drop in one compact panel.
 */
function ImageDropzone({
  inputRef,
  label,
  accept,
  disabled,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-gray-600 rounded-lg p-3 text-center transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-gray-500",
      )}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        if (!disabled) {
          event.preventDefault();
        }
      }}
      onDrop={async (event) => {
        event.preventDefault();
        if (disabled) return;
        const file = event.dataTransfer.files[0];
        if (!file) return;
        await onFile(file);
      }}
    >
      <p className="text-sm text-gray-200">{label}</p>
      <p className="text-xs text-gray-500">Accepted: {accept}</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
