import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorZoomControlsProps {
  readonly zoomLabel: string;
  readonly onZoomOut: () => void;
  readonly onResetZoom: () => void;
  readonly onZoomIn: () => void;
  readonly className?: string;
}

export function EditorZoomControls({
  zoomLabel,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  className = "",
}: EditorZoomControlsProps) {
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="group"
      aria-label="Zoom controls"
    >
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 min-w-16 px-2 text-xs tabular-nums"
        onClick={onResetZoom}
        aria-label="Reset zoom"
        title="Reset zoom"
      >
        {zoomLabel}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
