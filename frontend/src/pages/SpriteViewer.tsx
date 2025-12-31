import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
  parseShapesFile,
  shapeFrameToCanvas,
  ShapesFile,
} from "@/parsers/mightyMikeShapesParser";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import {
  parseTilesetFile,
  createTilesetGridPreview,
  rerenderTilesetWithPalette,
  RGBColor,
} from "@/parsers/mightyMikeTilesetParser";
import { isErr } from "@/types/result";
import { FileUploadPanel } from "./SpriteViewer/components/FileUploadPanel";
import { MightyMikeAssetBrowser } from "./SpriteViewer/components/MightyMikeAssetBrowser";
import { SpriteControls } from "./SpriteViewer/components/SpriteControls";
import {
  DisplayOptionsPanel,
  DisplayOptions,
} from "./SpriteViewer/components/DisplayOptionsPanel";
import { PaletteSelector } from "./SpriteViewer/components/PaletteSelector";
import { PaletteEditor } from "./SpriteViewer/components/PaletteEditor";
import {
  createPalette,
  clonePalette,
  Palette,
} from "./SpriteViewer/utils/paletteUtils";
import { TilesetEditor } from "./SpriteViewer/components/TilesetEditor";
import { MightyMikeTileset } from "@/parsers/mightyMikeTilesetParser";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";

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
  data: MightyMikeTileset;
  gridCanvas: HTMLCanvasElement;
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

  // Tileset-specific state
  const [selectedTileIndex, setSelectedTileIndex] = useState<
    number | undefined
  >(undefined);
  const [currentTilesetScene, setCurrentTilesetScene] =
    useState<string>("jurassic");
  const [currentTilesetPaletteScene, setCurrentTilesetPaletteScene] =
    useState<string>("jurassic");

  // Palette state
  const [customPalettes, setCustomPalettes] = useState<Palette[]>([]);
  const [currentPalette, setCurrentPalette] = useState<Palette>(() => {
    // Initialize with grayscale palette (matching shapes parser default)
    const grayscalePalette = createPalette("Default Grayscale");
    for (let i = 0; i < 256; i++) {
      const gray = Math.floor((i / 256) * 255);
      grayscalePalette.colors[i] = { r: gray, g: gray, b: gray };
    }
    return grayscalePalette;
  });
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
        toast.success(
          "Loaded: " + String(result.value.shapes.length) + " shapes",
        );
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
        toast.info(
          "Custom tileset upload not yet fully supported. Use the asset browser to load tilesets.",
        );
        return;
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
      toast.success(
        "Loaded " +
          filename +
          ": " +
          String(result.value.shapes.length) +
          " shapes",
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
      // Map scene names to TGA files
      const sceneToTga: { [key: string]: string } = {
        bargain: "bargainscene",
        candy: "candyscene",
        clown: "clownscene",
        fairy: "fairyscene",
        jurassic: "dinoscene",
      };

      const tgaName = sceneToTga[filename] || filename;

      // Load TGA for palette
      const tgaUrl = `assets/mightyMike/terrain/${tgaName}.tga`;
      const tgaResponse = await fetch(tgaUrl);

      if (!tgaResponse.ok) {
        toast.error(
          `Failed to load palette from TGA: ${tgaResponse.statusText}`,
        );
        return;
      }

      const tgaBuffer = await tgaResponse.arrayBuffer();
      const tgaCanvasResult = parseTGAToCanvas(tgaBuffer);

      if (isErr(tgaCanvasResult)) {
        toast.error(
          `Failed to parse TGA file: ${tgaCanvasResult.error.message}`,
        );
        return;
      }

      // Extract palette from TGA buffer and apply proper gamma correction
      // using MightyMikePaletteManager which matches the C source code
      const tgaView = new DataView(tgaBuffer);

      // Parse TGA header to find color map
      const idLength = tgaView.getUint8(0);
      const colorMapType = tgaView.getUint8(1);
      const colorMapOrigin = tgaView.getUint16(3, true); // Little-endian
      const colorMapLength = tgaView.getUint16(5, true); // Little-endian
      const colorMapDepth = tgaView.getUint8(7); // Bits per color
      const colorMapBytesPerEntry = colorMapDepth / 8;

      console.log("[TGA Palette] Header info:", {
        idLength,
        colorMapType,
        colorMapOrigin,
        colorMapLength,
        colorMapDepth,
        colorMapBytesPerEntry,
        tgaBufferSize: tgaBuffer.byteLength,
        expectedColorMapOffset: 18 + idLength,
      });

      const palette: RGBColor[] = [];

      if (colorMapType === 1 && colorMapLength >= 256) {
        // Color map exists, extract it as RGBA for palette manager
        const colorMapOffset = 18 + idLength;

        console.log(
          "[TGA Palette] Extracting 256 colors from offset",
          colorMapOffset,
        );

        // Build RGBA array for palette manager
        const rgbaData = new Uint8Array(1024); // 256 colors × 4 bytes
        for (let i = 0; i < 256; i++) {
          const entryOffset = colorMapOffset + i * colorMapBytesPerEntry;

          // TGA color map is stored as BGR(A)
          const b = tgaView.getUint8(entryOffset);
          const g = tgaView.getUint8(entryOffset + 1);
          const r = tgaView.getUint8(entryOffset + 2);
          const a = 255; // Opaque

          rgbaData[i * 4 + 0] = r;
          rgbaData[i * 4 + 1] = g;
          rgbaData[i * 4 + 2] = b;
          rgbaData[i * 4 + 3] = a;

          palette.push({ r, g, b });

          // Log first few and last few colors for debugging
          if (i < 3 || i >= 253) {
            console.log(
              "[TGA Palette] Color " +
                String(i) +
                ": RGB(" +
                String(r) +
                ", " +
                String(g) +
                ", " +
                String(b) +
                ") from offset " +
                String(entryOffset),
            );
          }
        }

        // Load palette into MightyMikePaletteManager for gamma correction
        gMightyMikePalette.loadPaletteFromRGBA(rgbaData);

        console.log(
          "[TGA Palette] Successfully extracted and gamma-corrected palette",
        );
      } else {
        console.error("[TGA Palette] Invalid color map:", {
          colorMapType,
          colorMapLength,
          expected: "colorMapType === 1 && colorMapLength >= 256",
        });
        toast.error("TGA file does not have a valid color map");
        return;
      }

      // Load and parse tileset with gamma-corrected palette
      const tilesetUrl = `assets/mightyMike/terrain/${filename}.tileset`;
      const tilesetResponse = await fetch(tilesetUrl);

      if (!tilesetResponse.ok) {
        toast.error(`Failed to load tileset: ${tilesetResponse.statusText}`);
        return;
      }

      const tilesetBuffer = await tilesetResponse.arrayBuffer();

      // Use the gamma-corrected palette from MightyMikePaletteManager for tileset rendering
      const tilesetPaletteRGBA = gMightyMikePalette.getPaletteAsRGBA();
      const tilsetPalette: RGBColor[] = [];
      for (let i = 0; i < 256; i++) {
        const offset = i * 4;
        tilsetPalette.push({
          r: tilesetPaletteRGBA[offset] ?? 0,
          g: tilesetPaletteRGBA[offset + 1] ?? 0,
          b: tilesetPaletteRGBA[offset + 2] ?? 0,
        });
      }

      const tilesetResult = parseTilesetFile(tilesetBuffer, tilsetPalette);

      if (isErr(tilesetResult)) {
        toast.error(`Failed to parse tileset: ${tilesetResult.error.message}`);
        return;
      }

      // Create grid preview of all tiles
      const tileset = tilesetResult.value;
      const gridCanvas = createTilesetGridPreview(tileset);

      setLoadedData({
        type: "tileset",
        data: tileset,
        gridCanvas,
        filename,
      });
      setSelectedTileIndex(undefined);
      setCurrentTilesetScene(filename);
      setCurrentTilesetPaletteScene(filename);

      // Apply tileset's gamma-corrected palette to current palette for shape rendering
      // We already have it from the palette manager
      const tilsetPaletteColors: typeof currentPalette.colors = [];
      const gammaCorrectectedRGBA = gMightyMikePalette.getPaletteAsRGBA();
      for (let i = 0; i < 256; i++) {
        const offset = i * 4;
        tilsetPaletteColors.push({
          r: gammaCorrectectedRGBA[offset] ?? 0,
          g: gammaCorrectectedRGBA[offset + 1] ?? 0,
          b: gammaCorrectectedRGBA[offset + 2] ?? 0,
        });
      }

      const paletteWithScene = createPalette(
        `${filename} Scene Palette (Gamma-Corrected)`,
      );
      paletteWithScene.colors = tilsetPaletteColors;
      setCurrentPalette(paletteWithScene);

      toast.success(
        "Loaded tileset: " +
          filename +
          " (" +
          String(tileset.numTileDefinitions) +
          " tiles)",
      );
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

  const renderSprites = useCallback(() => {
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
  }, [
    loadedData,
    selectedShapeIndex,
    selectedFrameIndex,
    currentPalette.colors,
    displayOptions,
  ]);

  const renderTGAOrTileset = useCallback(() => {
    if (!canvasRef.current) return;

    let sourceCanvas: HTMLCanvasElement;

    if (loadedData?.type === "tga") {
      sourceCanvas = loadedData.data;
    } else if (loadedData?.type === "tileset") {
      // If a tile is selected, show that tile; otherwise show grid preview
      if (
        selectedTileIndex !== undefined &&
        selectedTileIndex >= 0 &&
        selectedTileIndex < loadedData.data.tileImages.length
      ) {
        const tileCanvas = loadedData.data.tileImages[selectedTileIndex];
        sourceCanvas = tileCanvas || loadedData.gridCanvas;
      } else {
        sourceCanvas = loadedData.gridCanvas;
      }
    } else {
      return;
    }

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
  }, [loadedData, selectedTileIndex, displayOptions]);

  // Render on changes
  useEffect(() => {
    if (loadedData && canvasRef.current) {
      if (loadedData.type === "sprites") {
        renderSprites();
      } else {
        renderTGAOrTileset();
      }
    }
  }, [
    loadedData,
    selectedShapeIndex,
    selectedFrameIndex,
    displayOptions,
    currentPalette,
    selectedTileIndex,
    renderSprites,
    renderTGAOrTileset,
  ]);

  // ===== Export =====

  const handleDownloadFrame = () => {
    if (!canvasRef.current) {
      toast.error("No frame to download");
      return;
    }
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download =
      "shape_" +
      String(selectedShapeIndex) +
      "_frame_" +
      String(selectedFrameIndex) +
      ".png";
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
        link.download =
          "shape_" +
          String(selectedShapeIndex) +
          "_frame_" +
          String(frameIdx) +
          ".png";
        setTimeout(() => {
          link.click();
        }, frameIdx * 200);
      }
    });
  };

  const handleDownloadTile = () => {
    if (loadedData?.type !== "tileset" || selectedTileIndex === undefined) {
      toast.error("No tile selected");
      return;
    }

    const tileCanvas = loadedData.data.tileImages[selectedTileIndex];
    if (!tileCanvas) {
      toast.error("Tile not found");
      return;
    }

    const link = document.createElement("a");
    link.href = tileCanvas.toDataURL("image/png");
    link.download = "tile_" + String(selectedTileIndex) + ".png";
    link.click();
    toast.success("Tile downloaded");
  };

  const handleDownloadTileset = () => {
    if (loadedData?.type !== "tileset" || !loadedData.gridCanvas) {
      toast.error("No tileset loaded");
      return;
    }

    const link = document.createElement("a");
    link.href = loadedData.gridCanvas.toDataURL("image/png");
    link.download = `tileset_${loadedData.filename}.png`;
    link.click();
    toast.success("Tileset downloaded");
  };

  const handleDownloadAllTiles = () => {
    if (loadedData?.type !== "tileset") {
      toast.error("No tileset loaded");
      return;
    }

    const tileset = loadedData.data;
    toast.info(
      "Downloading " + String(tileset.numTileDefinitions) + " tiles...",
    );

    tileset.tileImages.forEach((tileCanvas, tileIdx) => {
      const link = document.createElement("a");
      link.href = tileCanvas.toDataURL("image/png");
      link.download = "tile_" + String(tileIdx) + ".png";
      setTimeout(() => {
        link.click();
      }, tileIdx * 100);
    });

    toast.success("Tile download started");
  };

  const handlePaletteSelect = async (palette: Palette) => {
    // If it's a predefined palette (scene name), load the actual palette from the TGA
    const sceneNames = ["candy", "bargain", "clown", "fairy", "jurassic"];
    const sceneName = sceneNames.find(
      (name) => palette.name.toLowerCase() === name.toLowerCase(),
    );

    if (sceneName) {
      // Load the actual palette from the TGA file
      const sceneToTga: { [key: string]: string } = {
        bargain: "bargainscene",
        candy: "candyscene",
        clown: "clownscene",
        fairy: "fairyscene",
        jurassic: "dinoscene",
      };

      const tgaName = sceneToTga[sceneName] || sceneName;
      const tgaUrl = `assets/mightyMike/terrain/${tgaName}.tga`;

      try {
        const response = await fetch(tgaUrl);
        if (!response.ok) {
          toast.error(`Failed to load palette for ${palette.name}`);
          return;
        }

        const buffer = await response.arrayBuffer();
        const tgaView = new DataView(buffer);

        // Parse TGA header
        const idLength = tgaView.getUint8(0);
        const colorMapType = tgaView.getUint8(1);
        const colorMapLength = tgaView.getUint16(5, true);
        const colorMapDepth = tgaView.getUint8(7);
        const colorMapBytesPerEntry = colorMapDepth / 8;

        if (colorMapType === 1 && colorMapLength >= 256) {
          const colorMapOffset = 18 + idLength;

          // Build RGBA array for palette manager
          const rgbaData = new Uint8Array(1024);
          for (let i = 0; i < 256; i++) {
            const entryOffset = colorMapOffset + i * colorMapBytesPerEntry;
            const b = tgaView.getUint8(entryOffset);
            const g = tgaView.getUint8(entryOffset + 1);
            const r = tgaView.getUint8(entryOffset + 2);
            const a = 255;

            rgbaData[i * 4 + 0] = r;
            rgbaData[i * 4 + 1] = g;
            rgbaData[i * 4 + 2] = b;
            rgbaData[i * 4 + 3] = a;
          }

          // Load into palette manager
          gMightyMikePalette.loadPaletteFromRGBA(rgbaData);

          // Get gamma-corrected palette
          const gammaCorrectectedRGBA = gMightyMikePalette.getPaletteAsRGBA();
          const paletteColors: typeof palette.colors = [];
          for (let i = 0; i < 256; i++) {
            const offset = i * 4;
            paletteColors.push({
              r: gammaCorrectectedRGBA[offset] ?? 0,
              g: gammaCorrectectedRGBA[offset + 1] ?? 0,
              b: gammaCorrectectedRGBA[offset + 2] ?? 0,
            });
          }

          const loadedPalette = createPalette(palette.name);
          loadedPalette.colors = paletteColors;
          setCurrentPalette(loadedPalette);
          toast.success(`Loaded ${palette.name} palette`);
        } else {
          toast.error("Invalid TGA palette format");
        }
      } catch (error) {
        console.error("Error loading palette:", error);
        toast.error("Failed to load palette");
      }
    } else {
      // Custom palette - just set it
      setCurrentPalette(palette);
    }
  };

  const handleTilesetPaletteSceneChange = async (sceneName: string) => {
    setCurrentTilesetPaletteScene(sceneName);

    // Load the palette from the TGA file without changing the tileset
    const sceneToTga: { [key: string]: string } = {
      bargain: "bargainscene",
      candy: "candyscene",
      clown: "clownscene",
      fairy: "fairyscene",
      jurassic: "dinoscene",
    };

    const tgaName = sceneToTga[sceneName] || sceneName;
    const tgaUrl = `assets/mightyMike/terrain/${tgaName}.tga`;

    try {
      const response = await fetch(tgaUrl);
      if (!response.ok) {
        toast.error(`Failed to load palette for ${sceneName}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const tgaView = new DataView(buffer);

      // Parse TGA header
      const idLength = tgaView.getUint8(0);
      const colorMapType = tgaView.getUint8(1);
      const colorMapLength = tgaView.getUint16(5, true);
      const colorMapDepth = tgaView.getUint8(7);
      const colorMapBytesPerEntry = colorMapDepth / 8;

      if (colorMapType === 1 && colorMapLength >= 256) {
        const colorMapOffset = 18 + idLength;

        // Build RGBA array for palette manager
        const rgbaData = new Uint8Array(1024);
        for (let i = 0; i < 256; i++) {
          const entryOffset = colorMapOffset + i * colorMapBytesPerEntry;
          const b = tgaView.getUint8(entryOffset);
          const g = tgaView.getUint8(entryOffset + 1);
          const r = tgaView.getUint8(entryOffset + 2);
          const a = 255;

          rgbaData[i * 4 + 0] = r;
          rgbaData[i * 4 + 1] = g;
          rgbaData[i * 4 + 2] = b;
          rgbaData[i * 4 + 3] = a;
        }

        // Load into palette manager
        gMightyMikePalette.loadPaletteFromRGBA(rgbaData);

        // Get gamma-corrected palette
        const gammaCorrectectedRGBA = gMightyMikePalette.getPaletteAsRGBA();
        const paletteColors: typeof currentPalette.colors = [];
        for (let i = 0; i < 256; i++) {
          const offset = i * 4;
          paletteColors.push({
            r: gammaCorrectectedRGBA[offset] ?? 0,
            g: gammaCorrectectedRGBA[offset + 1] ?? 0,
            b: gammaCorrectectedRGBA[offset + 2] ?? 0,
          });
        }

        const loadedPalette = createPalette(`${sceneName} Palette (Mixed)`);
        loadedPalette.colors = paletteColors;
        setCurrentPalette(loadedPalette);

        // Re-render the tileset with the new palette
        if (loadedData?.type === "tileset") {
          const newTileImages = rerenderTilesetWithPalette(
            loadedData.data,
            paletteColors,
          );
          const newGridCanvas = createTilesetGridPreview({
            ...loadedData.data,
            tileImages: newTileImages,
          });

          setLoadedData({
            ...loadedData,
            data: {
              ...loadedData.data,
              tileImages: newTileImages,
            },
            gridCanvas: newGridCanvas,
          });
        }

        toast.success(`Applied ${sceneName} palette to tileset`);
      } else {
        toast.error("Invalid TGA palette format");
      }
    } catch (error) {
      console.error("Error loading tileset palette:", error);
      toast.error("Failed to load palette");
    }
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
                void handleLoadSpritesFile(filename);
              } else if (assetFileType === "tga") {
                void handleLoadTGAFile(filename);
              } else if (assetFileType === "tileset") {
                void handleLoadTilesetFile(filename);
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
                  handlePaletteSelect(palette);
                  setShowPaletteEditor(false);
                }}
                onCreateNew={() => {
                  const newPalette = createPalette(
                    "Custom " + String(customPalettes.length + 1),
                  );
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

          {/* Tileset Editor (only for tilesets) */}
          {loadedData?.type === "tileset" && (
            <TilesetEditor
              tileCount={loadedData.data.numTileDefinitions}
              selectedTileIndex={selectedTileIndex}
              onSelectTile={setSelectedTileIndex}
              currentTilesetScene={currentTilesetScene}
              currentPaletteScene={currentTilesetPaletteScene}
              onPaletteSceneChange={handleTilesetPaletteSceneChange}
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

          {/* Export Options (only for tilesets) */}
          {loadedData?.type === "tileset" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={handleDownloadTile}
                disabled={selectedTileIndex === undefined}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Tile
              </Button>
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={handleDownloadTileset}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Tileset
              </Button>
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={handleDownloadAllTiles}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All Tiles
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
