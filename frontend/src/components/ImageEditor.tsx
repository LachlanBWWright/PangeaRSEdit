import { useState, useRef, useEffect, useMemo } from "react";
import { Stage, Layer, Image, Line } from "react-konva";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, X, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react";
import { ToolsPanel } from "./ImageEditor/ToolsPanel";
import { toast } from "sonner";
import Konva from "konva";
import { fromPromise } from "@/types/result";
import { hexToRgb } from "@/utils/colorUtils";
// Event typing removed - handlers don't need explicit event param here

interface BrushStroke {
  points: number[];
  color: string;
  size: number;
  shape: "circle" | "square";
}

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageData: ImageData) => Promise<void>;
  saveActions?: {
    label: string;
    onSave: (editedImageData: ImageData) => Promise<void>;
  }[];
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

  // Predefined color palette (used only in free-color mode)
  const colorPalette = [
    "#ffffff",
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ff8000",
    "#8000ff",
    "#808080",
    "#c0c0c0",
    "#800000",
    "#008000",
    "#000080",
    "#808000",
    "#800080",
    "#008080",
    "#ff8080",
    "#80ff80",
  ];

  // Load image when dialog opens; state is reset inside onload to avoid cascading setState in effect
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Calculate scale for display
      const scaleX = Math.min(800 / img.width, 1);
      const scaleY = Math.min(600 / img.height, 1);
      const finalScale = Math.min(scaleX, scaleY);
      setScale(finalScale);
      setBaseScale(finalScale);

      // Reset editor state
      setStrokes([]);
      setCurrentStroke(null);
      setHistory([]);
      setHistoryIndex(-1);
      // Default brush to first palette color when in palette mode
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

  const handleMouseDown = () => {
    if (tool !== "brush") return;

    const stage = stageRef.current;
    if (!stage) return;

    setIsDrawing(true);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Adjust coordinates for scale
    const adjustedPos = {
      x: pos.x / scale,
      y: pos.y / scale,
    };

    const newStroke: BrushStroke = {
      points: [adjustedPos.x, adjustedPos.y],
      color: brushColor,
      size: (brushSize[0] ?? 10) / scale, // Adjust brush size for scale
      shape: brushShape,
    };

    setCurrentStroke(newStroke);
  };

  const handleMouseMove = () => {
    if (!isDrawing || tool !== "brush" || !currentStroke) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Adjust coordinates for scale
    const adjustedPos = {
      x: pos.x / scale,
      y: pos.y / scale,
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

    // Create a canvas to combine the original image with edits
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Failed to get canvas context");
      setSaving(false);
      return;
    }

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Draw all strokes on top (strokes are already in original image coordinates)
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

    // Get image data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Call the save callback
    const saveResult = await fromPromise(customSaveHandler(imageData));
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

    container.addEventListener("wheel", handleWheelNative, { passive: false, capture: true });
    return () => {
      container.removeEventListener("wheel", handleWheelNative, { capture: true });
    };
  }, [baseScale]);

  const selectedColorHighlightCanvas = useMemo(() => {
    if (!image || !paletteColors || !highlightSelectedColorUsage) {
      return null;
    }

    const rgb = hexToRgb(brushColor);
    if (!rgb) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    for (let index = 0; index < data.length; index += 4) {
      const matches =
        data[index] === rgb.r &&
        data[index + 1] === rgb.g &&
        data[index + 2] === rgb.b &&
        (data[index + 3] ?? 0) > 0;

      if (matches) {
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 0;
        data[index + 3] = 220;
      } else {
        data[index + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }, [brushColor, highlightSelectedColorUsage, image, paletteColors]);

  if (!image) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-4xl h-[80vh] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Loading Image Editor...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading image...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col text-white pr-14">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-white">
            Image Editor - {imageName || "Untitled"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Tools Panel */}
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

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-900 rounded overflow-hidden relative">
            {/* Overlay Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-row items-center gap-2 bg-gray-800/90 p-1.5 rounded-lg shadow-xl border border-gray-700">
              <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-700 text-gray-300"
                  onClick={undo}
                  disabled={historyIndex < 0}
                  title="Undo"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-700 text-gray-300"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-700 text-gray-300"
                  onClick={zoomOut}
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-700 text-gray-300"
                  onClick={zoomIn}
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-[11px] font-medium hover:bg-gray-700 text-gray-300 min-w-[3rem]"
                  onClick={resetZoom}
                >
                  {Math.round(scale * 100)}%
                </Button>
              </div>
            </div>

            <div 
              ref={containerRef}
              className="w-full h-full overflow-auto custom-scrollbar"
            >

              <div 
                className="flex p-20"
                style={{
                  minWidth: "100%",
                  minHeight: "100%",
                  width: image.width * scale + 160,
                  height: image.height * scale + 160
                }}
              >
                <div className="m-auto shadow-2xl border border-gray-800">
                  <Stage
                    ref={stageRef}
                    width={image.width * scale}
                    height={image.height * scale}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <Layer ref={layerRef}>
                      <Image image={image} />
                      {selectedColorHighlightCanvas && (
                        <Image
                          image={selectedColorHighlightCanvas}
                          opacity={0.45}
                        />
                      )}

                      {/* Render completed strokes */}
                      {strokes.map((stroke, i) => (
                        <Line
                          key={i}
                          points={stroke.points}
                          stroke={stroke.color}
                          strokeWidth={stroke.size}
                          lineCap={stroke.shape === "circle" ? "round" : "square"}
                          lineJoin={stroke.shape === "circle" ? "round" : "miter"}
                          globalCompositeOperation="source-over"
                        />
                      ))}

                      {/* Render current stroke */}
                      {currentStroke && (
                        <Line
                          points={currentStroke.points}
                          stroke={currentStroke.color}
                          strokeWidth={currentStroke.size}
                          lineCap={
                            currentStroke.shape === "circle" ? "round" : "square"
                          }
                          lineJoin={
                            currentStroke.shape === "circle" ? "round" : "miter"
                          }
                          globalCompositeOperation="source-over"
                        />
                      )}
                    </Layer>
                  </Stage>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-600">
          <Button onClick={handleClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          {saveActions && saveActions.length > 0 ? (
            <div className="flex gap-2">
              {saveActions.map((action) => (
                <Button
                  key={action.label}
                  onClick={() => handleSave(action.onSave)}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : action.label}
                </Button>
              ))}
            </div>
          ) : (
            <Button
              onClick={() => handleSave(onSave)}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
