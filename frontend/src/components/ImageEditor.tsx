import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToolsPanel } from "./ImageEditor/ToolsPanel";
import { toast } from "sonner";
import { ResultAsync } from "neverthrow";
import Konva from "konva";
import { mapErr } from "@/utils/mapErr";
import { ImageEditorCanvas } from "./ImageEditor/ImageEditorCanvas";
import { ImageEditorFooter } from "./ImageEditor/ImageEditorFooter";
import { buildSelectedColorHighlightCanvas } from "./ImageEditor/selectedColorHighlight";
import type { BrushStroke, ImageEditorSaveAction } from "./ImageEditor/types";
import { DEFAULT_IMAGE_EDITOR_COLOR_PALETTE } from "./ImageEditor/colorPalette";
import { LoadingImageEditorDialog } from "./ImageEditor/LoadingImageEditorDialog";

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageData: ImageData) => Promise<void>;
  saveActions?: ImageEditorSaveAction[];
  imageName?: string;
  /**
   * When provided, the editor operates in palette-constrained mode:
   * the free color picker is hidden and only these colors can be used for painting.
   * Each entry is a CSS hex color string (e.g. "#ff0080").
   */
  paletteColors?: string[];
  /**
   * Called when the user replaces a palette entry (palette mode only).
   * The host component should remap all pixels of the old color to the new color.
   */
  onReplacePaletteColor?: (index: number, newColor: string) => void;
}

export function ImageEditor({
  isOpen,
  onClose,
  imageUrl,
  onSave,
  saveActions,
  imageName,
  paletteColors,
  onReplacePaletteColor,
}: ImageEditorProps) {
  const [tool] = useState<"brush">("brush");
  const [brushSize, setBrushSize] = useState([5]);
  const [brushShape, setBrushShape] = useState<"circle" | "square">("circle");
  const [brushColor, setBrushColor] = useState(
    () => paletteColors?.[0] ?? "#ffffff",
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<BrushStroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [highlightSelectedColorUsage, setHighlightSelectedColorUsage] =
    useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorPalette = Array.from(DEFAULT_IMAGE_EDITOR_COLOR_PALETTE);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      const scaleX = Math.min(800 / img.width, 1);
      const scaleY = Math.min(600 / img.height, 1);
      const finalScale = Math.min(scaleX, scaleY);
      setScale(finalScale);
      setBaseScale(finalScale);

      setStrokes([]);
      setCurrentStroke(null);
      setHistory([]);
      setHistoryIndex(-1);
      const defaultPaletteColor = paletteColors?.[0];
      if (defaultPaletteColor) {
        setBrushColor(defaultPaletteColor);
      }
    };
    img.onerror = () => {
      toast.error("Failed to load image for editing");
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, paletteColors]);

  const saveToHistory = (newStrokes: BrushStroke[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newStrokes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevStrokes = history[historyIndex - 1];
      setStrokes(prevStrokes ? [...prevStrokes] : []);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setStrokes([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextStrokes = history[historyIndex + 1];
      setStrokes(nextStrokes ? [...nextStrokes] : []);
    }
  };

  const snapToImagePixel = useCallback(
    (value: number, maxExclusive: number): number => {
      const snapped = Math.floor(value);
      if (snapped < 0) return 0;
      if (snapped >= maxExclusive) return Math.max(0, maxExclusive - 1);
      return snapped;
    },
    [],
  );

  const handleMouseDown = () => {
    if (tool !== "brush") return;
    if (!image) return;

    const stage = stageRef.current;
    if (!stage) return;

    setIsDrawing(true);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const adjustedPos = {
      x: snapToImagePixel(pos.x / scale, image.width),
      y: snapToImagePixel(pos.y / scale, image.height),
    };

    const newStroke: BrushStroke = {
      points: [adjustedPos.x, adjustedPos.y],
      color: brushColor,
      size: brushSize[0] ?? 10,
      shape: brushShape,
    };

    setCurrentStroke(newStroke);
  };

  const handleMouseMove = () => {
    if (!isDrawing || tool !== "brush" || !currentStroke) return;
    if (!image) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const adjustedPos = {
      x: snapToImagePixel(pos.x / scale, image.width),
      y: snapToImagePixel(pos.y / scale, image.height),
    };

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, adjustedPos.x, adjustedPos.y],
    };

    setCurrentStroke(updatedStroke);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);
    const newStrokes = [...strokes, currentStroke];
    setStrokes(newStrokes);
    saveToHistory(newStrokes);
    setCurrentStroke(null);
  };

  const handleSave = async (
    customSaveHandler: (editedImageData: ImageData) => Promise<void> = onSave,
  ) => {
    if (!image || !stageRef.current) {
      toast.error("No image to save");
      return;
    }

    setSaving(true);

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Failed to get canvas context");
      setSaving(false);
      return;
    }

    ctx.drawImage(image, 0, 0);

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.shape === "square") {
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
      }

      ctx.beginPath();
      const startX = stroke.points[0] ?? 0;
      const startY = stroke.points[1] ?? 0;
      ctx.moveTo(startX, startY);

      for (let i = 2; i < stroke.points.length; i += 2) {
        const x = stroke.points[i] ?? 0;
        const y = stroke.points[i + 1] ?? 0;
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    });

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const saveResult = await ResultAsync.fromPromise(
      customSaveHandler(imageData),
      mapErr,
    );
    if (saveResult.isErr()) {
      console.error("Error saving edited image:", saveResult.error);
      toast.error("Failed to save edited image");
      setSaving(false);
      return;
    }

    toast.success("Image saved successfully");
    setSaving(false);
    onClose();
  };

  const handleClose = () => {
    if (strokes.length > 0) {
      if (
        confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const zoomOut = () => {
    setScale((current) => Math.max(baseScale * 0.1, current / 1.25));
  };

  const zoomIn = () => {
    setScale((current) => Math.min(baseScale * 20, current * 1.25));
  };

  const resetZoom = () => {
    setScale(baseScale);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const scaleBy = 1.1;
      const direction = e.deltaY > 0 ? -1 : 1;

      setScale((current) => {
        const newScale = direction > 0 ? current * scaleBy : current / scaleBy;
        return Math.min(baseScale * 20, Math.max(baseScale * 0.1, newScale));
      });
    };

    container.addEventListener("wheel", handleWheelNative, {
      passive: false,
      capture: true,
    });
    return () => {
      container.removeEventListener("wheel", handleWheelNative, {
        capture: true,
      });
    };
  }, [baseScale]);

  const selectedColorHighlightCanvas = useMemo(
    () =>
      buildSelectedColorHighlightCanvas(
        image,
        paletteColors,
        highlightSelectedColorUsage,
        brushColor,
      ),
    [brushColor, highlightSelectedColorUsage, image, paletteColors],
  );

  if (!image) {
    return (
      <LoadingImageEditorDialog isOpen={isOpen} onRequestClose={handleClose} />
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col text-white pr-14">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-white">
            Image Editor - {imageName || "Untitled"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden">
          <ToolsPanel
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushShape={brushShape}
            setBrushShape={setBrushShape}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            colorPalette={colorPalette}
            paletteColors={paletteColors}
            onReplacePaletteColor={onReplacePaletteColor}
            highlightSelectedColorUsage={highlightSelectedColorUsage}
            setHighlightSelectedColorUsage={setHighlightSelectedColorUsage}
          />
          <ImageEditorCanvas
            image={image}
            scale={scale}
            historyIndex={historyIndex}
            historyLength={history.length}
            undo={undo}
            redo={redo}
            zoomOut={zoomOut}
            zoomIn={zoomIn}
            resetZoom={resetZoom}
            containerRef={containerRef}
            stageRef={stageRef}
            layerRef={layerRef}
            handleMouseDown={handleMouseDown}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
            selectedColorHighlightCanvas={selectedColorHighlightCanvas}
            strokes={strokes}
            currentStroke={currentStroke}
          />
        </div>
        <ImageEditorFooter
          handleClose={handleClose}
          saveActions={saveActions}
          handleSave={handleSave}
          onSave={onSave}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}
