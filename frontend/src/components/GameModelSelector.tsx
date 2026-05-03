import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";

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

import { Result } from "neverthrow";

export interface GameModelSelectorProps {
  onLoadModel: (
    bg3dFile: File,
    skeletonFile?: File,
    gameLabel?: string,
  ) => Promise<Result<void, string>>;
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

  const selectedGame = GAMES.find((game) => game.id === selectedGameId);

  // Derive categories and memoize to keep stable identity across renders
  const availableCategories = useMemo(() => {
    const game = GAMES.find((g) => g.id === selectedGameId);
    return game
      ? Array.from(new Set(game.models.map((model) => model.category)))
      : [];
  }, [selectedGameId]);

  // Derive effective category: fall back to first available when current is not valid
  const isValidCategory = (cat: string): cat is GameModel["category"] =>
    cat === "Characters" || cat === "Levels" || cat === "Objects";
  const effectiveCategory =
    isValidCategory(selectedCategory) && availableCategories.includes(selectedCategory)
      ? selectedCategory
      : (availableCategories[0] ?? "Characters");

  const availableModels =
    selectedGame?.models.filter(
      (model) => model.category === effectiveCategory,
    ) ?? [];

  // Derive effective model: if selected model is not in current list, treat as null
  const effectiveModel =
    availableModels.find((m) => m === selectedModel) ?? null;

  const handleLoadSelectedModel = async (model: GameModel) => {
    if (!selectedGame) {
      toast.error("Please select a model to load");
      return;
    }

    // Fetch the model file (could be BG3D or 3DMF)
    const bg3dFetchResult = await ResultAsync.fromPromise(
      fetch(model.bg3dFile),
      mapErr,
    );
    if (bg3dFetchResult.isErr()) {
      console.error("Error loading selected model:", bg3dFetchResult.error);
      toast.error(`Failed to load ${model.name}`);
      return;
    }

    const bg3dResponse = bg3dFetchResult.value;
    if (!bg3dResponse.ok) {
      toast.error(
        `Failed to fetch ${model.name}: ${bg3dResponse.status}`,
      );
      return;
    }

    const bg3dBufferResult = await ResultAsync.fromPromise(
      bg3dResponse.arrayBuffer(),
      mapErr,
    );
    if (bg3dBufferResult.isErr()) {
      console.error("Error loading selected model:", bg3dBufferResult.error);
      toast.error(`Failed to load ${model.name}`);
      return;
    }

    const bg3dArrayBuffer = bg3dBufferResult.value;

    // Determine file extension from the URL
    const fileExtension = model.bg3dFile.endsWith(".3dmf")
      ? ".3dmf"
      : ".bg3d";
    const fileName = `${model.name}${fileExtension}`;

    const bg3dFile = new File([bg3dArrayBuffer], fileName, {
      type: "application/octet-stream",
    });

    let skeletonFile: File | undefined;

    if (model.skeletonFile) {
      const skeletonFetchResult = await ResultAsync.fromPromise(
        fetch(model.skeletonFile),
        mapErr,
      );
      if (skeletonFetchResult.isErr()) {
        console.warn(
          `${model.name} skeleton file fetch failed, loading without animations`,
        );
        toast.warning(
          "Skeleton file not found, loading model without animations",
        );
      } else {
        const skeletonResponse = skeletonFetchResult.value;
        if (skeletonResponse.ok) {
          const skeletonBufferResult = await ResultAsync.fromPromise(
            skeletonResponse.arrayBuffer(),
            mapErr,
          );
          if (skeletonBufferResult.isErr()) {
            console.warn(
              `${model.name} skeleton file read failed, loading without animations`,
            );
            toast.warning(
              "Failed to read skeleton file, loading model without animations",
            );
          } else {
            const skeletonArrayBuffer = skeletonBufferResult.value;
            skeletonFile = new File(
              [skeletonArrayBuffer],
              `${model.name}.skeleton.rsrc`,
              {
                type: "application/octet-stream",
              },
            );
            console.log(`Loaded ${model.name} skeleton file`);
          }
        } else {
          console.warn(
            `${model.name} skeleton file not found, loading without animations`,
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
      selectedGame.name,
    );
    if (loadResult.isErr()) {
      console.error("Error loading selected model:", loadResult.error);
      toast.error(`Failed to load ${model.name}`);
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
          <Select value={effectiveCategory} onValueChange={setSelectedCategory}>
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
              value={effectiveModel?.name || ""}
              onValueChange={(modelName) => {
                const model = availableModels.find((m) => m.name === modelName);
                setSelectedModel(model || null);
                if (model) {
                  void handleLoadSelectedModel(model);
                }
              }}
              disabled={loading}
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

      {/* Model Info */}
      {effectiveModel && (
        <div className="space-y-1 rounded bg-gray-700 p-3 text-xs text-gray-400">
          <p>
            <strong>Model:</strong> {effectiveModel.name}
          </p>
          <p>
            <strong>Model File:</strong> {effectiveModel.bg3dFile.split("/").pop()}
          </p>
          {effectiveModel.skeletonFile && (
            <p>
              <strong>Skeleton File:</strong>{" "}
              {effectiveModel.skeletonFile.split("/").pop()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
