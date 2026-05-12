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
import { EditorField, EditorPanel, MetricGrid } from "./EditorPanel";

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
    <div className="space-y-3">
      <EditorPanel title={`Shapes (${shapesFile.shapes.length})`}>
        <EditorField label="Shape">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white shrink-0"
              onClick={() => onShapeChange(Math.max(0, selectedShapeIndex - 1))}
              disabled={selectedShapeIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Select
              value={String(selectedShapeIndex)}
              onValueChange={(value) => {
                const nextIndex = Number.parseInt(value, 10);
                if (!Number.isNaN(nextIndex)) {
                  onShapeChange(nextIndex);
                }
              }}
            >
              <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
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

            <Button
              variant="ghost"
              size="sm"
              className="text-white shrink-0"
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
        </EditorField>
      </EditorPanel>

      <EditorPanel title={`Frames (${currentShape.frames.length})`}>
        <EditorField label="Frame">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white shrink-0"
              onClick={() => onFrameChange(Math.max(0, selectedFrameIndex - 1))}
              disabled={selectedFrameIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-white">
                Frame {selectedFrameIndex + 1} / {currentShape.frames.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white shrink-0"
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
        </EditorField>

          {currentFrame && (
            <MetricGrid
              items={[
                {
                  label: "Size",
                  value: `${currentFrame.header.width}x${currentFrame.header.height}px`,
                },
                {
                  label: "Hotspot",
                  value: `(${currentFrame.header.offsetX}, ${currentFrame.header.offsetY})`,
                },
              ]}
            />
          )}
      </EditorPanel>
    </div>
  );
}
