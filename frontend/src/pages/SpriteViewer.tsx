import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Paintbrush, Eraser, Pipette, Eye } from "lucide-react";
import { toast } from "sonner";
import { shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileUploadPanel } from "./SpriteViewer/components/FileUploadPanel";
import { MightyMikeAssetBrowser } from "./SpriteViewer/components/MightyMikeAssetBrowser";
import { SpriteControls } from "./SpriteViewer/components/SpriteControls";
import { DisplayOptionsPanel, type DisplayOptions } from "./SpriteViewer/components/DisplayOptionsPanel";
import { PaletteSelector } from "./SpriteViewer/components/PaletteSelector";
import { PaletteEditor } from "./SpriteViewer/components/PaletteEditor";
import { EditorField, EditorPanel } from "./SpriteViewer/components/EditorPanel";
import { TilesetEditor } from "./SpriteViewer/components/TilesetEditor";
import { SpriteViewerCanvas } from "./SpriteViewer/components/SpriteViewerCanvas";
import { clonePalette, createPalette, type Palette } from "./SpriteViewer/utils/paletteUtils";
import { useSpriteViewerLoaders } from "./SpriteViewer/hooks/useSpriteViewerLoaders";
import type { EditMode, FileType, LoadedData } from "./SpriteViewer/types";

const initialDisplayOptions: DisplayOptions = {
  zoomLevel: 1,
  showGrid: false,
  showBounds: false,
  backgroundColor: "#1a1a2e",
};

function createDefaultPalette(): Palette {
  const palette = createPalette("Default Grayscale");
  palette.colors = Array.from({ length: 256 }, (_, index) => {
    const gray = Math.floor((index / 256) * 255);
    return { r: gray, g: gray, b: gray };
  });
  return palette;
}

export function SpriteViewer() {
  const [loadedData, setLoadedData] = useState<LoadedData>(null);
  const [loading, setLoading] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<FileType>("sprites");
  const [assetFileType, setAssetFileType] = useState<FileType>("sprites");
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | undefined>();
  const [currentTilesetScene, setCurrentTilesetScene] = useState("jurassic");
  const [currentTilesetPaletteScene, setCurrentTilesetPaletteScene] = useState("jurassic");
  const [customPalettes, setCustomPalettes] = useState<Palette[]>([]);
  const [currentPalette, setCurrentPalette] = useState<Palette>(createDefaultPalette);
  const [showPaletteEditor, setShowPaletteEditor] = useState(false);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(initialDisplayOptions);
  const [editMode, setEditMode] = useState<EditMode>("view");
  const [selectedPaletteColorIndex, setSelectedPaletteColorIndex] = useState(0);
  const loaders = useSpriteViewerLoaders({
    setLoadedData,
    setLoading,
    setSelectedShapeIndex,
    setSelectedFrameIndex,
    setSelectedTileIndex,
    setCurrentTilesetScene,
    setCurrentTilesetPaletteScene,
    setCurrentPalette,
  });

  const handleAssetSelect = (filename: string) => {
    if (assetFileType === "sprites") void loaders.loadSpritesFile(filename);
    else if (assetFileType === "tga") void loaders.loadTGAFile(filename);
    else void loaders.loadTilesetFile(filename);
  };

  const handlePaletteSelect = (palette: Palette) => {
    void loaders.loadPalette(palette, false);
    setShowPaletteEditor(false);
  };

  const handleNewPalette = () => {
    const palette = createPalette(`Custom ${customPalettes.length + 1}`);
    setCustomPalettes((previous) => [...previous, palette]);
    setCurrentPalette(palette);
    setShowPaletteEditor(true);
  };

  const handlePaletteChange = (updated: Palette) => {
    setCurrentPalette(updated);
    setCustomPalettes((previous) => {
      const index = previous.findIndex((palette) => palette.name === updated.name);
      if (index < 0) return previous;
      const next = [...previous];
      next[index] = updated;
      return next;
    });
  };

  const handleSavePaletteAsNew = (palette: Palette) => {
    const copy = clonePalette(palette);
    copy.name = `${palette.name} Copy`;
    setCustomPalettes((previous) => [...previous, copy]);
    setCurrentPalette(copy);
  };

  const downloadOriginal = () => {
    if (!loadedData) {
      toast.error("No asset to download");
      return;
    }
    const extension = loadedData.type === "sprites" ? ".shapes" : loadedData.type === "tileset" ? ".tileset" : ".tga";
    const filename = loadedData.filename.toLowerCase().endsWith(extension) ? loadedData.filename : `${loadedData.filename}${extension}`;
    downloadBytes(loadedData.sourceBytes, filename);
    toast.success(`Downloaded ${filename}`);
  };

  const downloadFrame = () => {
    if (loadedData?.type !== "sprites") {
      toast.error("No frame to download");
      return;
    }
    const frame = loadedData.data.shapes[selectedShapeIndex]?.frames[selectedFrameIndex];
    if (!frame) {
      toast.error("No frame to download");
      return;
    }
    const canvasResult = shapeFrameToCanvas(frame, currentPalette.colors);
    if (canvasResult.isErr()) {
      toast.error("Failed to render frame");
      return;
    }
    downloadCanvas(canvasResult.value, `shape_${selectedShapeIndex}_frame_${selectedFrameIndex}.png`);
    toast.success("Frame downloaded");
  };

  const downloadAllFrames = () => {
    if (loadedData?.type !== "sprites") {
      toast.error("Only available for sprites");
      return;
    }
    const shape = loadedData.data.shapes[selectedShapeIndex];
    if (!shape) {
      toast.error("No shape selected");
      return;
    }
    toast.info("Downloading frames...");
    shape.frames.forEach((frame, index) => {
      const canvasResult = shapeFrameToCanvas(frame, currentPalette.colors);
      if (canvasResult.isOk()) setTimeout(() => downloadCanvas(canvasResult.value, `shape_${selectedShapeIndex}_frame_${index}.png`), index * 200);
    });
  };

  const downloadTile = () => {
    if (loadedData?.type !== "tileset" || selectedTileIndex === undefined) {
      toast.error("No tile selected");
      return;
    }
    const canvas = loadedData.data.tileImages[selectedTileIndex];
    if (!canvas) {
      toast.error("Tile not found");
      return;
    }
    downloadCanvas(canvas, `tile_${selectedTileIndex}.png`);
    toast.success("Tile downloaded");
  };

  const downloadTileset = () => {
    if (loadedData?.type !== "tileset") {
      toast.error("No tileset loaded");
      return;
    }
    downloadCanvas(loadedData.gridCanvas, `tileset_${loadedData.filename}.png`);
    toast.success("Tileset downloaded");
  };

  const downloadAllTiles = () => {
    if (loadedData?.type !== "tileset") {
      toast.error("No tileset loaded");
      return;
    }
    toast.info(`Downloading ${loadedData.data.numTileDefinitions} tiles...`);
    loadedData.data.tileImages.forEach((canvas, index) => {
      setTimeout(() => downloadCanvas(canvas, `tile_${index}.png`), index * 100);
    });
    toast.success("Tile download started");
  };

  return (
    <div className="h-full overflow-hidden bg-gray-900 p-2 text-white">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full min-w-0">
        <ResizablePanel defaultSize={30} minSize={20} className="min-h-0 min-w-0 pr-2">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950/80 px-3 pb-4 pt-2">
              <MightyMikeAssetBrowser selectedType={assetFileType} onTypeChange={setAssetFileType} onAssetSelect={handleAssetSelect} loading={loading} loadedFilename={loadedData?.filename} />
              <FileUploadPanel selectedType={uploadFileType} onTypeChange={setUploadFileType} onFileSelected={loaders.loadCustomFileUpload} loading={loading} />
              {loadedData?.type === "sprites" && <SpriteSidebar loadedData={loadedData} customPalettes={customPalettes} currentPalette={currentPalette} showPaletteEditor={showPaletteEditor} onPaletteSelect={handlePaletteSelect} onNewPalette={handleNewPalette} onPaletteChange={handlePaletteChange} onSavePaletteAsNew={handleSavePaletteAsNew} selectedShapeIndex={selectedShapeIndex} selectedFrameIndex={selectedFrameIndex} onShapeChange={(index) => { setSelectedShapeIndex(index); setSelectedFrameIndex(0); }} onFrameChange={setSelectedFrameIndex} editMode={editMode} onEditModeChange={setEditMode} selectedPaletteColorIndex={selectedPaletteColorIndex} onPaletteColorChange={setSelectedPaletteColorIndex} />}
              {loadedData?.type === "tileset" && <TilesetEditor tileCount={loadedData.data.numTileDefinitions} selectedTileIndex={selectedTileIndex} onSelectTile={setSelectedTileIndex} currentTilesetScene={currentTilesetScene} currentPaletteScene={currentTilesetPaletteScene} onPaletteSceneChange={loaders.changeTilesetPaletteScene} />}
              {loadedData && <DisplayOptionsPanel options={displayOptions} onOptionsChange={setDisplayOptions} showSpriteOptions={loadedData.type === "sprites"} />}
              <ExportPanels loadedData={loadedData} selectedTileIndex={selectedTileIndex} onDownloadOriginal={downloadOriginal} onDownloadFrame={downloadFrame} onDownloadAllFrames={downloadAllFrames} onDownloadTile={downloadTile} onDownloadTileset={downloadTileset} onDownloadAllTiles={downloadAllTiles} />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} minSize={35} className="min-h-0 pl-2">
          <SpriteViewerCanvas loadedData={loadedData} onLoadedDataChange={setLoadedData} selectedShapeIndex={selectedShapeIndex} selectedFrameIndex={selectedFrameIndex} selectedTileIndex={selectedTileIndex} currentPalette={currentPalette} displayOptions={displayOptions} onDisplayOptionsChange={setDisplayOptions} editMode={editMode} selectedPaletteColorIndex={selectedPaletteColorIndex} onPaletteColorChange={setSelectedPaletteColorIndex} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

interface SpriteSidebarProps {
  readonly loadedData: Extract<LoadedData, { type: "sprites" }>;
  readonly customPalettes: Palette[];
  readonly currentPalette: Palette;
  readonly showPaletteEditor: boolean;
  readonly onPaletteSelect: (palette: Palette) => void;
  readonly onNewPalette: () => void;
  readonly onPaletteChange: (palette: Palette) => void;
  readonly onSavePaletteAsNew: (palette: Palette) => void;
  readonly selectedShapeIndex: number;
  readonly selectedFrameIndex: number;
  readonly onShapeChange: (index: number) => void;
  readonly onFrameChange: (index: number) => void;
  readonly editMode: EditMode;
  readonly onEditModeChange: (mode: EditMode) => void;
  readonly selectedPaletteColorIndex: number;
  readonly onPaletteColorChange: (index: number) => void;
}

function SpriteSidebar(props: SpriteSidebarProps) {
  const selectedColor = props.currentPalette.colors[props.selectedPaletteColorIndex];
  const modes: EditMode[] = ["view", "paint", "erase", "eyedropper"];
  return (
    <>
      <PaletteSelector palettes={props.customPalettes} currentPalette={props.currentPalette} onPaletteSelect={props.onPaletteSelect} onCreateNew={props.onNewPalette} />
      {props.showPaletteEditor && <PaletteEditor palette={props.currentPalette} onPaletteChange={props.onPaletteChange} onSaveAsNew={props.onSavePaletteAsNew} />}
      <SpriteControls shapesFile={props.loadedData.data} selectedShapeIndex={props.selectedShapeIndex} selectedFrameIndex={props.selectedFrameIndex} onShapeChange={props.onShapeChange} onFrameChange={props.onFrameChange} />
      <EditorPanel title="Sprite Tools">
        <EditorField label="Mode"><div className="grid grid-cols-2 gap-2" role="group" aria-label="Sprite editing mode">{modes.map((mode) => <ModeButton key={mode} mode={mode} currentMode={props.editMode} onModeChange={props.onEditModeChange} />)}</div></EditorField>
        {(props.editMode === "paint" || props.editMode === "eyedropper") && <EditorField label="Palette Index"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded border border-gray-600 shrink-0" style={{ backgroundColor: selectedColor ? `rgb(${selectedColor.r},${selectedColor.g},${selectedColor.b})` : "black" }} /><span className="text-xs text-gray-300 w-16">Index: {props.selectedPaletteColorIndex}</span><Slider min={0} max={255} value={[props.selectedPaletteColorIndex]} onValueChange={([index]) => { if (index !== undefined) props.onPaletteColorChange(index); }} aria-label="Palette index" className="flex-1" /></div></EditorField>}
      </EditorPanel>
    </>
  );
}

function ModeButton(props: { readonly mode: EditMode; readonly currentMode: EditMode; readonly onModeChange: (mode: EditMode) => void }) {
  const labels: Record<EditMode, string> = { view: "View", paint: "Paint", erase: "Erase", eyedropper: "Eyedropper" };
  const icons = { view: Eye, paint: Paintbrush, erase: Eraser, eyedropper: Pipette };
  const Icon = icons[props.mode];
  return <Button size="sm" variant={props.currentMode === props.mode ? "default" : "outline"} className="text-white" aria-pressed={props.currentMode === props.mode} onClick={() => props.onModeChange(props.mode)}><Icon className="w-3 h-3 mr-1" />{labels[props.mode]}</Button>;
}

interface ExportPanelsProps {
  readonly loadedData: LoadedData;
  readonly selectedTileIndex: number | undefined;
  readonly onDownloadOriginal: () => void;
  readonly onDownloadFrame: () => void;
  readonly onDownloadAllFrames: () => void;
  readonly onDownloadTile: () => void;
  readonly onDownloadTileset: () => void;
  readonly onDownloadAllTiles: () => void;
}

function ExportPanels(props: ExportPanelsProps) {
  if (!props.loadedData) return null;
  return <EditorPanel title="Export">{props.loadedData.type === "sprites" && <><ExportButton label="Download Frame as PNG" onClick={props.onDownloadFrame} /><ExportButton label="Download All Frames as PNG" onClick={props.onDownloadAllFrames} /><ExportButton label="Download Unmodified Source .shapes" onClick={props.onDownloadOriginal} primary /></>}{props.loadedData.type === "tileset" && <><ExportButton label="Download Tile as PNG" onClick={props.onDownloadTile} disabled={props.selectedTileIndex === undefined} /><ExportButton label="Download Preview as PNG" onClick={props.onDownloadTileset} /><ExportButton label="Download All Tiles as PNG" onClick={props.onDownloadAllTiles} /><ExportButton label="Download Original .tileset" onClick={props.onDownloadOriginal} primary /></>}{props.loadedData.type === "tga" && <ExportButton label="Download Original .tga" onClick={props.onDownloadOriginal} primary />}</EditorPanel>;
}

function ExportButton(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean; readonly primary?: boolean }) {
  return <Button variant={props.primary ? "default" : "outline"} className="w-full text-white" onClick={props.onClick} disabled={props.disabled}><Download className="w-4 h-4 mr-2" />{props.label}</Button>;
}

function downloadBytes(bytes: ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
