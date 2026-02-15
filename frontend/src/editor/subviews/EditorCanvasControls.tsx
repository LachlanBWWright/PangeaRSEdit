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
        ↩
      </button>
      <button
        onClick={redoData}
        className={buttonClassName}
        aria-label="Redo"
        title="Redo"
        disabled={dataHistoryIndex === dataHistoryLength - 1}
      >
        ↪
      </button>
      <button
        onClick={zoomOut}
        className={buttonClassName}
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={zoomIn}
        className={buttonClassName}
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
