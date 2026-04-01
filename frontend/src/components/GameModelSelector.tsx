import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fromPromise } from "@/types/result";

export interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  category: "Characters" | "Levels" | "Objects";
}

export interface GameInfo {
  id: string;
  name: string;
  models: GameModel[];
}

import type { Result } from "@/types/result";

export interface GameModelSelectorProps {
  onLoadModel: (
    bg3dFile: File,
    skeletonFile?: File,
    gameLabel?: string,
  ) => Promise<Result<void, Error>>;
  loading: boolean;
}

import { GAMES } from "@/data/games";

export function GameModelSelector({
  onLoadModel,
  loading,
}: GameModelSelectorProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Characters");
  const [selectedModel, setSelectedModel] = useState<GameModel | null>(null);
  const hasSkeletonFile = selectedModel?.skeletonFile !== undefined;

  const selectedGame = GAMES.find((game) => game.id === selectedGameId);

  const availableModels =
    selectedGame?.models.filter(
      (model) => model.category === selectedCategory,
    ) || [];

  // Derive categories and memoize to keep stable identity across renders
  const availableCategories = useMemo(() => {
    const game = GAMES.find((g) => g.id === selectedGameId);
    return game
      ? Array.from(new Set(game.models.map((model) => model.category)))
      : [];
  }, [selectedGameId]);

  useEffect(() => {
    // Reset model selection when game or category changes
    Promise.resolve().then(() => setSelectedModel(null));
  }, [selectedGameId, selectedCategory]);

  useEffect(() => {
    // Reset category when game changes
    if (selectedGame && availableCategories.length > 0) {
      const firstCategory = availableCategories[0];
      if (firstCategory) {
        Promise.resolve().then(() => setSelectedCategory(firstCategory));
      }
    }
  }, [selectedGameId, selectedGame, availableCategories]);

  const handleLoadSelectedModel = async (loadSkeletons: boolean) => {
    if (!selectedModel) {
      toast.error("Please select a model to load");
      return;
    }

    // Fetch the model file (could be BG3D or 3DMF)
    const bg3dFetchResult = await fromPromise(fetch(selectedModel.bg3dFile));
    if (bg3dFetchResult.isErr()) {
      console.error("Error loading selected model:", bg3dFetchResult.error);
      toast.error(`Failed to load ${selectedModel.name}`);
      return;
    }

    const bg3dResponse = bg3dFetchResult.value;
    if (!bg3dResponse.ok) {
      toast.error(
        `Failed to fetch ${selectedModel.name}: ${bg3dResponse.status}`,
      );
      return;
    }

    const bg3dBufferResult = await fromPromise(bg3dResponse.arrayBuffer());
    if (bg3dBufferResult.isErr()) {
      console.error("Error loading selected model:", bg3dBufferResult.error);
      toast.error(`Failed to load ${selectedModel.name}`);
      return;
    }

    const bg3dArrayBuffer = bg3dBufferResult.value;

    // Determine file extension from the URL
    const fileExtension = selectedModel.bg3dFile.endsWith(".3dmf")
      ? ".3dmf"
      : ".bg3d";
    const fileName = `${selectedModel.name}${fileExtension}`;

    const bg3dFile = new File([bg3dArrayBuffer], fileName, {
      type: "application/octet-stream",
    });

    let skeletonFile: File | undefined;

    // If skeleton file exists and user wants to load it
    if (selectedModel.skeletonFile && loadSkeletons) {
      const skeletonFetchResult = await fromPromise(
        fetch(selectedModel.skeletonFile),
      );
      if (skeletonFetchResult.isErr()) {
        console.warn(
          `${selectedModel.name} skeleton file fetch failed, loading without animations`,
        );
        toast.warning(
          "Skeleton file not found, loading model without animations",
        );
      } else {
        const skeletonResponse = skeletonFetchResult.value;
        if (skeletonResponse.ok) {
          const skeletonBufferResult = await fromPromise(
            skeletonResponse.arrayBuffer(),
          );
            if (skeletonBufferResult.isErr()) {
              console.warn(
                `${selectedModel.name} skeleton file read failed, loading without animations`,
              );
              toast.warning(
              "Failed to read skeleton file, loading model without animations",
            );
          } else {
            const skeletonArrayBuffer = skeletonBufferResult.value;
            skeletonFile = new File(
              [skeletonArrayBuffer],
              `${selectedModel.name}.skeleton.rsrc`,
              {
                type: "application/octet-stream",
              },
            );
            console.log(`Loaded ${selectedModel.name} skeleton file`);
          }
        } else {
          console.warn(
            `${selectedModel.name} skeleton file not found, loading without animations`,
          );
          toast.warning(
            "Skeleton file not found, loading model without animations",
          );
        }
      }
    }

    const loadResult = await onLoadModel(
      bg3dFile,
      skeletonFile,
      selectedGame?.name,
    );
    if (loadResult.isErr()) {
      console.error("Error loading selected model:", loadResult.error);
      toast.error(`Failed to load ${selectedModel.name}`);
    }
  };

  return (
    <div className="space-y-4">
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
                className="text-white focus:bg-gray-600"
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
                  className="text-white focus:bg-gray-600"
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
                const model = availableModels.find((m) => m.name === modelName);
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
                    className="text-white focus:bg-gray-600"
                  >
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded border border-gray-600 bg-gray-700 p-3 text-sm text-gray-400">
              No models available for {selectedGame.name}. Files need to be
              copied to the public folder.
            </div>
          )}
        </div>
      )}

      {/* Skeleton Loading Option */}
      {selectedModel && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Animation Data</label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                disabled={!selectedModel || loading || !hasSkeletonFile}
                onClick={() => void handleLoadSelectedModel(true)}
                className="w-full capitalize"
              >
                Load With Skeleton
              </Button>
              <Button
                type="button"
                disabled={!selectedModel || loading}
                onClick={() => void handleLoadSelectedModel(false)}
                className="w-full capitalize"
              >
                Load Without Skeleton
              </Button>
            </div>
            {!hasSkeletonFile && (
              <p className="text-xs text-gray-500">
                This model does not provide a companion skeleton file.
              </p>
            )}
          </div>
      )}

      {/* Model Info */}
      {selectedModel && (
        <div className="space-y-1 rounded bg-gray-700 p-3 text-xs text-gray-400">
          <p>
            <strong>Model:</strong> {selectedModel.name}
          </p>
          <p>
            <strong>Model File:</strong> {selectedModel.bg3dFile.split("/").pop()}
          </p>
          {selectedModel.skeletonFile && (
            <p>
              <strong>Skeleton File:</strong>{" "}
              {selectedModel.skeletonFile.split("/").pop()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
