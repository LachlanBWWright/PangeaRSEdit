import { Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorCanvasControlsProps {
  undoData: () => void;
  redoData: () => void;
  zoomOut: () => void;
  zoomIn: () => void;
  dataHistoryIndex: number;
  dataHistoryLength: number;
}

export function EditorCanvasControls({
  undoData,
  redoData,
  zoomOut,
  zoomIn,
  dataHistoryIndex,
  dataHistoryLength,
}: EditorCanvasControlsProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="icon"
        size="icon"
        onClick={undoData}
        aria-label="Undo"
        title="Undo"
        disabled={dataHistoryIndex === 0}
      >
        <Undo2 className="w-5 h-5" />
      </Button>
      <Button
        type="button"
        variant="icon"
        size="icon"
        onClick={redoData}
        aria-label="Redo"
        title="Redo"
        disabled={dataHistoryIndex === dataHistoryLength - 1}
      >
        <Redo2 className="w-5 h-5" />
      </Button>
      <Button
        type="button"
        variant="icon"
        size="icon"
        onClick={zoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="w-5 h-5" />
      </Button>
      <Button
        type="button"
        variant="icon"
        size="icon"
        onClick={zoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="w-5 h-5" />
      </Button>
    </div>
  );
}
