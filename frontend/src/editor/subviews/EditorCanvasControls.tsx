import { Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";

interface EditorCanvasControlsProps {
  undoData: () => void;
  redoData: () => void;
  zoomOut: () => void;
  zoomIn: () => void;
  dataHistoryIndex: number;
  dataHistoryLength: number;
}

const buttonClassName =
  "p-2 rounded transition-colors bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed";

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
      <button
        onClick={undoData}
        className={buttonClassName}
        aria-label="Undo"
        title="Undo"
        disabled={dataHistoryIndex === 0}
      >
        <Undo2 className="w-5 h-5" />
      </button>
      <button
        onClick={redoData}
        className={buttonClassName}
        aria-label="Redo"
        title="Redo"
        disabled={dataHistoryIndex === dataHistoryLength - 1}
      >
        <Redo2 className="w-5 h-5" />
      </button>
      <button
        onClick={zoomOut}
        className={buttonClassName}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <button
        onClick={zoomIn}
        className={buttonClassName}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
    </div>
  );
}
