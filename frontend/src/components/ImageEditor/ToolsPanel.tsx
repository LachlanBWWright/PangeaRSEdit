import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Square, Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  brushSize: number[];
  setBrushSize: (v: number[]) => void;
  brushShape: "circle" | "square";
  setBrushShape: (v: "circle" | "square") => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  colorPalette: string[];
}

export function ToolsPanel({
  brushSize,
  setBrushSize,
  brushShape,
  setBrushShape,
  brushColor,
  setBrushColor,
  colorPalette,
}: Props) {
  return (
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
        <Select
          value={brushShape}
          onValueChange={(value: "circle" | "square") => setBrushShape(value)}
        >
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
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="flex-1 h-10 rounded border border-gray-600"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0"
              title="Click to open color picker"
            >
              <Pipette className="w-4 h-4 text-white" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {colorPalette.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded border-2 ${
                  brushColor === color ? "border-white" : "border-gray-600"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setBrushColor(color)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolsPanel;
