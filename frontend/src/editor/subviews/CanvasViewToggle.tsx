import { useAtom } from "jotai";
import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CanvasView,
  CanvasViewMode,
} from "@/data/canvasView/canvasViewAtoms";
import { ShowItemThumbnailPreviews } from "@/data/canvasView/canvasDisplaySettingsAtoms";

export function CanvasViewToggle() {
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showItemThumbnails, setShowItemThumbnails] = useAtom(
    ShowItemThumbnailPreviews,
  );

  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1 rounded-md bg-background/90 p-1 shadow-sm">
      <div className="flex gap-1" aria-label="Canvas view">
        {[CanvasView.TWO_D, CanvasView.THREE_D].map((mode) => {
          const label = mode === CanvasView.TWO_D ? "2D" : "3D";
          const isSelected = canvasViewMode === mode;
          return (
            <Button
              key={label}
              type="button"
              variant="selectable"
              size="sm"
              aria-pressed={isSelected}
              onClick={() => setCanvasViewMode(mode)}
            >
              {label}
            </Button>
          );
        })}
      </div>
      <div className="relative">
        <Button
          type="button"
          variant="selectable"
          size="icon"
          aria-label="Canvas display settings"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Canvas display settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        {isSettingsOpen && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-gray-700 bg-gray-900/97 p-3 text-white shadow-2xl">
            <div className="mb-2 flex items-center justify-between border-b border-gray-700 pb-2">
              <span className="text-sm font-semibold">Canvas settings</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400"
                aria-label="Close canvas settings"
                onClick={() => setIsSettingsOpen(false)}
              >
                ✕
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={showItemThumbnails}
                onCheckedChange={(checked) =>
                  setShowItemThumbnails(checked === true)
                }
              />
              <span>Show item thumbnails</span>
            </label>
            <p className="mt-1 pl-6 text-xs text-gray-400">
              Replace 2D item and spline-item numbers with previews.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
