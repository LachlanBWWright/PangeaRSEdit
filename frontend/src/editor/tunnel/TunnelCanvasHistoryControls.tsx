import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TunnelCanvasHistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function TunnelCanvasHistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TunnelCanvasHistoryControlsProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="selectable"
        size="icon"
        onClick={onUndo}
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
      >
        <Undo2 className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="selectable"
        size="icon"
        onClick={onRedo}
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
      >
        <Redo2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
