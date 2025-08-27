import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/supertiles/supertileAtoms";
import { Updater } from "use-immer";
import {
  HeaderData,
  TerrainData,
  ItemData,
  FenceData,
  SplineData,
  LiquidData,
} from "../../../python/structSpecs/ottoMaticLevelData";
import { FileUpload } from "../../../components/FileUpload";
import { Globals } from "../../../data/globals/globals";
import { Button } from "@/components/ui/button";
import { ImageEditor } from "@/components/ImageEditor";
import { useState } from "react";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { 
  addSupertileRow, 
  removeSupertileRow, 
  addSupertileColumn, 
  removeSupertileColumn,
  addBlankSupertileTextures,
  Side 
} from "../../../utils/supertileOperations";

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
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: { SUPERTILE_TEXMAP_SIZE: number; TILES_PER_SUPERTILE: number },
) => {
  const hedr = headerData.Hedr[1000].obj;
  if (!terrainData.STgd[1000].obj) return;

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
      const superTileId = terrainData.STgd[1000].obj[tileIndex].superTileId;

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
  headerData,
  setHeaderData,
  terrainData,
  setTerrainData,
  itemData,
  setItemData,
  fenceData,
  setFenceData,
  splineData,
  setSplineData,
  liquidData,
  setLiquidData,
  mapImages,
  setMapImages,
}: {
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
}) {
  const selectedTile = useAtomValue(SelectedTile);
  const hedr = headerData.Hedr[1000].obj;
  const globals = useAtomValue(Globals);

  // State for image editor
  const [isEditingTile, setIsEditingTile] = useState(false);
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

  // Handle editing individual tile texture
  const handleEditTileTexture = () => {
    const tileId = terrainData.STgd[1000].obj[selectedTile].superTileId;
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
        const superTileId = terrainData.STgd[1000].obj[tileIndex].superTileId;

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
      const tileId = terrainData.STgd[1000].obj[selectedTile].superTileId;

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
      setTerrainData((data) => {
        for (let i = 0; i < data.STgd[1000].obj.length; i++) {
          data.STgd[1000].obj[i].superTileId = i + 1;
        }
      });
      setHeaderData((data) => {
        data.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length;
      });

      toast.success("Map texture updated successfully");
    } catch (error) {
      console.error("Error saving map edit:", error);
      toast.error("Failed to save map texture");
      throw error;
    }
  };

  // Helper function to create complete level data for operations
  const createCompleteLevelData = () => {
    return {
      ...headerData,
      ...terrainData,
      ...(itemData || {}),
      ...(fenceData || {}),
      ...(splineData || {}),
      ...(liquidData || {}),
    };
  };

  // Helper function to update state with new level data
  const updateLevelData = (newLevelData: any) => {
    // Update header data using immer draft mutation
    setHeaderData(draft => {
      draft.Hedr[1000].obj = newLevelData.Hedr[1000].obj;
    });
    
    // Update terrain data using immer draft mutation
    setTerrainData(draft => {
      draft.STgd[1000].obj = newLevelData.STgd[1000].obj;
      draft.Atrb[1000].obj = newLevelData.Atrb[1000].obj;
      draft.Layr[1000].obj = newLevelData.Layr[1000].obj;
      draft.YCrd[1000].obj = newLevelData.YCrd[1000].obj;
    });
    
    // Update spatial data if present and changed
    if (newLevelData.Itms && setItemData && itemData) {
      setItemData(draft => {
        if (draft && draft.Itms) {
          draft.Itms[1000].obj = newLevelData.Itms[1000].obj;
        }
      });
    }
    
    if (newLevelData.Fenc && setFenceData && fenceData) {
      setFenceData(draft => {
        if (draft && draft.Fenc) {
          draft.Fenc[1000].obj = newLevelData.Fenc[1000].obj;
        }
        if (draft && draft.FnNb && newLevelData.FnNb) {
          for (const key in newLevelData.FnNb) {
            if (newLevelData.FnNb.hasOwnProperty(key)) {
              draft.FnNb[Number(key)] = newLevelData.FnNb[Number(key)];
            }
          }
        }
      });
    }
    
    if (newLevelData.Spln && setSplineData && splineData) {
      setSplineData(draft => {
        if (draft && draft.Spln) {
          draft.Spln[1000].obj = newLevelData.Spln[1000].obj;
        }
        if (draft && draft.SpNb && newLevelData.SpNb) {
          for (const key in newLevelData.SpNb) {
            if (newLevelData.SpNb.hasOwnProperty(key)) {
              draft.SpNb[Number(key)] = newLevelData.SpNb[Number(key)];
            }
          }
        }
        if (draft && draft.SpPt && newLevelData.SpPt) {
          for (const key in newLevelData.SpPt) {
            if (newLevelData.SpPt.hasOwnProperty(key)) {
              draft.SpPt[Number(key)] = newLevelData.SpPt[Number(key)];
            }
          }
        }
      });
    }
    
    if (newLevelData.Liqd && setLiquidData && liquidData) {
      setLiquidData(draft => {
        if (draft && draft.Liqd) {
          draft.Liqd[1000].obj = newLevelData.Liqd[1000].obj;
        }
      });
    }
  };

  // Handle adding a row of supertiles
  const handleAddRow = (side: Side.TOP | Side.BOTTOM) => {
    try {
      const levelData = createCompleteLevelData();
      const newLevelData = addSupertileRow(levelData, side, globals);
      
      // Calculate how many new supertiles we added
      const newSupertileCount = hedr.mapWidth / globals.TILES_PER_SUPERTILE;
      const newMapImages = addBlankSupertileTextures(mapImages, newSupertileCount, globals);
      
      updateLevelData(newLevelData);
      setMapImages(newMapImages);
      
      toast.success(`Added supertile row to ${side}`);
    } catch (error) {
      console.error("Error adding row:", error);
      toast.error(`Failed to add supertile row: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle removing a row of supertiles  
  const handleRemoveRow = (side: Side.TOP | Side.BOTTOM) => {
    try {
      const levelData = createCompleteLevelData();
      const newLevelData = removeSupertileRow(levelData, side, globals);
      
      updateLevelData(newLevelData);
      
      toast.success(`Removed supertile row from ${side}`);
    } catch (error) {
      console.error("Error removing row:", error);
      toast.error(`Failed to remove supertile row: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle adding a column of supertiles
  const handleAddColumn = (side: Side.LEFT | Side.RIGHT) => {
    try {
      const levelData = createCompleteLevelData();
      const newLevelData = addSupertileColumn(levelData, side, globals);
      
      // Calculate how many new supertiles we added
      const newSupertileCount = hedr.mapHeight / globals.TILES_PER_SUPERTILE;
      const newMapImages = addBlankSupertileTextures(mapImages, newSupertileCount, globals);
      
      updateLevelData(newLevelData);
      setMapImages(newMapImages);
      
      toast.success(`Added supertile column to ${side}`);
    } catch (error) {
      console.error("Error adding column:", error);
      toast.error(`Failed to add supertile column: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle removing a column of supertiles
  const handleRemoveColumn = (side: Side.LEFT | Side.RIGHT) => {
    try {
      const levelData = createCompleteLevelData();
      const newLevelData = removeSupertileColumn(levelData, side, globals);
      
      updateLevelData(newLevelData);
      
      toast.success(`Removed supertile column from ${side}`);
    } catch (error) {
      console.error("Error removing column:", error);
      toast.error(`Failed to remove supertile column: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-2">
        <p>Replace Selected Tile ({selectedTile})</p>
        <FileUpload
          acceptType="image"
          disabled={
            selectedTile >= terrainData.STgd[1000].obj.length ||
            terrainData.STgd[1000].obj[selectedTile].superTileId === 0
          }
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0] || !terrainData.STgd[1000].obj) return;

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
              terrainData.STgd[1000].obj[selectedTile].superTileId,
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
            disabled={
              terrainData.STgd[1000].obj[selectedTile].superTileId === 0
            }
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <Stage width={120} height={120} className="mx-auto">
          <Layer>
            <ImageDisplay
              image={
                mapImages[
                  terrainData.STgd[1000].obj[selectedTile]?.superTileId || 0
                ]
              }
            />
          </Layer>
        </Stage>
        <p>Download Selected Tile</p>
        <Button
          size="sm"
          onClick={() =>
            downloadSelectedTile(
              mapImages,
              terrainData.STgd[1000].obj[selectedTile].superTileId,
              selectedTile,
            )
          }
        >
          Download
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p>Upload Image For Whole Map</p>
        <FileUpload
          acceptType="image"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0] || !hedr) return;

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
            setTerrainData((data) => {
              for (let i = 0; i < data.STgd[1000].obj.length; i++) {
                //1 is added to i because of the blank
                data.STgd[1000].obj[i].superTileId = i + 1;
              }
            });
            setHeaderData((data) => {
              if (data.Hedr?.[1000]?.obj) {
                data.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length; //Blanks counted as unique supertile
              }
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
        <Button
          size="sm"
          onClick={() =>
            downloadMapImage(mapImages, headerData, terrainData, globals)
          }
        >
          Download
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p>
          Supertiles Wide:{" "}
          {hedr ? hedr.mapWidth / globals.TILES_PER_SUPERTILE : 0}
        </p>
        <p>
          Supertiles High:{" "}
          {hedr ? hedr.mapHeight / globals.TILES_PER_SUPERTILE : 0}
        </p>
        <p>Unique Supertiles {hedr?.numUniqueSupertiles || 0}</p>

        <p>Current Tile: #{selectedTile}</p>
        <p>
          Texture ID:{" "}
          {terrainData.STgd[1000].obj[selectedTile]?.superTileId || 0}
        </p>
        
        <div className="border-t pt-4 mt-4">
          <p className="font-semibold mb-2">Row Operations</p>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAddRow(Side.TOP)}
            >
              + Top
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAddRow(Side.BOTTOM)}
            >
              + Bottom
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-3">
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleRemoveRow(Side.TOP)}
              disabled={(hedr?.mapHeight || 0) / globals.TILES_PER_SUPERTILE <= 1}
            >
              - Top
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleRemoveRow(Side.BOTTOM)}
              disabled={(hedr?.mapHeight || 0) / globals.TILES_PER_SUPERTILE <= 1}
            >
              - Bottom
            </Button>
          </div>
          
          <p className="font-semibold mb-2">Column Operations</p>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAddColumn(Side.LEFT)}
            >
              + Left
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAddColumn(Side.RIGHT)}
            >
              + Right
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleRemoveColumn(Side.LEFT)}
              disabled={(hedr?.mapWidth || 0) / globals.TILES_PER_SUPERTILE <= 1}
            >
              - Left
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleRemoveColumn(Side.RIGHT)}
              disabled={(hedr?.mapWidth || 0) / globals.TILES_PER_SUPERTILE <= 1}
            >
              - Right
            </Button>
          </div>
        </div>
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
