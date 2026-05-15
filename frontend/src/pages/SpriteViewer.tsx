import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Paintbrush,
  Eraser,
  Pipette,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseShapesFile,
  shapeFrameToCanvas,
  ShapesFile,
  ShapeFrame,
} from "@/parsers/mightyMikeShapesParser";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { extractTGAPaletteRaw } from "@/utils/tgaParser";
import {
  parseTilesetFile,
  createTilesetGridPreview,
  rerenderTilesetWithPalette,
  RGBColor,
} from "@/parsers/mightyMikeTilesetParser";
import { ResultAsync } from "neverthrow";

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
import {
  EditorField,
  EditorPanel,
} from "./SpriteViewer/components/EditorPanel";
import { MightyMikeTileset } from "@/parsers/mightyMikeTilesetParser";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { mapErr } from "@/utils/mapErr";

type FileType = "sprites" | "tga" | "tileset";
type EditMode = "view" | "paint" | "erase" | "eyedropper";

const CANVAS_PADDING = 40;

interface SpriteRenderParams {
  originX: number;
  originY: number;
  zoom: number;
  spriteOffsetX: number;
  spriteOffsetY: number;
  spriteW: number;
  spriteH: number;
}

interface SpriteData {
  type: "sprites";
  data: ShapesFile;
  filename: string;
}

interface TGAData {
  type: "tga";
  data: HTMLCanvasElement;
  filename: string;
}

interface TilesetData {
  type: "tileset";
  data: MightyMikeTileset;
  gridCanvas: HTMLCanvasElement;
  filename: string;
}

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

  // Edit/pan state
  const [editMode, setEditMode] = useState<EditMode>("view");
  const [selectedPaletteColorIndex, setSelectedPaletteColorIndex] =
    useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState(false);

  // Refs for imperative pan/paint tracking
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPaintingRef = useRef(false);
  const renderParamsRef = useRef<SpriteRenderParams | null>(null);

  const loadBorderPalette = useCallback(async () => {
    const url = "assets/mightyMike/terrain/border.tga";
    const fetchResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (fetchResult.isErr()) {
      console.error("Error loading border palette:", fetchResult.error);
      return null;
    }

    const response = fetchResult.value;
    if (!response.ok) {
      console.error(`Failed to load border palette: ${response.statusText}`);
      return null;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      console.error("Error reading border palette:", bufferResult.error);
      return null;
    }

    const paletteResult = extractTGAPaletteRaw(bufferResult.value);
    if (!paletteResult) {
      console.error("Invalid border palette format");
      return null;
    }

    return new Uint8Array(paletteResult.colors);
  }, []);

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
    const bufferResult = await ResultAsync.fromPromise(
      file.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      console.error("Error loading file:", bufferResult.error);
      toast.error(bufferResult.error);
      setLoading(false);
      return;
    }
    const buffer = bufferResult.value;

    if (fileType === "sprites") {
      const result = parseShapesFile(buffer);
      if (result.isErr()) {
        toast.error(`Failed to parse: ${result.error}`);
        setLoading(false);
        return;
      }
      setLoadedData({
        type: "sprites",
        data: result.value,
        filename: file.name,
      });
      setSelectedShapeIndex(0);
      setSelectedFrameIndex(0);
      const borderPaletteRGBA = await loadBorderPalette();
      if (borderPaletteRGBA) {
        gMightyMikePalette.loadPaletteFromRGBA(borderPaletteRGBA);
        const loadedPalette = createPalette("Border Palette");
        const paletteColors: typeof currentPalette.colors = [];
        const correctedRGBA = gMightyMikePalette.getPaletteAsRGBA();
        for (let i = 0; i < 256; i++) {
          const offset = i * 4;
          paletteColors.push({
            r: correctedRGBA[offset] ?? 0,
            g: correctedRGBA[offset + 1] ?? 0,
            b: correctedRGBA[offset + 2] ?? 0,
          });
        }
        loadedPalette.colors = paletteColors;
        setCurrentPalette(loadedPalette);
      }
      toast.success(`Loaded: ${result.value.shapes.length} shapes`);
    } else if (fileType === "tga") {
      const result = parseTGAToCanvas(buffer);
      if (result.isErr()) {
        toast.error(`Failed to parse: ${result.error}`);
        setLoading(false);
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
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const handleLoadSpritesFile = async (filename: string) => {
    setLoading(true);
    const url = `data/mightymike/shapes/${filename}.shapes`;
    const fetchResult = await ResultAsync.fromPromise(fetch(url), mapErr);

    if (fetchResult.isErr()) {
      console.error("Error loading sprites:", fetchResult.error);
      toast.error(fetchResult.error);
      setLoading(false);
      return;
    }

    const response = fetchResult.value;
    if (!response.ok) {
      toast.error(`Failed to load sprites: ${response.statusText}`);
      setLoading(false);
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      console.error("Error loading sprites:", bufferResult.error);
      toast.error(bufferResult.error);
      setLoading(false);
      return;
    }

    const buffer = bufferResult.value;
    const result = parseShapesFile(buffer);

    if (result.isErr()) {
      toast.error(`Failed to parse shapes file: ${result.error}`);
      setLoading(false);
      return;
    }

    setLoadedData({
      type: "sprites",
      data: result.value,
      filename,
    });
    setSelectedShapeIndex(0);
    setSelectedFrameIndex(0);
    const borderPaletteRGBA = await loadBorderPalette();
    if (borderPaletteRGBA) {
      gMightyMikePalette.loadPaletteFromRGBA(borderPaletteRGBA);
      const loadedPalette = createPalette("Border Palette");
      const paletteColors: typeof currentPalette.colors = [];
      const correctedRGBA = gMightyMikePalette.getPaletteAsRGBA();
      for (let i = 0; i < 256; i++) {
        const offset = i * 4;
        paletteColors.push({
          r: correctedRGBA[offset] ?? 0,
          g: correctedRGBA[offset + 1] ?? 0,
          b: correctedRGBA[offset + 2] ?? 0,
        });
      }
      loadedPalette.colors = paletteColors;
      setCurrentPalette(loadedPalette);
    }
    toast.success(`Loaded ${filename}: ${result.value.shapes.length} shapes`);
    setLoading(false);
  };

  const handleLoadTGAFile = async (filename: string) => {
    setLoading(true);
    const url = `assets/mightyMike/terrain/${filename}.tga`;
    const fetchResult = await ResultAsync.fromPromise(fetch(url), mapErr);

    if (fetchResult.isErr()) {
      console.error("Error loading TGA:", fetchResult.error);
      toast.error(fetchResult.error);
      setLoading(false);
      return;
    }

    const response = fetchResult.value;
    if (!response.ok) {
      toast.error(`Failed to load TGA: ${response.statusText}`);
      setLoading(false);
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      console.error("Error loading TGA:", bufferResult.error);
      toast.error(bufferResult.error);
      setLoading(false);
      return;
    }

    const buffer = bufferResult.value;
    const result = parseTGAToCanvas(buffer);

    if (result.isErr()) {
      toast.error(`Failed to parse TGA file: ${result.error}`);
      setLoading(false);
      return;
    }

    setLoadedData({
      type: "tga",
      data: result.value,
      filename,
    });
    toast.success(`Loaded TGA: ${filename}`);
    setLoading(false);
  };

  const handleLoadTilesetFile = async (filename: string) => {
    setLoading(true);

    // The game renders levels using the border.tga palette (set during
    // InitArea → LoadBorderImage), not the per-scene cinema TGA palettes.
    const tgaUrl = `assets/mightyMike/terrain/border.tga`;
    const tgaFetchResult = await ResultAsync.fromPromise(fetch(tgaUrl), mapErr);

    if (tgaFetchResult.isErr()) {
      console.error("Error loading tileset:", tgaFetchResult.error);
      toast.error(tgaFetchResult.error);
      setLoading(false);
      return;
    }

    const tgaResponse = tgaFetchResult.value;
    if (!tgaResponse.ok) {
      toast.error(`Failed to load palette from TGA: ${tgaResponse.statusText}`);
      setLoading(false);
      return;
    }

    const tgaBufferResult = await ResultAsync.fromPromise(
      tgaResponse.arrayBuffer(),
      mapErr,
    );
    if (tgaBufferResult.isErr()) {
      console.error("Error loading tileset:", tgaBufferResult.error);
      toast.error(tgaBufferResult.error);
      setLoading(false);
      return;
    }
    const tgaBuffer = tgaBufferResult.value;
    const tgaCanvasResult = parseTGAToCanvas(tgaBuffer);

    if (tgaCanvasResult.isErr()) {
      toast.error(`Failed to parse TGA file: ${tgaCanvasResult.error}`);
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
            `[TGA Palette] Color ${i}: RGB(${r}, ${g}, ${b}) from offset ${entryOffset}`,
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
    const tilesetFetchResult = await ResultAsync.fromPromise(
      fetch(tilesetUrl),
      mapErr,
    );

    if (tilesetFetchResult.isErr()) {
      console.error("Error loading tileset:", tilesetFetchResult.error);
      toast.error(tilesetFetchResult.error);
      setLoading(false);
      return;
    }

    const tilesetResponse = tilesetFetchResult.value;
    if (!tilesetResponse.ok) {
      toast.error(`Failed to load tileset: ${tilesetResponse.statusText}`);
      setLoading(false);
      return;
    }

    const tilesetBufferResult = await ResultAsync.fromPromise(
      tilesetResponse.arrayBuffer(),
      mapErr,
    );
    if (tilesetBufferResult.isErr()) {
      console.error("Error loading tileset:", tilesetBufferResult.error);
      toast.error(tilesetBufferResult.error);
      setLoading(false);
      return;
    }
    const tilesetBuffer = tilesetBufferResult.value;

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

    if (tilesetResult.isErr()) {
      toast.error(`Failed to parse tileset: ${tilesetResult.error}`);
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
      `Loaded tileset: ${filename} (${tileset.numTileDefinitions} tiles)`,
    );
    setLoading(false);
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
    if (sourceCanvasResult.isErr()) {
      toast.error("Failed to render frame");
      return;
    }

    const sourceCanvas = sourceCanvasResult.value;
    const zoom = displayOptions.zoomLevel;
    const spriteW = frame.header.width;
    const spriteH = frame.header.height;
    const offsetX = frame.header.offsetX;
    const offsetY = frame.header.offsetY;

    // Compute canvas dimensions so the full sprite and origin are always visible
    const leftSpace = offsetX + CANVAS_PADDING;
    const topSpace = offsetY + CANVAS_PADDING;
    const rightSpace = spriteW - offsetX + CANVAS_PADDING;
    const bottomSpace = spriteH - offsetY + CANVAS_PADDING;

    const displayCanvas = canvasRef.current;
    displayCanvas.width = Math.max((leftSpace + rightSpace) * zoom, 100);
    displayCanvas.height = Math.max((topSpace + bottomSpace) * zoom, 100);

    // Origin (hotspot) sits at (originX, originY) in canvas pixels
    const originX = leftSpace * zoom;
    const originY = topSpace * zoom;

    renderParamsRef.current = {
      originX,
      originY,
      zoom,
      spriteOffsetX: offsetX,
      spriteOffsetY: offsetY,
      spriteW,
      spriteH,
    };

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = displayOptions.backgroundColor;
    ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);

    // Grid
    if (displayOptions.showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      const gridSize = 10 * zoom;
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

    // Sprite: pixel (0,0) at (originX - offsetX*zoom, originY - offsetY*zoom)
    const spriteDrawX = originX - offsetX * zoom;
    const spriteDrawY = originY - offsetY * zoom;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sourceCanvas,
      spriteDrawX,
      spriteDrawY,
      spriteW * zoom,
      spriteH * zoom,
    );

    // Bounds
    if (displayOptions.showBounds) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(spriteDrawX, spriteDrawY, spriteW * zoom, spriteH * zoom);
    }

    // Red crosshair at origin (hotspot)
    const crosshairSize = 10;
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX - crosshairSize, originY);
    ctx.lineTo(originX + crosshairSize, originY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, originY - crosshairSize);
    ctx.lineTo(originX, originY + crosshairSize);
    ctx.stroke();
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

  // ===== Pixel editing =====

  const editPixelAtCanvasPos = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!renderParamsRef.current) return;
      if (loadedData?.type !== "sprites") return;

      const {
        originX,
        originY,
        zoom,
        spriteOffsetX,
        spriteOffsetY,
        spriteW,
        spriteH,
      } = renderParamsRef.current;
      const spriteDrawX = originX - spriteOffsetX * zoom;
      const spriteDrawY = originY - spriteOffsetY * zoom;

      const pixelX = Math.floor((canvasX - spriteDrawX) / zoom);
      const pixelY = Math.floor((canvasY - spriteDrawY) / zoom);

      if (pixelX < 0 || pixelX >= spriteW || pixelY < 0 || pixelY >= spriteH)
        return;

      const pixelIndex = pixelY * spriteW + pixelX;
      const shape = loadedData.data.shapes[selectedShapeIndex];
      if (!shape) return;
      const frame = shape.frames[selectedFrameIndex];
      if (!frame) return;

      if (editMode === "eyedropper") {
        const colorIndex = frame.pixels[pixelIndex];
        if (colorIndex !== undefined) {
          setSelectedPaletteColorIndex(colorIndex);
          toast.success(`Picked color index ${colorIndex}`);
        }
        return;
      }

      const newColor = editMode === "erase" ? 0 : selectedPaletteColorIndex;
      const newPixels = new Uint8Array(frame.pixels);
      newPixels[pixelIndex] = newColor;

      const newFrame: ShapeFrame = { ...frame, pixels: newPixels };
      const newFrames = [...shape.frames];
      newFrames[selectedFrameIndex] = newFrame;
      const newShape = { ...shape, frames: newFrames };
      const newShapes = [...loadedData.data.shapes];
      newShapes[selectedShapeIndex] = newShape;

      setLoadedData({
        ...loadedData,
        data: { ...loadedData.data, shapes: newShapes },
      });
    },
    [
      loadedData,
      selectedShapeIndex,
      selectedFrameIndex,
      editMode,
      selectedPaletteColorIndex,
    ],
  );

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode === "view") return;
    if (e.button !== 0) return;
    if (e.altKey) return;
    isPaintingRef.current = true;
    editPixelAtCanvasPos(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      !isPaintingRef.current ||
      editMode === "view" ||
      editMode === "eyedropper"
    )
      return;
    editPixelAtCanvasPos(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleCanvasMouseUp = () => {
    isPaintingRef.current = false;
  };

  // ===== Viewport pan / zoom handlers =====

  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOffsetStartRef.current = { ...panOffset };
    }
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panOffsetStartRef.current.x + dx,
      y: panOffsetStartRef.current.y + dy,
    });
  };

  const handleViewportMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setDisplayOptions((prev) => ({
      ...prev,
      zoomLevel: Math.min(16, Math.max(0.25, prev.zoomLevel * factor)),
    }));
  };

  const handleZoomIn = () => {
    setDisplayOptions((prev) => ({
      ...prev,
      zoomLevel: Math.min(16, prev.zoomLevel * 1.25),
    }));
  };

  const handleZoomOut = () => {
    setDisplayOptions((prev) => ({
      ...prev,
      zoomLevel: Math.max(0.25, prev.zoomLevel * 0.8),
    }));
  };

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
      if (frameCanvasResult.isOk()) {
        const link = document.createElement("a");
        link.href = frameCanvasResult.value.toDataURL("image/png");
        link.download = `shape_${selectedShapeIndex}_frame_${frameIdx}.png`;
        setTimeout(() => link.click(), frameIdx * 200);
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
    link.download = `tile_${selectedTileIndex}.png`;
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
    toast.info(`Downloading ${tileset.numTileDefinitions} tiles...`);

    tileset.tileImages.forEach((tileCanvas, tileIdx) => {
      const link = document.createElement("a");
      link.href = tileCanvas.toDataURL("image/png");
      link.download = `tile_${tileIdx}.png`;
      setTimeout(() => link.click(), tileIdx * 100);
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
      const sceneToTga: Record<string, string> = {
        bargain: "bargainscene",
        candy: "candyscene",
        clown: "clownscene",
        fairy: "fairyscene",
        jurassic: "dinoscene",
      };

      const tgaName = sceneToTga[sceneName] || sceneName;
      const tgaUrl = `assets/mightyMike/terrain/${tgaName}.tga`;

      const fetchResult = await ResultAsync.fromPromise(fetch(tgaUrl), mapErr);
      if (fetchResult.isErr()) {
        console.error("Error loading palette:", fetchResult.error);
        toast.error("Failed to load palette");
        return;
      }

      const response = fetchResult.value;
      if (!response.ok) {
        toast.error(`Failed to load palette for ${palette.name}`);
        return;
      }

      const bufferResult = await ResultAsync.fromPromise(
        response.arrayBuffer(),
        mapErr,
      );
      if (bufferResult.isErr()) {
        console.error("Error loading palette:", bufferResult.error);
        toast.error("Failed to load palette");
        return;
      }
      const buffer = bufferResult.value;
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
    } else {
      // Custom palette - just set it
      setCurrentPalette(palette);
    }
  };

  const handleTilesetPaletteSceneChange = async (sceneName: string) => {
    setCurrentTilesetPaletteScene(sceneName);

    // Load the palette from the TGA file without changing the tileset
    const sceneToTga: Record<string, string> = {
      bargain: "bargainscene",
      candy: "candyscene",
      clown: "clownscene",
      fairy: "fairyscene",
      jurassic: "dinoscene",
    };

    const tgaName = sceneToTga[sceneName] || sceneName;
    const tgaUrl = `assets/mightyMike/terrain/${tgaName}.tga`;

    const fetchResult = await ResultAsync.fromPromise(fetch(tgaUrl), mapErr);
    if (fetchResult.isErr()) {
      console.error("Error loading tileset palette:", fetchResult.error);
      toast.error("Failed to load palette");
      return;
    }

    const response = fetchResult.value;
    if (!response.ok) {
      toast.error(`Failed to load palette for ${sceneName}`);
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      console.error("Error loading tileset palette:", bufferResult.error);
      toast.error("Failed to load palette");
      return;
    }
    const buffer = bufferResult.value;
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
  };

  const selectedColor = currentPalette.colors[selectedPaletteColorIndex];
  const selectedColorStyle = selectedColor
    ? `rgb(${selectedColor.r},${selectedColor.g},${selectedColor.b})`
    : "black";

  const viewportCursor = isPanning
    ? "grabbing"
    : editMode === "paint" || editMode === "eyedropper"
      ? "crosshair"
      : editMode === "erase"
        ? "cell"
        : "default";

  const loadedTypeLabel =
    loadedData?.type === "sprites"
      ? "Sprites"
      : loadedData?.type === "tileset"
        ? "Tileset"
        : loadedData?.type === "tga"
          ? "Texture"
          : "No file";

  return (
    <div className="h-full overflow-hidden bg-gray-950 p-3 text-white">
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full w-full min-w-0"
      >
        <ResizablePanel
          defaultSize={28}
          minSize={18}
          className="min-h-0 min-w-0 pr-3"
        >
          <div className="h-full flex flex-col space-y-3 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-800 bg-gray-900 p-3">
            <FileUploadPanel
              selectedType={uploadFileType}
              onTypeChange={setUploadFileType}
              onFileSelected={handleCustomFileUpload}
              loading={loading}
            />

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
                      `Custom ${customPalettes.length + 1}`,
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

            {loadedData?.type === "sprites" && (
              <EditorPanel title="Sprite Tools">
                <EditorField label="Mode">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant={editMode === "view" ? "default" : "outline"}
                      className="text-white"
                      onClick={() => setEditMode("view")}
                    >
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant={editMode === "paint" ? "default" : "outline"}
                      className="text-white"
                      onClick={() => setEditMode("paint")}
                    >
                      <Paintbrush className="w-3 h-3 mr-1" /> Paint
                    </Button>
                    <Button
                      size="sm"
                      variant={editMode === "erase" ? "default" : "outline"}
                      className="text-white"
                      onClick={() => setEditMode("erase")}
                    >
                      <Eraser className="w-3 h-3 mr-1" /> Erase
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        editMode === "eyedropper" ? "default" : "outline"
                      }
                      className="text-white"
                      onClick={() => setEditMode("eyedropper")}
                    >
                      <Pipette className="w-3 h-3 mr-1" /> Pick
                    </Button>
                  </div>
                </EditorField>
                {(editMode === "paint" || editMode === "eyedropper") && (
                  <EditorField label="Palette Index">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-600 shrink-0"
                        style={{ backgroundColor: selectedColorStyle }}
                      />
                      <span className="text-xs text-gray-300 w-16">
                        Index: {selectedPaletteColorIndex}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={selectedPaletteColorIndex}
                        onChange={(e) =>
                          setSelectedPaletteColorIndex(
                            parseInt(e.target.value, 10),
                          )
                        }
                        className="flex-1"
                      />
                    </div>
                  </EditorField>
                )}
              </EditorPanel>
            )}

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

            {loadedData && (
              <DisplayOptionsPanel
                options={displayOptions}
                onOptionsChange={setDisplayOptions}
                showSpriteOptions={loadedData.type === "sprites"}
              />
            )}

            {loadedData?.type === "sprites" && (
              <EditorPanel title="Export">
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
              </EditorPanel>
            )}

            {loadedData?.type === "tileset" && (
              <EditorPanel title="Export">
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
              </EditorPanel>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={72} minSize={35} className="min-h-0">
          <div className="h-full relative overflow-hidden rounded-lg border border-gray-800 bg-gray-900 flex flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 px-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-100">
                  {loadedData?.filename ?? "Sprite Editor"}
                </p>
                <p className="text-xs text-gray-500">
                  {loadedTypeLabel} | {displayOptions.zoomLevel.toFixed(1)}x
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {loadedData ? (
              <div
                className="flex-1 overflow-auto"
                style={{ cursor: viewportCursor }}
                onWheel={handleWheel}
                onMouseDown={handleViewportMouseDown}
                onMouseMove={handleViewportMouseMove}
                onMouseUp={handleViewportMouseUp}
                onMouseLeave={handleViewportMouseUp}
              >
                <div
                  className="flex items-center justify-center p-8 min-w-full min-h-full"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ imageRendering: "pixelated" }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  />
                </div>
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
