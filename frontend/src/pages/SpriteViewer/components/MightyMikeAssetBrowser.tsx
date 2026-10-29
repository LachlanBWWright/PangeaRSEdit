import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorField, EditorPanel } from "./EditorPanel";
import { Game } from "@/data/globals/globals";
import { useGameAssetAvailability } from "@/platform/desktop/assetAvailability";

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
  const { available } = useGameAssetAvailability(Game.MIGHTY_MIKE);
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
    <EditorPanel title="Game Assets">
        <p className="text-xs text-gray-400">
          Load a bundled sprite asset from the game library.
        </p>
        {!available && <p className="text-xs text-gray-400">Download Mighty Mike data in Games to use these assets.</p>}
        <EditorField label="Asset Type">
          <Select
            value={selectedType}
            onValueChange={(value) => {
              if (available && (value === "sprites" || value === "tga" || value === "tileset")) {
                setSelectedAsset("");
                onTypeChange(value);
              } else {
                console.warn("Unknown asset type selected:", value);
              }
            }}
          >
            <SelectTrigger className="w-full" aria-label="Bundled sprite asset type">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sprites" disabled={!available}>
                Sprites (.shapes)
              </SelectItem>
              <SelectItem value="tga" disabled={!available}>
                Scene Images (.tga)
              </SelectItem>
              <SelectItem value="tileset" disabled={!available}>
                Tilesets (.tileset)
              </SelectItem>
            </SelectContent>
          </Select>
        </EditorField>

        <EditorField label="Select Asset">
          <Select
            value={available ? selectedAsset : ""}
            onValueChange={(value) => {
              if (available && value) {
                setSelectedAsset(value);
                onAssetSelect(value);
              }
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-full" aria-label="Bundled sprite asset">
              <SelectValue placeholder="Select a file..." />
            </SelectTrigger>
            <SelectContent>
              {availableFiles.map((file) => (
                <SelectItem
                  key={file}
                  value={file}
                  disabled={!available}
                  className="text-white focus:bg-gray-600"
                >
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditorField>

        {loading && <p className="text-sm text-blue-400">Loading...</p>}

        {loadedFilename && (
          <p className="text-xs text-gray-500 truncate">
            Loaded: {loadedFilename}
          </p>
        )}
    </EditorPanel>
  );
}
