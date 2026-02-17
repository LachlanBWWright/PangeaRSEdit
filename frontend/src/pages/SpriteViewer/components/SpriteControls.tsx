import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShapesFile } from "@/parsers/mightyMikeShapesParser";

interface SpriteControlsProps {
  shapesFile: ShapesFile;
  selectedShapeIndex: number;
  selectedFrameIndex: number;
  onShapeChange: (index: number) => void;
  onFrameChange: (index: number) => void;
}

export function SpriteControls({
  shapesFile,
  selectedShapeIndex,
  selectedFrameIndex,
  onShapeChange,
  onFrameChange,
}: SpriteControlsProps) {
  const currentShape = shapesFile.shapes[selectedShapeIndex];
  const currentFrame = currentShape?.frames[selectedFrameIndex];

  if (!currentShape) return null;

  return (
    <div className="space-y-4">
      {/* Shape Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">
            Shapes ({shapesFile.shapes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between bg-gray-700 rounded p-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white"
              onClick={() => onShapeChange(Math.max(0, selectedShapeIndex - 1))}
              disabled={selectedShapeIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">
                Shape {selectedShapeIndex + 1} / {shapesFile.shapes.length}
              </p>
              <p className="text-xs text-gray-400">
                {currentShape.frames.length} frames
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white"
              onClick={() =>
                onShapeChange(
                  Math.min(shapesFile.shapes.length - 1, selectedShapeIndex + 1),
                )
              }
              disabled={selectedShapeIndex >= shapesFile.shapes.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Select
            value={String(selectedShapeIndex)}
            onValueChange={(value) => {
              const nextIndex = Number.parseInt(value, 10);
              if (!Number.isNaN(nextIndex)) {
                onShapeChange(nextIndex);
              }
            }}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a shape" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {shapesFile.shapes.map((shape, idx) => (
                <SelectItem
                  key={`shape-${idx}`}
                  value={String(idx)}
                  className="text-white focus:bg-gray-600"
                >
                  Shape {idx} ({shape.frames.length} frames)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Frame Selection */}
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
              className="text-white"
              onClick={() => onFrameChange(Math.max(0, selectedFrameIndex - 1))}
              disabled={selectedFrameIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">
                Frame {selectedFrameIndex + 1} / {currentShape.frames.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white"
              onClick={() =>
                onFrameChange(
                  Math.min(currentShape.frames.length - 1, selectedFrameIndex + 1),
                )
              }
              disabled={selectedFrameIndex >= currentShape.frames.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {currentFrame && (
            <div className="bg-gray-700 rounded p-2 text-xs space-y-1 text-white">
              <div>
                <span className="text-gray-400">Size: </span>
                <span className="text-white">
                  {currentFrame.header.width}×{currentFrame.header.height}px
                </span>
              </div>
              <div>
                <span className="text-gray-400">Offset: </span>
                <span className="text-white">
                  ({currentFrame.header.offsetX}, {currentFrame.header.offsetY})
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
