import { Button } from "@/components/ui/button";
import { FlipHorizontal, FlipVertical, RotateCw } from "lucide-react";

interface TileTransformActionsProps {
  readonly onRotate: () => void;
  readonly onFlipHorizontal: () => void;
  readonly onFlipVertical: () => void;
  readonly disabled?: boolean;
}

export function TileTransformActions({
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  disabled = false,
}: TileTransformActionsProps) {
  return (
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <Button size="sm" variant="outline" onClick={onRotate} disabled={disabled}>
        <RotateCw className="mr-1 h-4 w-4" />
        Rotate
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onFlipHorizontal}
        disabled={disabled}
      >
        <FlipHorizontal className="mr-1 h-4 w-4" />
        Flip H
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onFlipVertical}
        disabled={disabled}
      >
        <FlipVertical className="mr-1 h-4 w-4" />
        Flip V
      </Button>
    </div>
  );
}
