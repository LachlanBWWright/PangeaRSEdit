import { TileCanvas } from "./TileCanvas";
import { TileTransformActions } from "./TileTransformActions";

interface ReusableTileOperationsPanelProps {
  readonly imageIndex: number | null;
  readonly image: HTMLCanvasElement | null;
  readonly onRotate: () => void;
  readonly onFlipHorizontal: () => void;
  readonly onFlipVertical: () => void;
}

export function ReusableTileOperationsPanel({
  imageIndex,
  image,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
}: ReusableTileOperationsPanelProps) {
  const disabled = imageIndex === null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="overflow-hidden rounded border border-gray-600 bg-gray-900">
        <TileCanvas image={image ?? undefined} size={128} />
      </div>
      <div className="w-full max-w-64">
        <TileTransformActions
          onRotate={onRotate}
          onFlipHorizontal={onFlipHorizontal}
          onFlipVertical={onFlipVertical}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
