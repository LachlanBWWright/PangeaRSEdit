import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  //globals.TILES_PER_SUPERTILE,
  // globals.SUPERTILE_TEXMAP_SIZE,
  ottoMaticLevel,
} from "../../../python/structSpecs/ottoMaticInterface";
import { FileUpload } from "../../../components/FileUpload";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { ImageEditor } from "@/components/ImageEditor";
import { useState } from "react";
import { Edit } from "lucide-react";
import { toast } from "sonner";

// Function to download a selected tile as an image
const downloadSelectedTile = (
  mapImages: HTMLCanvasElement[],
  superTileId: number,
  tileIndex: number,
) => {
  // Skip if it's an empty tile (ID 0)
  if (superTileId === 0 || !mapImages[superTileId]) return;

  const tileImage = mapImages[superTileId];

  // Create download link
  const link = document.createElement("a");
  link.download = `tile_${tileIndex}.png`;
  link.href = tileImage.toDataURL("image/png");
  link.click();
};

// Function to download the entire map as an image
const downloadMapImage = (
  mapImages: HTMLCanvasElement[],
  data: ottoMaticLevel,
  globals: { SUPERTILE_TEXMAP_SIZE: number; TILES_PER_SUPERTILE: number },
) => {
  const hedr = data.Hedr[1000].obj;

  // Create canvas to hold the complete map
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
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Place all supertiles onto the canvas
  for (let i = 0; i < hedr.mapHeight / globals.TILES_PER_SUPERTILE; i++) {
    for (let j = 0; j < hedr.mapWidth / globals.TILES_PER_SUPERTILE; j++) {
      // Calculate the index in the STgd array
      const tileIndex = i * (hedr.mapWidth / globals.TILES_PER_SUPERTILE) + j;

      // Get supertile ID
      const superTileId = data.STgd[1000].obj[tileIndex].superTileId;

      // Skip empty tiles (ID 0)
      if (superTileId === 0) continue;

      // Get the image for this supertile
      const tileImage = mapImages[superTileId];
      if (!tileImage) continue;

      // Draw the supertile at its position
      context.drawImage(
        tileImage,
        j * globals.SUPERTILE_TEXMAP_SIZE,
        i * globals.SUPERTILE_TEXMAP_SIZE,
      );
    }
  }

  // Create download link
  const link = document.createElement("a");
  link.download = "map_image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

export function SupertileMenu({
  data,
  setData,
  mapImages,
  setMapImages,
}: {
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedTile = useAtomValue(SelectedTile);
  const hedr = data.Hedr[1000].obj;
  const globals = useAtomValue(Globals);

  // State for image editor
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

  // Handle editing individual tile texture
  const handleEditTileTexture = () => {
    const tileId = data.STgd[1000].obj[selectedTile].superTileId;
    if (tileId === 0 || !mapImages[tileId]) {
      toast.error("No texture available for this tile");
      return;
    }

    const canvas = mapImages[tileId];
    const imageUrl = canvas.toDataURL("image/png");
    setEditingImageUrl(imageUrl);
    setIsEditingTile(true);
  };

  // Handle editing whole map texture
  const handleEditMapTexture = () => {
    // Create the full map canvas for editing
    const canvas = document.createElement("canvas");
    canvas.width =
      globals.SUPERTILE_TEXMAP_SIZE *
      (hedr.mapWidth / globals.TILES_PER_SUPERTILE);
    canvas.height =
      globals.SUPERTILE_TEXMAP_SIZE *
      (hedr.mapHeight / globals.TILES_PER_SUPERTILE);
    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Failed to create map canvas for editing");
      return;
    }

    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Place all supertiles onto the canvas
    for (let i = 0; i < hedr.mapHeight / globals.TILES_PER_SUPERTILE; i++) {
      for (let j = 0; j < hedr.mapWidth / globals.TILES_PER_SUPERTILE; j++) {
        const tileIndex = i * (hedr.mapWidth / globals.TILES_PER_SUPERTILE) + j;
        const superTileId = data.STgd[1000].obj[tileIndex].superTileId;

        if (superTileId === 0) continue;

        const tileImage = mapImages[superTileId];
        if (!tileImage) continue;

        context.drawImage(
          tileImage,
          j * globals.SUPERTILE_TEXMAP_SIZE,
          i * globals.SUPERTILE_TEXMAP_SIZE,
        );
      }
    }

    const imageUrl = canvas.toDataURL("image/png");
    setEditingImageUrl(imageUrl);
    setIsEditingMap(true);
  };

  // Handle saving edited tile texture
  const handleSaveTileEdit = async (
    editedImageData: ImageData,
  ): Promise<void> => {
    try {
      const tileId = data.STgd[1000].obj[selectedTile].superTileId;

      // Create a new canvas with the edited data
      const canvas = document.createElement("canvas");
      canvas.width = editedImageData.width;
      canvas.height = editedImageData.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.putImageData(editedImageData, 0, 0);

      // Update the map images array
      const newMapImages = [...mapImages];
      newMapImages[tileId] = canvas;
      setMapImages(newMapImages);

      toast.success("Tile texture updated successfully");
    } catch (error) {
      console.error("Error saving tile edit:", error);
      toast.error("Failed to save tile texture");
      throw error;
    }
  };

  // Handle saving edited map texture
  const handleSaveMapEdit = async (
    editedImageData: ImageData,
  ): Promise<void> => {
    try {
      // Create canvas from edited image data
      const canvas = document.createElement("canvas");
      canvas.width = editedImageData.width;
      canvas.height = editedImageData.height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      context.putImageData(editedImageData, 0, 0);

      // Extract individual tiles from the edited map
      const canvasArray: HTMLCanvasElement[] = [];

      const blackCanvas = document.createElement("canvas");
      blackCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
      blackCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
      const blackContext = blackCanvas.getContext("2d");
      if (!blackContext) throw new Error("Failed to create black canvas");

      blackContext.fillStyle = "black";
      blackContext.fillRect(0, 0, blackCanvas.width, blackCanvas.height);
      canvasArray.push(blackCanvas);

      for (let i = 0; i < hedr.mapHeight / globals.TILES_PER_SUPERTILE; i++) {
        for (let j = 0; j < hedr.mapWidth / globals.TILES_PER_SUPERTILE; j++) {
          const tileImage = context.getImageData(
            j * globals.SUPERTILE_TEXMAP_SIZE,
            i * globals.SUPERTILE_TEXMAP_SIZE,
            globals.SUPERTILE_TEXMAP_SIZE,
            globals.SUPERTILE_TEXMAP_SIZE,
          );

          const newCanvas = document.createElement("canvas");
          newCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
          newCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
          const newContext = newCanvas.getContext("2d");
          if (!newContext) throw new Error("Failed to create tile canvas");

          newContext.fillStyle = "black";
          newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);
          newContext.putImageData(tileImage, 0, 0);

          canvasArray.push(newCanvas);
        }
      }

      setMapImages(canvasArray);
      setData((data) => {
        for (let i = 0; i < data.STgd[1000].obj.length; i++) {
          data.STgd[1000].obj[i].superTileId = i + 1;
        }
        data.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length;
      });

      toast.success("Map texture updated successfully");
    } catch (error) {
      console.error("Error saving map edit:", error);
      toast.error("Failed to save map texture");
      throw error;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-2">
        <p>Replace Selected Tile ({selectedTile})</p>
        <FileUpload
          acceptType="image"
          disabled={data.STgd[1000].obj[selectedTile].superTileId === 0}
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

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
            newMapImages.splice(
              data.STgd[1000].obj[selectedTile].superTileId,
              1,
              canvas,
            );
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
            disabled={data.STgd[1000].obj[selectedTile].superTileId === 0}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <Stage width={120} height={120} className="mx-auto">
          <Layer>
            <ImageDisplay
              image={mapImages[data.STgd[1000].obj[selectedTile].superTileId]}
            />
          </Layer>
        </Stage>
        <p>Download Selected Tile</p>
        <div className="flex gap-2 w-full">
          <Button
            className="flex-1"
            size="sm"
            onClick={() =>
              downloadSelectedTile(
                mapImages,
                data.STgd[1000].obj[selectedTile].superTileId,
                selectedTile,
              )
            }
          >
            Download
          </Button>
        </div>
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
                // getImageData expects x, y, width, height
                const tileImage = context.getImageData(
                  j * globals.SUPERTILE_TEXMAP_SIZE,
                  i * globals.SUPERTILE_TEXMAP_SIZE,
                  globals.SUPERTILE_TEXMAP_SIZE,
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
              }
            }

            setMapImages(canvasArray);
            setData((data) => {
              for (let i = 0; i < data.STgd[1000].obj.length; i++) {
                //1 is added to i because of the blank
                data.STgd[1000].obj[i].superTileId = i + 1;
              }
              data.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length; //Blanks counted as unique supertile
            });
          }}
        />
        <div className="flex gap-2 w-full pt-2">
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={handleEditMapTexture}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="flex-1" />
        <p>Download Image For Whole Map</p>
        <div className="flex gap-2 w-full">
          <Button
            className="flex-1"
            size="sm"
            onClick={() => downloadMapImage(mapImages, data, globals)}
          >
            Download
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p>Supertiles Wide: {hedr.mapWidth / globals.TILES_PER_SUPERTILE}</p>
        <p>Supertiles High: {hedr.mapHeight / globals.TILES_PER_SUPERTILE}</p>
        <p>Unique Supertiles {hedr.numUniqueSupertiles}</p>

        <p>Current Tile: #{selectedTile}</p>
        <p>Texture ID: {data.STgd[1000].obj[selectedTile].superTileId}</p>
      </div>
      {/* Image Editor for individual tile */}
      {isEditingTile && editingImageUrl && (
        <ImageEditor
          isOpen={isEditingTile}
          onClose={() => {
            setIsEditingTile(false);
            setEditingImageUrl(null);
          }}
          imageUrl={editingImageUrl}
          onSave={handleSaveTileEdit}
          imageName={`Tile_${selectedTile}`}
        />
      )}

      {/* Image Editor for whole map */}
      {isEditingMap && editingImageUrl && (
        <ImageEditor
          isOpen={isEditingMap}
          onClose={() => {
            setIsEditingMap(false);
            setEditingImageUrl(null);
          }}
          imageUrl={editingImageUrl}
          onSave={handleSaveMapEdit}
          imageName="Full_Map"
        />
      )}
    </div>
  );
}

function ImageDisplay({ image }: { image: HTMLCanvasElement }) {
  if (!image) return <></>;

  return <Image image={image} width={250} height={250} />;
}
