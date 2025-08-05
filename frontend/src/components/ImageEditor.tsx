import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image, Line } from "react-konva";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Circle, Square, Save, X, Undo, Redo } from "lucide-react";
import { toast } from "sonner";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";

interface BrushStroke {
  points: number[];
  color: string;
  size: number;
  shape: 'circle' | 'square';
}

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageData: ImageData) => Promise<void>;
  imageName?: string;
}

export function ImageEditor({ isOpen, onClose, imageUrl, onSave, imageName }: ImageEditorProps) {
  const [tool] = useState<'brush'>('brush');
  const [brushSize, setBrushSize] = useState([5]);
  const [brushShape, setBrushShape] = useState<'circle' | 'square'>('circle');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<BrushStroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // Predefined color palette
  const colorPalette = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
    '#808080', '#c0c0c0', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#ff8080', '#80ff80'
  ];

  // Load image when dialog opens
  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        // Reset editor state
        setStrokes([]);
        setCurrentStroke(null);
        setHistory([]);
        setHistoryIndex(-1);
      };
      img.onerror = () => {
        toast.error("Failed to load image for editing");
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  const saveToHistory = (newStrokes: BrushStroke[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newStrokes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setStrokes([...history[historyIndex - 1]]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setStrokes([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setStrokes([...history[historyIndex + 1]]);
    }
  };

  const handleMouseDown = (_e: KonvaEventObject<MouseEvent>) => {
    if (tool !== 'brush') return;
    
    const stage = stageRef.current;
    if (!stage) return;

    setIsDrawing(true);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const newStroke: BrushStroke = {
      points: [pos.x, pos.y],
      color: brushColor,
      size: brushSize[0],
      shape: brushShape
    };
    
    setCurrentStroke(newStroke);
  };

  const handleMouseMove = (_e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || tool !== 'brush' || !currentStroke) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pos.x, pos.y]
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

  const handleSave = async () => {
    if (!image || !stageRef.current) {
      toast.error("No image to save");
      return;
    }

    setSaving(true);
    try {
      // Create a canvas to combine the original image with edits
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Draw the original image
      ctx.drawImage(image, 0, 0);

      // Draw all strokes on top
      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.shape === 'square') {
          ctx.lineCap = 'square';
          ctx.lineJoin = 'miter';
        }

        ctx.beginPath();
        ctx.moveTo(stroke.points[0], stroke.points[1]);
        
        for (let i = 2; i < stroke.points.length; i += 2) {
          ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
        }
        
        ctx.stroke();
      });

      // Get image data from the canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Call the onSave callback
      await onSave(imageData);
      toast.success("Image saved successfully");
      onClose();
    } catch (error) {
      console.error("Error saving edited image:", error);
      toast.error("Failed to save edited image");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (strokes.length > 0) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!image) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[80vh] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Loading Image Editor...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading image...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white">
            <span>Image Editor - {imageName || 'Untitled'}</span>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={undo}
                disabled={historyIndex < 0}
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Tools Panel */}
          <div className="w-64 bg-gray-800 rounded p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brush Size: {brushSize[0]}px
              </label>
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brush Shape
              </label>
              <Select value={brushShape} onValueChange={(value: 'circle' | 'square') => setBrushShape(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">
                    <div className="flex items-center space-x-2">
                      <Circle className="w-4 h-4" />
                      <span>Circle</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="square">
                    <div className="flex items-center space-x-2">
                      <Square className="w-4 h-4" />
                      <span>Square</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <div className="space-y-2">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-full h-10 rounded border border-gray-600"
                />
                <div className="grid grid-cols-4 gap-1">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${
                        brushColor === color ? 'border-white' : 'border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-900 rounded overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <Stage
                ref={stageRef}
                width={Math.min(800, image.width)}
                height={Math.min(600, image.height)}
                scaleX={Math.min(800 / image.width, 600 / image.height, 1)}
                scaleY={Math.min(800 / image.width, 600 / image.height, 1)}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                className="border border-gray-600"
              >
                <Layer ref={layerRef}>
                  <Image image={image} />
                  
                  {/* Render completed strokes */}
                  {strokes.map((stroke, i) => (
                    <Line
                      key={i}
                      points={stroke.points}
                      stroke={stroke.color}
                      strokeWidth={stroke.size}
                      lineCap={stroke.shape === 'circle' ? 'round' : 'square'}
                      lineJoin={stroke.shape === 'circle' ? 'round' : 'miter'}
                      globalCompositeOperation="source-over"
                    />
                  ))}
                  
                  {/* Render current stroke */}
                  {currentStroke && (
                    <Line
                      points={currentStroke.points}
                      stroke={currentStroke.color}
                      strokeWidth={currentStroke.size}
                      lineCap={currentStroke.shape === 'circle' ? 'round' : 'square'}
                      lineJoin={currentStroke.shape === 'circle' ? 'round' : 'miter'}
                      globalCompositeOperation="source-over"
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-600">
          <Button
            onClick={handleClose}
            variant="outline"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}