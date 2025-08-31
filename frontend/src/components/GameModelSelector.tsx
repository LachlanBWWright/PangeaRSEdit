import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";

export interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  description?: string;
}

export interface GameInfo {
  id: string;
  name: string;
  models: GameModel[];
}

export interface GameModelSelectorProps {
  onLoadModel: (bg3dFile: File, skeletonFile?: File) => Promise<void>;
  loading: boolean;
}

// Game data structure - organized by game with their models
const GAMES: GameInfo[] = [
  {
    id: "ottomatic",
    name: "Otto Matic",
    models: [
      {
        name: "Otto",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/Otto.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/Otto.skeleton.rsrc",
        description: "Main character with full skeleton and animations"
      },
      {
        name: "Onion",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/Onion.bg3d", 
        skeletonFile: "/PangeaRSEdit/games/ottomatic/Onion.skeleton.rsrc",
        description: "Onion alien character with animations"
      },
      // Additional Otto Matic models will be added here when more files are copied
    ]
  },
  {
    id: "bugdom2",
    name: "Bugdom 2", 
    models: [
      // Models will be added when files are copied to /games/bugdom2/
    ]
  },
  {
    id: "cromagrally", 
    name: "Cro-Mag Rally",
    models: [
      // Models will be added when files are copied to /games/cromagrally/
    ]
  },
  {
    id: "nanosaur2",
    name: "Nanosaur 2",
    models: [
      // Models will be added when files are copied to /games/nanosaur2/
    ]
  },
  {
    id: "billyfrontier",
    name: "Billy Frontier", 
    models: [
      // Models will be added when files are copied to /games/billyfrontier/
    ]
  }
];

export function GameModelSelector({ onLoadModel, loading }: GameModelSelectorProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<GameModel | null>(null);
  const [loadWithSkeleton, setLoadWithSkeleton] = useState<boolean>(true);

  const selectedGame = GAMES.find(game => game.id === selectedGameId);
  const availableModels = selectedGame?.models || [];

  useEffect(() => {
    // Reset model selection when game changes
    setSelectedModel(null);
  }, [selectedGameId]);

  const handleLoadSelectedModel = async () => {
    if (!selectedModel) {
      toast.error("Please select a model to load");
      return;
    }

    try {
      // Fetch the BG3D file
      const bg3dResponse = await fetch(selectedModel.bg3dFile);
      if (!bg3dResponse.ok) {
        throw new Error(`Failed to fetch ${selectedModel.name}.bg3d: ${bg3dResponse.status}`);
      }

      const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
      const bg3dFile = new File([bg3dArrayBuffer], `${selectedModel.name}.bg3d`, {
        type: "application/octet-stream",
      });

      let skeletonFile: File | undefined;

      // If skeleton file exists and user wants to load it
      if (selectedModel.skeletonFile && loadWithSkeleton) {
        const skeletonResponse = await fetch(selectedModel.skeletonFile);
        if (skeletonResponse.ok) {
          const skeletonArrayBuffer = await skeletonResponse.arrayBuffer();
          skeletonFile = new File([skeletonArrayBuffer], `${selectedModel.name}.skeleton.rsrc`, {
            type: "application/octet-stream",
          });
          console.log(`Loaded ${selectedModel.name} skeleton file`);
        } else {
          console.warn(`${selectedModel.name} skeleton file not found, loading without animations`);
          toast.warning("Skeleton file not found, loading model without animations");
        }
      }

      await onLoadModel(bg3dFile, skeletonFile);
    } catch (error) {
      console.error("Error loading selected model:", error);
      toast.error(`Failed to load ${selectedModel.name}`);
    }
  };

  const hasSkeletonFile = selectedModel?.skeletonFile !== undefined;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Game Model Selector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Selection */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Game</label>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {GAMES.map((game) => (
                <SelectItem 
                  key={game.id} 
                  value={game.id}
                  className="text-white hover:bg-gray-600"
                >
                  {game.name} {game.models.length === 0 && "(No models available)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        {selectedGame && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Model</label>
            {availableModels.length > 0 ? (
              <Select 
                value={selectedModel?.name || ""} 
                onValueChange={(modelName) => {
                  const model = availableModels.find(m => m.name === modelName);
                  setSelectedModel(model || null);
                }}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {availableModels.map((model) => (
                    <SelectItem 
                      key={model.name} 
                      value={model.name}
                      className="text-white hover:bg-gray-600"
                    >
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-gray-400">{model.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-400 p-3 bg-gray-700 rounded border border-gray-600">
                No models available for {selectedGame.name}. 
                Files need to be copied to the public folder.
              </div>
            )}
          </div>
        )}

        {/* Skeleton Loading Option */}
        {selectedModel && hasSkeletonFile && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Animation Data</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="skeletonOption"
                  checked={loadWithSkeleton}
                  onChange={() => setLoadWithSkeleton(true)}
                  className="text-blue-500"
                />
                <span className="text-sm text-white">
                  Load with skeleton data (includes animations)
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="skeletonOption"
                  checked={!loadWithSkeleton}
                  onChange={() => setLoadWithSkeleton(false)}
                  className="text-blue-500"
                />
                <span className="text-sm text-white">
                  Load model only (no animations)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Load Button */}
        <Button
          onClick={handleLoadSelectedModel}
          disabled={!selectedModel || loading}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          {loading ? "Loading..." : `Load ${selectedModel?.name || "Model"}`}
        </Button>

        {/* Model Info */}
        {selectedModel && (
          <div className="text-xs text-gray-400 space-y-1 p-3 bg-gray-700 rounded">
            <p><strong>Model:</strong> {selectedModel.name}</p>
            <p><strong>BG3D File:</strong> {selectedModel.bg3dFile.split('/').pop()}</p>
            {selectedModel.skeletonFile && (
              <p><strong>Skeleton File:</strong> {selectedModel.skeletonFile.split('/').pop()}</p>
            )}
            {selectedModel.description && (
              <p><strong>Description:</strong> {selectedModel.description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}