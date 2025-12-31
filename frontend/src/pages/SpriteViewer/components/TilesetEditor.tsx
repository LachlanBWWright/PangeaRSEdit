import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";

export interface TilesetEditorProps {
  tileCount: number;
  onSelectTile?: (tileIndex: number) => void;
  selectedTileIndex?: number;
  currentTilesetScene?: string;
  currentPaletteScene?: string;
  onPaletteSceneChange?: (sceneName: string) => void;
}

export function TilesetEditor({
  tileCount,
  onSelectTile,
  selectedTileIndex,
  currentTilesetScene,
  currentPaletteScene,
  onPaletteSceneChange,
}: TilesetEditorProps) {
  const [viewMode, setViewMode] = useState<"grid" | "individual">("grid");
  const [tileSearchFilter, setTileSearchFilter] = useState("");
  const [highlightTransparent, setHighlightTransparent] = useState(false);

  const sceneNames = ["bargain", "candy", "clown", "fairy", "jurassic"];

  const filteredTiles = tileSearchFilter
    ? Array.from({ length: tileCount })
        .map((_, i) => i)
        .filter((i) => i.toString().includes(tileSearchFilter.toLowerCase()))
    : Array.from({ length: tileCount }).map((_, i) => i);

  return (
    <div className="space-y-4">
      {/* View Mode and Options */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Tileset Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Palette Scene Selector */}
          {onPaletteSceneChange && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Render Palette
              </label>
              <select
                value={currentPaletteScene || ""}
                onChange={(e) => {
                  onPaletteSceneChange(e.target.value);
                }}
                className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
              >
                {sceneNames.map((scene) => (
                  <option
                    key={scene}
                    value={scene}
                    style={{ backgroundColor: "#1a1a2e", color: "white" }}
                  >
                    {scene.charAt(0).toUpperCase() + scene.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Tileset:{" "}
                {currentTilesetScene
                  ? currentTilesetScene.charAt(0).toUpperCase() +
                    currentTilesetScene.slice(1)
                  : "None"}
              </p>
            </div>
          )}

          {/* View Mode Selector */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">
              View Mode
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                className={viewMode === "grid" ? "" : "text-white"}
                onClick={() => {
                  setViewMode("grid");
                }}
              >
                Grid View
              </Button>
              <Button
                size="sm"
                variant={viewMode === "individual" ? "default" : "outline"}
                className={viewMode === "individual" ? "" : "text-white"}
                onClick={() => {
                  setViewMode("individual");
                }}
              >
                Details
              </Button>
            </div>
          </div>

          {/* Tile Search */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">
              Search Tiles
            </label>
            <input
              type="text"
              placeholder="Filter by tile number..."
              value={tileSearchFilter}
              onChange={(e) => {
                setTileSearchFilter(e.target.value);
              }}
              className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Showing {filteredTiles.length} of {tileCount} tiles
            </p>
          </div>

          {/* Display Options */}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-white">
              <input
                type="checkbox"
                checked={highlightTransparent}
                onChange={(e) => {
                  setHighlightTransparent(e.target.checked);
                }}
                className="w-4 h-4"
              />
              <span className="text-white">Highlight Transparent</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-white"
              onClick={() => {
                toast.info("Total tiles: " + String(tileCount));
              }}
            >
              <RotateCw className="w-3 h-3 mr-1" />
              Info
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-white"
              onClick={() => {
                toast.info("Export feature coming soon");
              }}
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tile Details (when individual tile is selected) */}
      {selectedTileIndex !== undefined && (
        <Card className="bg-gray-800 border-gray-700 border-blue-500">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              {"Tile #" + String(selectedTileIndex)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Index:</span>
                <p className="text-white font-mono">{selectedTileIndex}</p>
              </div>
              <div>
                <span className="text-gray-400">Size:</span>
                <p className="text-white font-mono">32×32 px</p>
              </div>
              <div>
                <span className="text-gray-400">Format:</span>
                <p className="text-white font-mono">8-bit indexed</p>
              </div>
              <div>
                <span className="text-gray-400">Data:</span>
                <p className="text-white font-mono">1024 bytes</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 block">Actions</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white"
                  onClick={() => {
                    toast.info("Copy tile " + String(selectedTileIndex));
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white"
                  onClick={() => {
                    toast.info("Replace tile " + String(selectedTileIndex));
                  }}
                >
                  <RotateCw className="w-3 h-3 mr-1" />
                  Replace
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tile Grid Display */}
      {viewMode === "grid" && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-xs">Tile Grid</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-1 p-2 bg-gray-900 rounded overflow-auto max-h-96"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
              }}
            >
              {filteredTiles.map((tileNum) => (
                <div
                  key={tileNum}
                  className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xs cursor-pointer transition ${
                    selectedTileIndex === tileNum
                      ? "border-blue-500 bg-blue-900 text-white"
                      : "border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-600"
                  }`}
                  onClick={() => onSelectTile?.(tileNum)}
                  title={"Tile " + String(tileNum)}
                >
                  {tileNum}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual View */}
      {viewMode === "individual" && selectedTileIndex !== undefined && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-xs">
              {"Tile Details: #" + String(selectedTileIndex)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs space-y-2 text-gray-300">
              <p>
                <span className="text-gray-400">Tile Index:</span>{" "}
                {selectedTileIndex}
              </p>
              <p>
                <span className="text-gray-400">Dimensions:</span> 32×32 pixels
              </p>
              <p>
                <span className="text-gray-400">Color Format:</span> 8-bit
                indexed (256 colors)
              </p>
              <p>
                <span className="text-gray-400">Data Size:</span> 1024 bytes
              </p>
              <p>
                <span className="text-gray-400">Transparency:</span> Color index
                255
              </p>
            </div>

            <div className="border-t border-gray-600 pt-3">
              <label className="text-xs text-gray-400 block mb-2">
                Tile Operations
              </label>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-white"
                  onClick={() => {
                    toast.info(
                      "Duplicating tile " + String(selectedTileIndex) + "...",
                    );
                  }}
                >
                  Duplicate Tile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-white"
                  onClick={() => {
                    toast.info(
                      "Exporting tile " + String(selectedTileIndex) + "...",
                    );
                  }}
                >
                  Export as PNG
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-3">
              <label className="text-xs text-gray-400 block mb-2">
                Navigation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white"
                  onClick={() => {
                    if (selectedTileIndex > 0) {
                      onSelectTile?.(selectedTileIndex - 1);
                    }
                  }}
                  disabled={selectedTileIndex === 0}
                >
                  ← Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white"
                  onClick={() => {
                    if (selectedTileIndex < tileCount - 1) {
                      onSelectTile?.(selectedTileIndex + 1);
                    }
                  }}
                  disabled={selectedTileIndex >= tileCount - 1}
                >
                  Next →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
