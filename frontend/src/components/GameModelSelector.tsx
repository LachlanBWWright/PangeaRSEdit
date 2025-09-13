import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";
import { toast } from "sonner";

export interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  description?: string;
  category: "Characters" | "Levels" | "Objects";
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
      // Character Models with Skeletons
      {
        name: "Otto",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc",
        description: "Main character with full skeleton and animations",
        category: "Characters"
      },
      {
        name: "Onion",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Onion.bg3d", 
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Onion.skeleton.rsrc",
        description: "Onion alien character with animations",
        category: "Characters"
      },
      {
        name: "BeeWoman",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/BeeWoman.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/BeeWoman.skeleton.rsrc",
        description: "Bee Woman character with animations",
        category: "Characters"
      },
      {
        name: "Blob",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Blob.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Blob.skeleton.rsrc",
        description: "Blob enemy with animations",
        category: "Characters"
      },
      {
        name: "BrainAlien",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/BrainAlien.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/BrainAlien.skeleton.rsrc",
        description: "Brain Alien enemy with animations",
        category: "Characters"
      },
      {
        name: "Farmer",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Farmer.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Farmer.skeleton.rsrc",
        description: "Farmer character with animations",
        category: "Characters"
      },
      {
        name: "Mutant",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mutant.bg3d",
        skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mutant.skeleton.rsrc",
        description: "Mutant enemy with animations",
        category: "Characters"
      },
      // Level Models (no skeletons)
      {
        name: "Level 1 - Farm",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level1_farm.bg3d",
        description: "Farm level environment models",
        category: "Levels"
      },
      {
        name: "Level 2 - Slime",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level2_slime.bg3d",
        description: "Slime level environment models",
        category: "Levels"
      },
      {
        name: "Global Models",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/models/global.bg3d",
        description: "Shared game objects and models",
        category: "Objects"
      },
      {
        name: "Main Menu",
        bg3dFile: "/PangeaRSEdit/games/ottomatic/models/mainmenu.bg3d",
        description: "Main menu interface models",
        category: "Objects"
      }
    ]
  },
  {
    id: "bugdom2",
    name: "Bugdom 2", 
    models: [
      // Character Models with Skeletons
      {
        name: "BuddyBug",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/BuddyBug.bg3d",
        skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/BuddyBug.skeleton.rsrc",
        description: "Main character Buddy Bug with animations",
        category: "Characters"
      },
      {
        name: "Ant",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Ant.bg3d",
        skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Ant.skeleton.rsrc",
        description: "Ant enemy with animations",
        category: "Characters"
      },
      {
        name: "BumbleBee",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/BumbleBee.bg3d",
        skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/BumbleBee.skeleton.rsrc",
        description: "Bumblebee character with animations",
        category: "Characters"
      },
      {
        name: "DragonFly",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/DragonFly.bg3d",
        skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/DragonFly.skeleton.rsrc",
        description: "Dragonfly character with animations",
        category: "Characters"
      },
      {
        name: "Frog",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Frog.bg3d",
        skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Frog.skeleton.rsrc",
        description: "Frog character with animations",
        category: "Characters"
      },
      // Level Models (no skeletons)
      {
        name: "Level 1 - Garden",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level1_Garden.bg3d",
        description: "Garden level environment models",
        category: "Levels"
      },
      {
        name: "Level 2 - Sidewalk", 
        bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level2_Sidewalk.bg3d",
        description: "Sidewalk level environment models",
        category: "Levels"
      },
      {
        name: "Global Models",
        bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Global.bg3d",
        description: "Shared game objects and models",
        category: "Objects"
      }
    ]
  },
  {
    id: "cromagrally", 
    name: "Cro-Mag Rally",
    models: [
      // Character Models with Skeletons
      {
        name: "CroMag",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/CroMag.bg3d",
        skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/CroMag.skeleton.rsrc",
        description: "Cro-Mag character with animations",
        category: "Characters"
      },
      {
        name: "Caveman",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Caveman.bg3d",
        skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Caveman.skeleton.rsrc",
        description: "Caveman character with animations",
        category: "Characters"
      },
      {
        name: "Dino",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Dino.bg3d",
        skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Dino.skeleton.rsrc",
        description: "Dinosaur character with animations",
        category: "Characters"
      },
      {
        name: "Pterodactyl",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Pterodactyl.bg3d",
        skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Pterodactyl.skeleton.rsrc",
        description: "Pterodactyl character with animations",
        category: "Characters"
      },
      {
        name: "Viking",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Viking.bg3d",
        skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Viking.skeleton.rsrc",
        description: "Viking character with animations",
        category: "Characters"
      },
      // Level Models (no skeletons)
      {
        name: "Desert Level",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/models/desert.bg3d",
        description: "Desert level environment models",
        category: "Levels"
      },
      {
        name: "Forest Level",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/models/forest.bg3d",
        description: "Forest level environment models",
        category: "Levels"
      },
      {
        name: "Global Models",
        bg3dFile: "/PangeaRSEdit/games/cromagrally/models/global.bg3d",
        description: "Shared game objects and models",
        category: "Objects"
      }
    ]
  },
  {
    id: "nanosaur2",
    name: "Nanosaur 2",
    models: [
      // Character Models with Skeletons
      {
        name: "Nano",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/nano.bg3d",
        skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/nano.skeleton.rsrc",
        description: "Main Nanosaur character with animations",
        category: "Characters"
      },
      {
        name: "Raptor",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/raptor.bg3d",
        skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/raptor.skeleton.rsrc",
        description: "Raptor dinosaur with animations",
        category: "Characters"
      },
      {
        name: "Brach",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/brach.bg3d",
        skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/brach.skeleton.rsrc",
        description: "Brachiosaurus with animations",
        category: "Characters"
      },
      {
        name: "Ramphor",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/ramphor.bg3d",
        skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/ramphor.skeleton.rsrc",
        description: "Ramphor dinosaur with animations",
        category: "Characters"
      },
      // Level Models (no skeletons)
      {
        name: "Desert Level",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/desert.bg3d",
        description: "Desert level environment models",
        category: "Levels"
      },
      {
        name: "Forest Level",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/forest.bg3d",
        description: "Forest level environment models",
        category: "Levels"
      },
      {
        name: "Global Models",
        bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/global.bg3d",
        description: "Shared game objects and models",
        category: "Objects"
      }
    ]
  },
  {
    id: "billyfrontier",
    name: "Billy Frontier", 
    models: [
      // Character Models with Skeletons
      {
        name: "Billy",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Billy.bg3d",
        skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Billy.skeleton.rsrc",
        description: "Main character Billy with animations",
        category: "Characters"
      },
      {
        name: "Bandito",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Bandito.bg3d",
        skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Bandito.skeleton.rsrc",
        description: "Bandito enemy with animations",
        category: "Characters"
      },
      {
        name: "FrogMan",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/FrogMan.bg3d",
        skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/FrogMan.skeleton.rsrc",
        description: "Frog Man character with animations",
        category: "Characters"
      },
      {
        name: "KangaRex",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaRex.bg3d",
        skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaRex.skeleton.rsrc",
        description: "Kanga Rex dinosaur with animations",
        category: "Characters"
      },
      // Level Models (no skeletons)  
      {
        name: "Town Level",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/town.bg3d",
        description: "Town level environment models",
        category: "Levels"
      },
      {
        name: "Swamp Level",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/swamp.bg3d",
        description: "Swamp level environment models",
        category: "Levels"
      },
      {
        name: "Global Models",
        bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/global.bg3d",
        description: "Shared game objects and models",
        category: "Objects"
      }
    ]
  }
];

export function GameModelSelector({ onLoadModel, loading }: GameModelSelectorProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Characters");
  const [selectedModel, setSelectedModel] = useState<GameModel | null>(null);
  const [loadWithSkeleton, setLoadWithSkeleton] = useState<boolean>(true);

  const selectedGame = GAMES.find(game => game.id === selectedGameId);
  const availableModels = selectedGame?.models.filter(model => model.category === selectedCategory) || [];
  const availableCategories = selectedGame ? 
    [...new Set(selectedGame.models.map(model => model.category))] : [];

  useEffect(() => {
    // Reset model selection when game or category changes
    setSelectedModel(null);
  }, [selectedGameId, selectedCategory]);

  useEffect(() => {
    // Reset category when game changes
    if (selectedGame && availableCategories.length > 0) {
      setSelectedCategory(availableCategories[0]);
    }
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

        {/* Model Category Selection */}
        {selectedGame && availableCategories.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {availableCategories.map((category) => (
                  <SelectItem 
                    key={category} 
                    value={category}
                    className="text-white hover:bg-gray-600"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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