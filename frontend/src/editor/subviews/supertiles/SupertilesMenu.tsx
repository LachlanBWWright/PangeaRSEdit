import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { FileUpload } from "../../../components/FileUpload";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { downloadSelectedTile, downloadMapImage } from "./supertileUtils";
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

  // Handle editing individual tile texture (currently opens image for download, TODO: implement inline editing)
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

    const canvas = mapImages[tileId];
    if (!canvas) {
      toast.error("No canvas available for this tile");
      return;
    }
    // Download the tile as a PNG for now
    const link = document.createElement("a");
    link.download = `tile_${tileId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Tile texture downloaded");
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
        <FileUpload
          acceptType="image"
          disabled={
            selectedTile >= stgd.length || (stgd[selectedTile]?.superTileId ?? 0) === 0
          }
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0] || !stgd) return;

            const file = e.target.files[0];
            if (!file) return;

            const canvas = document.createElement("canvas");
            canvas.width = globals.SUPERTILE_TEXMAP_SIZE;
            canvas.height = globals.SUPERTILE_TEXMAP_SIZE;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.fillStyle = "black";

            context.drawImage(
              await createImageBitmap(file, {
                resizeWidth: globals.SUPERTILE_TEXMAP_SIZE,
                resizeHeight: globals.SUPERTILE_TEXMAP_SIZE,
                resizeQuality: "high",
              }),
              0,
              0,
            );
            const newMapImages = [...mapImages];
            const tileEntry = stgd[selectedTile];
            if (tileEntry) {
              newMapImages.splice(tileEntry.superTileId, 1, canvas);
            }
            setMapImages(newMapImages);
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
        <FileUpload
          acceptType="image"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            if (!file) return;

            const canvas = document.createElement("canvas");
            canvas.width =
              globals.SUPERTILE_TEXMAP_SIZE *
              (hedr.mapWidth / globals.TILES_PER_SUPERTILE);
            canvas.height =
              globals.SUPERTILE_TEXMAP_SIZE *
              (hedr.mapHeight / globals.TILES_PER_SUPERTILE);
            const context = canvas.getContext("2d");
            if (!context) return;
            context.fillStyle = "black";

            context.drawImage(
              await createImageBitmap(file, {
                resizeWidth:
                  globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapWidth / globals.TILES_PER_SUPERTILE),
                resizeHeight:
                  globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapHeight / globals.TILES_PER_SUPERTILE),
                resizeQuality: "high",
              }),
              0,
              0,
            );

            const canvasArray: HTMLCanvasElement[] = [];

            const blackCanvas = document.createElement("canvas");
            blackCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
            blackCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
            const blackContext = blackCanvas.getContext("2d");
            if (!blackContext) return;
            blackContext.fillStyle = "black";
            canvasArray.push(blackCanvas);
            for (
              let i = 0;
              i < hedr.mapHeight / globals.TILES_PER_SUPERTILE;
              i++
            ) {
              for (
                let j = 0;
                j < hedr.mapWidth / globals.TILES_PER_SUPERTILE;
                j++
              ) {
                const tileImage = context.getImageData(
                  j * globals.SUPERTILE_TEXMAP_SIZE,
                  i * globals.SUPERTILE_TEXMAP_SIZE,
                  j * globals.SUPERTILE_TEXMAP_SIZE +
                    globals.SUPERTILE_TEXMAP_SIZE,
                  i * globals.SUPERTILE_TEXMAP_SIZE +
                    globals.SUPERTILE_TEXMAP_SIZE,
                );

                const newCanvas = document.createElement("canvas");
                newCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
                newCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
                const newContext = newCanvas.getContext("2d");
                if (!newContext) return;
                newContext.fillStyle = "black";

                newContext.putImageData(tileImage, 0, 0);

                canvasArray.push(newCanvas);
                //canvasArray.push(canvas);
              }
            }

            setMapImages(canvasArray);
            setTerrainData((data) => {
              if (!data.STgd?.[1000]?.obj) return;
              const stgdEntry = data.STgd[1000];
              if (!stgdEntry?.obj) return;
              const stgdObj = stgdEntry.obj;
              for (let i = 0; i < stgdObj.length; i++) {
                //1 is added to i because of the blank
                const entry = stgdObj[i];
                if (entry) {
                  entry.superTileId = i + 1;
                }
              }
            });
            // Update header in a separate call
            setHeaderData((draft) => {
              draft.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length;
            });
          }}
        />
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
    </div>
  );
}

function ImageDisplay({ image }: { image?: HTMLCanvasElement }) {
  if (!image) return <></>;

  return <Image image={image} width={250} height={250} />;
}
