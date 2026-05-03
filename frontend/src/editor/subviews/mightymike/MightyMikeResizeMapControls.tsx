import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface MightyMikeResizeMapControlsProps {
  onResize: (
    direction: "top" | "bottom" | "left" | "right",
    tileCount: number,
  ) => void;
}

export function MightyMikeResizeMapControls({
  onResize,
}: MightyMikeResizeMapControlsProps) {
  const controls = [
    { direction: "top" as const, label: "Top" },
    { direction: "bottom" as const, label: "Bottom" },
    { direction: "left" as const, label: "Left" },
    { direction: "right" as const, label: "Right" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-300">Resize Map</p>
      <div className="grid grid-cols-2 gap-2">
        {controls.map(({ direction, label }) => (
          <div key={direction} className="contents">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => onResize(direction, 1)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add {label}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2"
              onClick={() => onResize(direction, -1)}
            >
              <Minus className="h-4 w-4 mr-1" />
              Remove {label}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
