import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FileType = "sprites" | "tga" | "tileset";

const AVAILABLE_SPRITES_FILES = [
  "bargain1",
  "bargain2",
  "bonus",
  "candy1",
  "candy2",
  "clown1",
  "clown2",
  "difficulty",
  "fairy1",
  "fairy2",
  "highscore",
  "infobar",
  "infobar2",
  "jurassic1",
  "jurassic2",
  "main",
  "overheadmap",
  "playerchoose",
  "title",
  "view",
  "weapon",
  "win",
];

const AVAILABLE_TGA_FILES = [
  "bargainscene",
  "candyscene",
  "clownscene",
  "dinoscene",
  "fairyscene",
];

const AVAILABLE_TILESET_FILES = [
  "bargain",
  "candy",
  "clown",
  "fairy",
  "jurassic",
];

interface MightyMikeAssetBrowserProps {
  selectedType: FileType;
  onTypeChange: (type: FileType) => void;
  onAssetSelect: (filename: string) => void;
  loading: boolean;
  loadedFilename?: string;
}

export function MightyMikeAssetBrowser({
  selectedType,
  onTypeChange,
  onAssetSelect,
  loading,
  loadedFilename,
}: MightyMikeAssetBrowserProps) {
  const getAvailableFiles = (type: FileType): string[] => {
    switch (type) {
      case "sprites":
        return AVAILABLE_SPRITES_FILES;
      case "tga":
        return AVAILABLE_TGA_FILES;
      case "tileset":
        return AVAILABLE_TILESET_FILES;
    }
  };

  const availableFiles = getAvailableFiles(selectedType);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Mighty Mike Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-2">Asset Type</label>
          <select
            value={selectedType}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "sprites" || v === "tga" || v === "tileset") {
                onTypeChange(v);
              } else {
                console.warn("Unknown asset type selected:", v);
              }
            }}
            className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
          >
            <option value="sprites" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Sprites (.shapes)</option>
            <option value="tga" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Scene Images (.tga)</option>
            <option value="tileset" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Tilesets (.tileset)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-2">Select Asset</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAssetSelect(e.target.value);
                e.target.value = "";
              }
            }}
            className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
            disabled={loading}
          >
            <option value="" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Select a file...</option>
            {availableFiles.map((f) => (
              <option key={f} value={f} style={{ color: "white", backgroundColor: "#1a1a2e" }}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-sm text-blue-400">Loading...</p>}

        {loadedFilename && (
          <p className="text-xs text-gray-500 truncate">
            Loaded: {loadedFilename}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
