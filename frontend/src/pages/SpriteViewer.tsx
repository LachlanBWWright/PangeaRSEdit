import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
  parseShapesFile,
  shapeFrameToCanvas,
  ShapesFile,
} from "@/parsers/mightyMikeShapesParser";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { isErr } from "@/types/result";
import { FileUploadPanel } from "./SpriteViewer/components/FileUploadPanel";
import { MightyMikeAssetBrowser } from "./SpriteViewer/components/MightyMikeAssetBrowser";
import { SpriteControls } from "./SpriteViewer/components/SpriteControls";
import { DisplayOptionsPanel, DisplayOptions } from "./SpriteViewer/components/DisplayOptionsPanel";
import { PaletteSelector } from "./SpriteViewer/components/PaletteSelector";
import { PaletteEditor } from "./SpriteViewer/components/PaletteEditor";
import { createPalette, clonePalette, Palette } from "./SpriteViewer/utils/paletteUtils";

type FileType = "sprites" | "tga" | "tileset";

type SpriteData = {
  type: "sprites";
  data: ShapesFile;
  filename: string;
};

type TGAData = {
  type: "tga";
  data: HTMLCanvasElement;
  filename: string;
};

type TilesetData = {
  type: "tileset";
  data: HTMLCanvasElement;
  filename: string;
};

type LoadedData = SpriteData | TGAData | TilesetData | null;

export function SpriteViewer() {
  // File loading state
  const [loadedData, setLoadedData] = useState<LoadedData>(null);
  const [loading, setLoading] = useState(false);

  // Upload panel state
  const [uploadFileType, setUploadFileType] = useState<FileType>("sprites");

  // Asset browser state
  const [assetFileType, setAssetFileType] = useState<FileType>("sprites");

  // Sprite-specific state
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);

  // Palette state
  const [customPalettes, setCustomPalettes] = useState<Palette[]>([]);
  const [currentPalette, setCurrentPalette] = useState<Palette>(
    createPalette("Default"),
  );
  const [showPaletteEditor, setShowPaletteEditor] = useState(false);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    zoomLevel: 1,
    showGrid: false,
    showBounds: false,
    backgroundColor: "#1a1a2e",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ===== File Loading Handlers =====

  const handleCustomFileUpload = async (file: File, fileType: FileType) => {
    const filename = file.name.toLowerCase();

    if (fileType === "sprites" && !filename.endsWith(".shapes")) {
      toast.error("Please select a .shapes file");
      return;
    }
    if (fileType === "tga" && !filename.endsWith(".tga")) {
      toast.error("Please select a .tga file");
      return;
    }
    if (fileType === "tileset" && !filename.endsWith(".tileset")) {
      toast.error("Please select a .tileset file");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();

      if (fileType === "sprites") {
        const result = parseShapesFile(buffer);
        if (isErr(result)) {
          toast.error(`Failed to parse: ${result.error.message}`);
          return;
        }
        setLoadedData({
          type: "sprites",
          data: result.value,
          filename: file.name,
        });
        setSelectedShapeIndex(0);
        setSelectedFrameIndex(0);
        toast.success(`Loaded: ${result.value.shapes.length} shapes`);
      } else if (fileType === "tga") {
        const result = parseTGAToCanvas(buffer);
        if (isErr(result)) {
          toast.error(`Failed to parse: ${result.error.message}`);
          return;
        }
        setLoadedData({
          type: "tga",
          data: result.value,
          filename: file.name,
        });
        toast.success("Loaded TGA image");
      } else if (fileType === "tileset") {
        const canvas = createTilesetPreview(file.name, buffer.byteLength);
        setLoadedData({
          type: "tileset",
          data: canvas,
          filename: file.name,
        });
        toast.success("Loaded tileset file");
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load file",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSpritesFile = async (filename: string) => {
    setLoading(true);
    try {
      const url = `data/mightymike/shapes/${filename}.shapes`;
      const response = await fetch(url);

      if (!response.ok) {
        toast.error(`Failed to load sprites: ${response.statusText}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const result = parseShapesFile(buffer);

      if (isErr(result)) {
        toast.error(`Failed to parse shapes file: ${result.error.message}`);
        return;
      }

      setLoadedData({
        type: "sprites",
        data: result.value,
        filename,
      });
      setSelectedShapeIndex(0);
      setSelectedFrameIndex(0);
      toast.success(`Loaded ${filename}: ${result.value.shapes.length} shapes`);
    } catch (error) {
      console.error("Error loading sprites:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load sprites file",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTGAFile = async (filename: string) => {
    setLoading(true);
    try {
      const url = `assets/mightyMike/terrain/${filename}.tga`;
      const response = await fetch(url);

      if (!response.ok) {
        toast.error(`Failed to load TGA: ${response.statusText}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const result = parseTGAToCanvas(buffer);

      if (isErr(result)) {
        toast.error(`Failed to parse TGA file: ${result.error.message}`);
        return;
      }

      setLoadedData({
        type: "tga",
        data: result.value,
        filename,
      });
      toast.success(`Loaded TGA: ${filename}`);
    } catch (error) {
      console.error("Error loading TGA:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load TGA file",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTilesetFile = async (filename: string) => {
    setLoading(true);
    try {
      const url = `assets/mightyMike/terrain/${filename}.tileset`;
      const response = await fetch(url);

      if (!response.ok) {
        toast.error(`Failed to load tileset: ${response.statusText}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const canvas = createTilesetPreview(filename, buffer.byteLength);

      setLoadedData({
        type: "tileset",
        data: canvas,
        filename,
      });
      toast.success(`Loaded tileset: ${filename}`);
    } catch (error) {
      console.error("Error loading tileset:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load tileset file",
      );
    } finally {
      setLoading(false);
    }
  };

  // ===== Rendering =====

  const renderSprites = () => {
    if (loadedData?.type !== "sprites" || !canvasRef.current) return;

    const shapesFile = loadedData.data;
    const shape = shapesFile.shapes[selectedShapeIndex];
    if (!shape) return;

    const frame = shape.frames[selectedFrameIndex];
    if (!frame) return;

    const sourceCanvasResult = shapeFrameToCanvas(frame, currentPalette.colors);
    if (isErr(sourceCanvasResult)) {
      toast.error("Failed to render frame");
      return;
    }

    const sourceCanvas = sourceCanvasResult.value;
    const displayCanvas = canvasRef.current;
    const scaledWidth = sourceCanvas.width * displayOptions.zoomLevel;
    const scaledHeight = sourceCanvas.height * displayOptions.zoomLevel;

    displayCanvas.width = Math.max(scaledWidth + 20, 100);
    displayCanvas.height = Math.max(scaledHeight + 20, 100);

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = displayOptions.backgroundColor;
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);

    // Grid
    if (displayOptions.showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      const gridSize = 10 * displayOptions.zoomLevel;
      for (let x = 0; x < displayCanvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayCanvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < displayCanvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(displayCanvas.width, y);
        ctx.stroke();
      }
    }

    // Sprite
    const offsetX = 10 + frame.header.offsetX * displayOptions.zoomLevel;
    const offsetY = 10 + frame.header.offsetY * displayOptions.zoomLevel;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

    // Bounds
    if (displayOptions.showBounds) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX, offsetY, scaledWidth, scaledHeight);
    }

    // Origin marker
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(10 - 2, 10 - 2, 4, 4);
  };

  const renderTGAOrTileset = () => {
    if (
      (loadedData?.type !== "tga" && loadedData?.type !== "tileset") ||
      !canvasRef.current
    )
      return;

    const sourceCanvas = loadedData.data;
    const displayCanvas = canvasRef.current;
    const scaledWidth = sourceCanvas.width * displayOptions.zoomLevel;
    const scaledHeight = sourceCanvas.height * displayOptions.zoomLevel;

    displayCanvas.width = Math.max(scaledWidth, 100);
    displayCanvas.height = Math.max(scaledHeight, 100);

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = displayOptions.backgroundColor;
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0, scaledWidth, scaledHeight);
  };

  // Render on changes
  useEffect(() => {
    if (loadedData && canvasRef.current) {
      if (loadedData.type === "sprites") {
        renderSprites();
      } else {
        renderTGAOrTileset();
      }
    }
  }, [loadedData, selectedShapeIndex, selectedFrameIndex, displayOptions, currentPalette]);

  // ===== Export =====

  const handleDownloadFrame = () => {
    if (!canvasRef.current) {
      toast.error("No frame to download");
      return;
    }
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `shape_${selectedShapeIndex}_frame_${selectedFrameIndex}.png`;
    link.click();
    toast.success("Frame downloaded");
  };

  const handleDownloadAllFrames = () => {
    if (loadedData?.type !== "sprites") {
      toast.error("Only available for sprites");
      return;
    }

    const currentShape = loadedData.data.shapes[selectedShapeIndex];
    if (!currentShape) {
      toast.error("No shape selected");
      return;
    }

    toast.info("Downloading frames...");
    currentShape.frames.forEach((frame, frameIdx) => {
      const frameCanvasResult = shapeFrameToCanvas(
        frame,
        currentPalette.colors,
      );
      if (!isErr(frameCanvasResult)) {
        const link = document.createElement("a");
        link.href = frameCanvasResult.value.toDataURL("image/png");
        link.download = `shape_${selectedShapeIndex}_frame_${frameIdx}.png`;
        setTimeout(() => link.click(), frameIdx * 200);
      }
    });
  };

  return (
    <>
      <div className="h-full flex gap-4 p-4 bg-gray-900 text-white">
        {/* Left sidebar - Controls */}
        <div className="flex flex-col w-96 space-y-4 px-2 overflow-y-auto">
          {/* File Upload Panel */}
          <FileUploadPanel
            selectedType={uploadFileType}
            onTypeChange={setUploadFileType}
            onFileSelected={handleCustomFileUpload}
            loading={loading}
          />

          {/* Mighty Mike Asset Browser */}
          <MightyMikeAssetBrowser
            selectedType={assetFileType}
            onTypeChange={setAssetFileType}
            onAssetSelect={(filename) => {
              if (assetFileType === "sprites") {
                handleLoadSpritesFile(filename);
              } else if (assetFileType === "tga") {
                handleLoadTGAFile(filename);
              } else if (assetFileType === "tileset") {
                handleLoadTilesetFile(filename);
              }
            }}
            loading={loading}
            loadedFilename={loadedData?.filename}
          />

          {/* Palette Components (only for sprites) */}
          {loadedData?.type === "sprites" && (
            <>
              <PaletteSelector
                palettes={customPalettes}
                currentPalette={currentPalette}
                onPaletteSelect={(palette) => {
                  setCurrentPalette(palette);
                  setShowPaletteEditor(false);
                }}
                onCreateNew={() => {
                  const newPalette = createPalette(`Custom ${customPalettes.length + 1}`);
                  setCustomPalettes([...customPalettes, newPalette]);
                  setCurrentPalette(newPalette);
                  setShowPaletteEditor(true);
                }}
              />

              {showPaletteEditor && (
                <PaletteEditor
                  palette={currentPalette}
                  onPaletteChange={(updated) => {
                    setCurrentPalette(updated);
                    // Update in custom palettes list if it exists there
                    const idx = customPalettes.findIndex(
                      (p) => p.name === updated.name,
                    );
                    if (idx >= 0) {
                      const newPalettes = [...customPalettes];
                      newPalettes[idx] = updated;
                      setCustomPalettes(newPalettes);
                    }
                  }}
                  onSaveAsNew={(palette) => {
                    const newPalette = clonePalette(palette);
                    newPalette.name = `${palette.name} Copy`;
                    setCustomPalettes([...customPalettes, newPalette]);
                    setCurrentPalette(newPalette);
                  }}
                />
              )}
            </>
          )}

          {/* Sprite Controls (only for sprites) */}
          {loadedData?.type === "sprites" && (
            <SpriteControls
              shapesFile={loadedData.data}
              selectedShapeIndex={selectedShapeIndex}
              selectedFrameIndex={selectedFrameIndex}
              onShapeChange={(idx) => {
                setSelectedShapeIndex(idx);
                setSelectedFrameIndex(0);
              }}
              onFrameChange={setSelectedFrameIndex}
            />
          )}

          {/* Display Options */}
          {loadedData && (
            <DisplayOptionsPanel
              options={displayOptions}
              onOptionsChange={setDisplayOptions}
              showSpriteOptions={loadedData.type === "sprites"}
            />
          )}

          {/* Export Options (only for sprites) */}
          {loadedData?.type === "sprites" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={handleDownloadFrame}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Frame
              </Button>
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={handleDownloadAllFrames}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All Frames
              </Button>
            </div>
          )}
        </div>

        {/* Main viewport - Content Display */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0 flex flex-col">
          {loadedData ? (
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                  <Maximize2 className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No Content Loaded
                </h3>
                <p className="text-sm">
                  Load a file to view sprites, images, or tilesets
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper function to create tileset preview canvas
function createTilesetPreview(filename: string, byteLength: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px monospace";
  ctx.fillText(`Tileset: ${filename}`, 10, 30);
  ctx.fillText(`Size: ${(byteLength / 1024).toFixed(2)} KB`, 10, 60);
  ctx.fillText(`Format: Binary tileset data`, 10, 90);
  ctx.fillStyle = "#888888";
  ctx.font = "12px monospace";
  ctx.fillText("Tileset preview not yet implemented", 10, 130);

  return canvas;
}
