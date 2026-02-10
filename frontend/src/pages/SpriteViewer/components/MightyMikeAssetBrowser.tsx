import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedAsset, setSelectedAsset] = useState<string>("");
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
          <Select
            value={selectedType}
            onValueChange={(value) => {
              if (value === "sprites" || value === "tga" || value === "tileset") {
                onTypeChange(value);
              } else {
                console.warn("Unknown asset type selected:", value);
              }
            }}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="sprites" className="text-white focus:bg-gray-600">
                Sprites (.shapes)
              </SelectItem>
              <SelectItem value="tga" className="text-white focus:bg-gray-600">
                Scene Images (.tga)
              </SelectItem>
              <SelectItem value="tileset" className="text-white focus:bg-gray-600">
                Tilesets (.tileset)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-2">Select Asset</label>
          <Select
            value={selectedAsset}
            onValueChange={(value) => {
              if (value) {
                onAssetSelect(value);
                setSelectedAsset("");
              }
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a file..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {availableFiles.map((file) => (
                <SelectItem
                  key={file}
                  value={file}
                  className="text-white focus:bg-gray-600"
                >
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
