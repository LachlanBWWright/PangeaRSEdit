import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DisplayOptions {
  zoomLevel: number;
  showGrid: boolean;
  showBounds: boolean;
  backgroundColor: string;
}

interface DisplayOptionsPanelProps {
  options: DisplayOptions;
  onOptionsChange: (options: DisplayOptions) => void;
  showSpriteOptions?: boolean;
}

export function DisplayOptionsPanel({
  options,
  onOptionsChange,
  showSpriteOptions = false,
}: DisplayOptionsPanelProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Display Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Zoom Controls */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Zoom: {options.zoomLevel.toFixed(1)}x
          </label>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="text-white flex-1"
              onClick={() =>
                { onOptionsChange({
                  ...options,
                  zoomLevel: Math.max(0.5, options.zoomLevel - 0.5),
                }); }
              }
            >
              −
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-white flex-1"
              onClick={() => { onOptionsChange({ ...options, zoomLevel: 1 }); }}
            >
              1x
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-white flex-1"
              onClick={() => { onOptionsChange({ ...options, zoomLevel: 4 }); }}
            >
              4x
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-white flex-1"
              onClick={() =>
                { onOptionsChange({
                  ...options,
                  zoomLevel: options.zoomLevel + 0.5,
                }); }
              }
            >
              +
            </Button>
          </div>
        </div>

        {/* Sprite-specific options */}
        {showSpriteOptions && (
          <>
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={options.showGrid}
                  onChange={(e) =>
                    { onOptionsChange({
                      ...options,
                      showGrid: e.target.checked,
                    }); }
                  }
                  className="w-4 h-4"
                />
                <span className="text-white">Show Grid</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={options.showBounds}
                  onChange={(e) =>
                    { onOptionsChange({
                      ...options,
                      showBounds: e.target.checked,
                    }); }
                  }
                  className="w-4 h-4"
                />
                <span className="text-white">Show Bounds</span>
              </label>
            </div>
          </>
        )}

        {/* Background Color */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Background</label>
          <div className="flex gap-2 w-full">
            {["#1a1a2e", "#000000", "#ffffff", "#ff00ff"].map((color) => (
              <button
                key={color}
                className="flex-1 h-8 rounded border-2"
                style={{
                  backgroundColor: color,
                  borderColor:
                    options.backgroundColor === color ? "#00ff00" : "transparent",
                }}
                onClick={() =>
                  { onOptionsChange({
                    ...options,
                    backgroundColor: color,
                  }); }
                }
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
