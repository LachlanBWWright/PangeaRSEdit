import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseShapesFile,
  shapeFrameToCanvas,
  ShapesFile,
} from "@/parsers/mightyMikeShapesParser";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { isErr } from "@/types/result";

type FileType = "sprites" | "tga" | "tileset";

// Sprites files
const AVAILABLE_SPRITES_FILES = [
  "bargain1",
  "bargain2",
  "bonus",
  "candy1",
  "candy2",
  "clown1",
  "clown2",
  "difficulty",
  "fairy1",
  "fairy2",
  "highscore",
  "infobar",
  "infobar2",
  "jurassic1",
  "jurassic2",
  "main",
  "overheadmap",
  "playerchoose",
  "title",
  "view",
  "weapon",
  "win",
];

// TGA files from terrain folder
const AVAILABLE_TGA_FILES = [
  "bargainscene",
  "candyscene",
  "clownscene",
  "dinoscene",
  "fairyscene",
];

// Tileset files from terrain folder
const AVAILABLE_TILESET_FILES = [
  "bargain",
  "candy",
  "clown",
  "fairy",
  "jurassic",
];

// Palette options for sprites
const AVAILABLE_PALETTES = [
  { value: "bargain", label: "Bargain" },
  { value: "candy", label: "Candy" },
  { value: "clown", label: "Clown" },
  { value: "fairy", label: "Fairy" },
  { value: "jurassic", label: "Jurassic" },
];

interface DisplayOptions {
  zoomLevel: number;
  showGrid: boolean;
  showBounds: boolean;
  backgroundColor: string;
}

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
  // Data loading
  const [loadedData, setLoadedData] = useState<LoadedData>(null);
  const [loading, setLoading] = useState(false);

  // For sprites only
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [selectedPalette, setSelectedPalette] = useState<string>("candy");

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    zoomLevel: 1,
    showGrid: false,
    showBounds: false,
    backgroundColor: "#1a1a2e",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== File Type Handlers =====

  const handleLoadSpritesFile = async (filename: string) => {
    setLoading(true);
    try {
      const url = `/PangeaRSEdit/data/mightymike/shapes/${filename}.shapes`;
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
      toast.success(
        `Loaded ${filename}: ${result.value.shapes.length} shapes`,
      );
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
      const url = `/assets/mightyMike/terrain/${filename}.tga`;
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
      const url = `/assets/mightyMike/terrain/${filename}.tileset`;
      const response = await fetch(url);

      if (!response.ok) {
        toast.error(`Failed to load tileset: ${response.statusText}`);
        return;
      }

      const buffer = await response.arrayBuffer();

      // Create a canvas showing tileset information
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Failed to create canvas");
        return;
      }

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      ctx.fillText(`Tileset: ${filename}`, 10, 30);
      ctx.fillText(`Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`, 10, 60);
      ctx.fillText(`Format: Binary tileset data`, 10, 90);
      ctx.fillStyle = "#888888";
      ctx.font = "12px monospace";
      ctx.fillText("Tileset preview not yet implemented", 10, 130);

      setLoadedData({
        type: "tileset",
        data: canvas,
        filename,
      });
      toast.success(`Loaded tileset: ${filename} (${buffer.byteLength} bytes)`);
    } catch (error) {
      console.error("Error loading tileset:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load tileset file",
      );
    } finally {
      setLoading(false);
    }
  };

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
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px monospace";
          ctx.fillText(`Tileset: ${file.name}`, 10, 30);
          ctx.fillText(`Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`, 10, 60);
        }
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

  const handleDrop = (e: React.DragEvent, fileType: FileType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleCustomFileUpload(file, fileType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ===== Rendering =====

  const renderSprites = () => {
    if (loadedData?.type !== "sprites" || !canvasRef.current) return;

    const shapesFile = loadedData.data;
    const shape = shapesFile.shapes[selectedShapeIndex];
    if (!shape) return;

    const frame = shape.frames[selectedFrameIndex];
    if (!frame) return;

    const sourceCanvasResult = shapeFrameToCanvas(frame, shapesFile.colorTable);
    if (isErr(sourceCanvasResult)) {
      toast.error("Failed to render frame");
      return;
    }

    const sourceCanvas = sourceCanvasResult.value;
    const displayCanvas = canvasRef.current;
    const scaledWidth = sourceCanvas.width * displayOptions.zoomLevel;
    const scaledHeight = sourceCanvas.height * displayOptions.zoomLevel;

    displayCanvas.width = Math.max(scaledWidth + 20, 300);
    displayCanvas.height = Math.max(scaledHeight + 20, 300);

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

    displayCanvas.width = Math.max(scaledWidth, 300);
    displayCanvas.height = Math.max(scaledHeight, 300);

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = displayOptions.backgroundColor;
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0, scaledWidth, scaledHeight);
  };

  // Render on changes
  if (loadedData && canvasRef.current) {
    if (loadedData.type === "sprites") {
      renderSprites();
    } else {
      renderTGAOrTileset();
    }
  }

  const currentShape =
    loadedData?.type === "sprites"
      ? loadedData.data.shapes[selectedShapeIndex]
      : null;
  const currentFrame = currentShape?.frames[selectedFrameIndex];

  return (
    <>
      <div className="h-full flex gap-4 p-4 bg-gray-900 text-white">
        {/* Left sidebar - Controls */}
        <div className="flex flex-col w-96 space-y-4 px-2 overflow-y-auto">
          {/* Upload Custom Files Panel */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  File Type
                </label>
                <select
                  id="upload-type"
                  className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
                >
                  <option value="sprites">Sprites (.shapes)</option>
                  <option value="tga">Images (.tga)</option>
                  <option value="tileset">Tilesets (.tileset)</option>
                </select>
              </div>

              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition"
                onDrop={(e) => {
                  const fileType = (
                    document.getElementById("upload-type") as HTMLSelectElement
                  )?.value as FileType;
                  handleDrop(e, fileType);
                }}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p className="text-xs text-gray-400">
                  Drag & drop or click to upload
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      const fileType = (
                        document.getElementById("upload-type") as HTMLSelectElement
                      )?.value as FileType;
                      handleCustomFileUpload(file, fileType);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {loading && (
                <p className="text-sm text-blue-400">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Mighty Mike Assets Panel */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                Mighty Mike Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Asset Type
                </label>
                <select
                  id="asset-type"
                  className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
                >
                  <option value="sprites">Sprites (.shapes)</option>
                  <option value="tga">Scene Images (.tga)</option>
                  <option value="tileset">Tilesets (.tileset)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Select Asset
                </label>
                <select
                  id="asset-file"
                  onChange={(e) => {
                    if (e.target.value) {
                      const assetType = (
                        document.getElementById("asset-type") as HTMLSelectElement
                      )?.value as FileType;
                      if (assetType === "sprites") {
                        handleLoadSpritesFile(e.target.value);
                      } else if (assetType === "tga") {
                        handleLoadTGAFile(e.target.value);
                      } else if (assetType === "tileset") {
                        handleLoadTilesetFile(e.target.value);
                      }
                      e.target.value = "";
                    }
                  }}
                  className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
                  disabled={loading}
                >
                  <option value="">Select a file...</option>
                  {(() => {
                    const assetType = (
                      document.getElementById("asset-type") as HTMLSelectElement
                    )?.value as FileType;
                    if (assetType === "sprites") {
                      return AVAILABLE_SPRITES_FILES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ));
                    } else if (assetType === "tga") {
                      return AVAILABLE_TGA_FILES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ));
                    } else {
                      return AVAILABLE_TILESET_FILES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ));
                    }
                  })()}
                </select>
              </div>

              {loading && (
                <p className="text-sm text-blue-400">Loading...</p>
              )}

              {loadedData && (
                <p className="text-xs text-gray-500 truncate">
                  Loaded: {loadedData.filename}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sprite Controls */}
          {loadedData?.type === "sprites" && (
            <>
              {/* Palette Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">
                    Palette
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedPalette}
                    onChange={(e) => setSelectedPalette(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
                  >
                    {AVAILABLE_PALETTES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Shape Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">
                    Shapes ({loadedData.data.shapes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedShapeIndex(
                          Math.max(0, selectedShapeIndex - 1),
                        )
                      }
                      disabled={selectedShapeIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-center">
                      <p className="text-sm font-semibold">
                        Shape {selectedShapeIndex + 1} /{" "}
                        {loadedData.data.shapes.length}
                      </p>
                      <p className="text-xs text-gray-400">
                        {currentShape?.frames.length ?? 0} frames
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedShapeIndex(
                          Math.min(
                            loadedData.data.shapes.length - 1,
                            selectedShapeIndex + 1,
                          ),
                        )
                      }
                      disabled={selectedShapeIndex >= loadedData.data.shapes.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <select
                    value={selectedShapeIndex}
                    onChange={(e) => {
                      setSelectedShapeIndex(parseInt(e.target.value));
                      setSelectedFrameIndex(0);
                    }}
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  >
                    {loadedData.data.shapes.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Shape {idx} ({loadedData.data.shapes[idx]?.frames.length ?? 0} frames)
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Frame Selection */}
              {currentShape && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">
                      Frames ({currentShape.frames.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedFrameIndex(
                            Math.max(0, selectedFrameIndex - 1),
                          )
                        }
                        disabled={selectedFrameIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="text-center">
                        <p className="text-sm font-semibold">
                          Frame {selectedFrameIndex + 1} /{" "}
                          {currentShape.frames.length}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedFrameIndex(
                            Math.min(
                              currentShape.frames.length - 1,
                              selectedFrameIndex + 1,
                            ),
                          )
                        }
                        disabled={selectedFrameIndex >= currentShape.frames.length - 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {currentFrame && (
                      <div className="bg-gray-700 rounded p-2 text-xs space-y-1">
                        <div>
                          <span className="text-gray-400">Size: </span>
                          <span>
                            {currentFrame.header.width}×
                            {currentFrame.header.height}px
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Offset: </span>
                          <span>
                            ({currentFrame.header.offsetX},{" "}
                            {currentFrame.header.offsetY})
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Display Options */}
          {loadedData && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Display Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Zoom: {displayOptions.zoomLevel.toFixed(1)}x
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDisplayOptions({
                          ...displayOptions,
                          zoomLevel: Math.max(0.5, displayOptions.zoomLevel - 0.5),
                        })
                      }
                    >
                      −
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDisplayOptions({
                          ...displayOptions,
                          zoomLevel: 1,
                        })
                      }
                    >
                      1x
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDisplayOptions({
                          ...displayOptions,
                          zoomLevel: 4,
                        })
                      }
                    >
                      4x
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDisplayOptions({
                          ...displayOptions,
                          zoomLevel: displayOptions.zoomLevel + 0.5,
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>

                {loadedData.type === "sprites" && (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displayOptions.showGrid}
                          onChange={(e) =>
                            setDisplayOptions({
                              ...displayOptions,
                              showGrid: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-gray-400">Show Grid</span>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displayOptions.showBounds}
                          onChange={(e) =>
                            setDisplayOptions({
                              ...displayOptions,
                              showBounds: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-gray-400">Show Bounds</span>
                      </label>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Background
                  </label>
                  <div className="flex gap-2">
                    {["#1a1a2e", "#000000", "#ffffff", "#ff00ff"].map(
                      (color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded border-2"
                          style={{
                            backgroundColor: color,
                            borderColor:
                              displayOptions.backgroundColor === color
                                ? "#00ff00"
                                : "transparent",
                          }}
                          onClick={() =>
                            setDisplayOptions({
                              ...displayOptions,
                              backgroundColor: color,
                            })
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          {loadedData?.type === "sprites" && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (!canvasRef.current) {
                      toast.error("No frame to download");
                      return;
                    }
                    const link = document.createElement("a");
                    link.href = canvasRef.current.toDataURL("image/png");
                    link.download = `shape_${selectedShapeIndex}_frame_${selectedFrameIndex}.png`;
                    link.click();
                    toast.success("Frame downloaded");
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Frame
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (!currentShape) {
                      toast.error("No shape selected");
                      return;
                    }

                    toast.info("Downloading frames...");
                    currentShape.frames.forEach((frame, frameIdx) => {
                      const frameCanvasResult = shapeFrameToCanvas(
                        frame,
                        loadedData.data.colorTable,
                      );
                      if (!isErr(frameCanvasResult)) {
                        const link = document.createElement("a");
                        link.href = frameCanvasResult.value.toDataURL("image/png");
                        link.download = `shape_${selectedShapeIndex}_frame_${frameIdx}.png`;
                        setTimeout(() => link.click(), frameIdx * 200);
                      }
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All Frames
                </Button>
              </CardContent>
            </Card>
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
