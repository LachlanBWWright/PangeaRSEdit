import { Button } from "@/components/ui/button";
import { Redo, Undo, ZoomIn, ZoomOut } from "lucide-react";
import { Image, Layer, Line, Stage } from "react-konva";
import type Konva from "konva";
import type { RefObject } from "react";
import type { BrushStroke } from "./types";
import {
  getCanvasLayoutSize,
  getLineCap,
  getLineJoin,
} from "@/components/ImageEditor/imageEditorCanvasState";

interface ImageEditorCanvasProps {
  image: HTMLImageElement;
  scale: number;
  historyIndex: number;
  historyLength: number;
  undo: () => void;
  redo: () => void;
  zoomOut: () => void;
  zoomIn: () => void;
  resetZoom: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  layerRef: RefObject<Konva.Layer | null>;
  handleMouseDown: () => void;
  handleMouseMove: () => void;
  handleMouseUp: () => void;
  selectedColorHighlightCanvas: HTMLCanvasElement | null;
  strokes: BrushStroke[];
  currentStroke: BrushStroke | null;
}

export function ImageEditorCanvas({
  image,
  scale,
  historyIndex,
  historyLength,
  undo,
  redo,
  zoomOut,
  zoomIn,
  resetZoom,
  containerRef,
  stageRef,
  layerRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  selectedColorHighlightCanvas,
  strokes,
  currentStroke,
}: ImageEditorCanvasProps) {
  const canvasLayoutSize = getCanvasLayoutSize(
    image.width,
    image.height,
    scale,
  );

  return (
    <div className="flex-1 bg-gray-900 rounded overflow-hidden relative">
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
            disabled={historyIndex >= historyLength - 1}
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
            className="h-8 px-2 text-[11px] font-medium hover:bg-gray-700 text-gray-300 min-w-12"
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
            width: canvasLayoutSize.width,
            height: canvasLayoutSize.height,
          }}
        >
          <div className="m-auto shadow-2xl border border-gray-800">
            <Stage
              ref={stageRef}
              width={image.width * scale}
              height={image.height * scale}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer ref={layerRef} scaleX={scale} scaleY={scale}>
                <Image image={image} />
                {selectedColorHighlightCanvas && (
                  <Image image={selectedColorHighlightCanvas} opacity={0.45} />
                )}

                {strokes.map((stroke, i) => (
                  <Line
                    key={i}
                    points={stroke.points}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    lineCap={getLineCap(stroke.shape)}
                    lineJoin={getLineJoin(stroke.shape)}
                    strokeScaleEnabled={false}
                    perfectDrawEnabled={false}
                    globalCompositeOperation="source-over"
                  />
                ))}

                {currentStroke && (
                  <Line
                    points={currentStroke.points}
                    stroke={currentStroke.color}
                    strokeWidth={currentStroke.size}
                    lineCap={getLineCap(currentStroke.shape)}
                    lineJoin={getLineJoin(currentStroke.shape)}
                    strokeScaleEnabled={false}
                    perfectDrawEnabled={false}
                    globalCompositeOperation="source-over"
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  );
}
