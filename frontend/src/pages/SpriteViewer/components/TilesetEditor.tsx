import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { EditorField, EditorPanel, MetricGrid } from "./EditorPanel";

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
    <div className="space-y-3">
      <EditorPanel title="Tileset Options">
        {onPaletteSceneChange && (
          <EditorField
            label="Render Palette"
            hint={`Tileset: ${
              currentTilesetScene
                ? currentTilesetScene.charAt(0).toUpperCase() +
                  currentTilesetScene.slice(1)
              : "None"
            }`}
          >
            <Select
              value={currentPaletteScene ?? ""}
              onValueChange={(value) => onPaletteSceneChange(value)}
            >
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a palette scene" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {sceneNames.map((scene) => (
                  <SelectItem
                    key={scene}
                    value={scene}
                    className="text-white focus:bg-gray-600"
                  >
                    {scene.charAt(0).toUpperCase() + scene.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditorField>
        )}

        <EditorField label="View Mode">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "outline"}
              className={viewMode === "grid" ? "" : "text-white"}
              onClick={() => setViewMode("grid")}
            >
              Grid View
            </Button>
            <Button
              size="sm"
              variant={viewMode === "individual" ? "default" : "outline"}
              className={viewMode === "individual" ? "" : "text-white"}
              onClick={() => setViewMode("individual")}
            >
              Details
            </Button>
          </div>
        </EditorField>

        <EditorField
          label="Search Tiles"
          hint={`Showing ${filteredTiles.length} of ${tileCount} tiles`}
        >
          <input
            type="text"
            placeholder="Filter by tile number..."
            value={tileSearchFilter}
            onChange={(e) => setTileSearchFilter(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs placeholder-gray-500"
          />
        </EditorField>

        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-white">
            <input
              type="checkbox"
              checked={highlightTransparent}
              onChange={(e) => setHighlightTransparent(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-white">Highlight Transparent</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-white"
            onClick={() => {
              toast.info(`Total tiles: ${tileCount}`);
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
      </EditorPanel>

      {selectedTileIndex !== undefined && (
        <EditorPanel title={`Tile #${selectedTileIndex}`}>
          <MetricGrid
            items={[
              { label: "Index", value: selectedTileIndex },
              { label: "Size", value: "32x32 px" },
              { label: "Format", value: "8-bit indexed" },
              { label: "Data", value: "1024 bytes" },
            ]}
          />

          <div className="space-y-2">
            <label className="text-xs text-gray-400 block">Actions</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-white"
                onClick={() => {
                  toast.info(`Copy tile ${selectedTileIndex}`);
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
                  toast.info(`Replace tile ${selectedTileIndex}`);
                }}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                Replace
              </Button>
            </div>
          </div>
        </EditorPanel>
      )}

      {viewMode === "grid" && (
        <EditorPanel title="Tile Grid">
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
                title={`Tile ${tileNum}`}
              >
                {tileNum}
              </div>
            ))}
          </div>
        </EditorPanel>
      )}

      {viewMode === "individual" && selectedTileIndex !== undefined && (
        <EditorPanel title={`Tile Details: #${selectedTileIndex}`}>
          <div className="text-xs space-y-2 text-gray-300">
            <p>
              <span className="text-gray-400">Tile Index:</span>{" "}
              {selectedTileIndex}
            </p>
            <p>
              <span className="text-gray-400">Dimensions:</span> 32x32 pixels
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
                  toast.info(`Duplicating tile ${selectedTileIndex}...`);
                }}
              >
                Duplicate Tile
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-white"
                onClick={() => {
                  toast.info(`Exporting tile ${selectedTileIndex}...`);
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
                Previous
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
                Next
              </Button>
            </div>
          </div>
        </EditorPanel>
      )}
    </div>
  );
}
