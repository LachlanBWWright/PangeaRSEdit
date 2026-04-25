/**
 * Item Model Viewer
 *
 * A test page for viewing 3D models by selecting a game and item.
 * Shows item names (like "Exit Rocket") instead of mesh names (like "Mesh_001").
 * Uses the item mappers to find the correct model file and index for each item.
 */

import { mapErr } from "@/utils/mapErr";
import React, { useState, useCallback, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Group, Mesh, BufferGeometry } from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Game,
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  NanosaurGlobals,
  Nanosaur2Globals,
  CroMagGlobals,
  BillyFrontierGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { ottoItemMapper } from "@/data/items/mappers/ottoItemMapper";
import type { UniversalItemModelMapping } from "@/data/items/itemModelTypes";
import { getCitationPermalink } from "@/data/items/itemModelTypes";
import { ResultAsync, err, ok, type Result } from "neverthrow";

/**
 * Camera configuration for optimal model viewing
 * Position values based on typical Pangea game model scales (~100-500 units)
 */
const CAMERA_POSITION: [number, number, number] = [300, 200, 300];
const CAMERA_FOV = 50;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 50000; // Large far plane to prevent clipping on large models

/**
 * Grid configuration
 */
const GRID_SIZE = 1000;
const GRID_CELL_SIZE = 50;
const GRID_SECTION_SIZE = 200;
const GRID_FADE_DISTANCE = 2000;

/**
 * Worker timeout configuration
 */
const WORKER_TIMEOUT_MS = 60000; // 60 seconds for large model files

/**
 * Game configuration with globals reference
 */
interface GameOption {
  id: Game;
  name: string;
  globals: GlobalsInterface;
  basePath: string;
}

const GAME_OPTIONS: GameOption[] = [
  {
    id: Game.OTTO_MATIC,
    name: "Otto Matic",
    globals: OttoGlobals,
    basePath: "/PangeaRSEdit/games/ottomatic",
  },
  {
    id: Game.BUGDOM,
    name: "Bugdom (3DMF)",
    globals: BugdomGlobals,
    basePath: "/PangeaRSEdit/games/bugdom1",
  },
  {
    id: Game.BUGDOM_2,
    name: "Bugdom 2",
    globals: Bugdom2Globals,
    basePath: "/PangeaRSEdit/games/bugdom2",
  },
  {
    id: Game.NANOSAUR,
    name: "Nanosaur (3DMF)",
    globals: NanosaurGlobals,
    basePath: "/PangeaRSEdit/games/nanosaur1",
  },
  {
    id: Game.NANOSAUR_2,
    name: "Nanosaur 2",
    globals: Nanosaur2Globals,
    basePath: "/PangeaRSEdit/games/nanosaur2",
  },
  {
    id: Game.CRO_MAG,
    name: "Cro-Mag Rally",
    globals: CroMagGlobals,
    basePath: "/PangeaRSEdit/games/cromagrally",
  },
  {
    id: Game.BILLY_FRONTIER,
    name: "Billy Frontier",
    globals: BillyFrontierGlobals,
    basePath: "/PangeaRSEdit/games/billyfrontier",
  },
];

/**
 * Item info for display
 */
interface ItemInfo {
  type: number;
  name: string;
  hasMapping: boolean;
  mapping: UniversalItemModelMapping | undefined;
  isSplineItem: boolean;
  isParamDependent?: boolean; // True if this item's model depends on params
}

/**
 * Format item display string with indicators
 * @param item - The item info
 * @returns Formatted string like "4: Human ✓ ↺"
 */
function formatItemDisplay(item: ItemInfo): string {
  const modelIndicator = item.hasMapping ? " ✓" : "";
  const splineIndicator = item.isSplineItem ? " ↺" : "";
  const paramIndicator = item.isParamDependent ? " ⚙" : "";
  return `${item.type}: ${item.name}${modelIndicator}${splineIndicator}${paramIndicator}`;
}

/**
 * 3D Model display component
 */
const ModelDisplay: React.FC<{ gltfScene: Group | null }> = ({ gltfScene }) => {
  if (!gltfScene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" wireframe />
      </mesh>
    );
  }

  return <primitive object={gltfScene} />;
};

/**
 * Calculate model statistics (vertices, faces)
 */
function calculateModelStats(scene: Group | null): {
  vertices: number;
  faces: number;
} {
  let vertices = 0;
  let faces = 0;

  if (!scene) return { vertices, faces };

  scene.traverse((object) => {
    if (object instanceof Mesh) {
      const geometry = object.geometry;
      if (geometry instanceof BufferGeometry) {
        const position = geometry.getAttribute("position");
        if (position) {
          vertices += position.count;
        }
        const index = geometry.getIndex();
        if (index) {
          faces += index.count / 3;
        } else if (position) {
          faces += position.count / 3;
        }
      }
    }
  });

  return { vertices, faces };
}

/**
 * Extract a specific subgroup from a GLTF scene by index.
 * When groupSize > 1, extracts consecutive subgroups and combines them.
 */
function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize = 1,
): Group | null {
  const groupsContainer =
    gltf.scene.children && gltf.scene.children.length > 0
      ? gltf.scene.children[0]
      : null;

  if (!groupsContainer) {
    console.warn("No groups container found");
    return null;
  }

  if (modelIndex >= groupsContainer.children.length) {
    console.warn(
      `Model index ${modelIndex} out of range (max ${groupsContainer.children.length - 1})`,
    );
    return null;
  }

  const newScene = new Group();
  const endIndex = Math.min(
    modelIndex + groupSize,
    groupsContainer.children.length,
  );

  for (let i = modelIndex; i < endIndex; i++) {
    const targetModel = groupsContainer.children[i];
    if (targetModel) {
      newScene.add(targetModel.clone(true));
    }
  }

  if (newScene.children.length === 0) {
    return null;
  }

  return newScene;
}

export function ItemModelViewer() {
  const [selectedGameId, setSelectedGameId] = useState<Game | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gltfScene, setGltfScene] = useState<Group | null>(null);
  const [status, setStatus] = useState<string>(
    "Select a game and item to begin",
  );
  const [modelStats, setModelStats] = useState<{
    vertices: number;
    faces: number;
  } | null>(null);
  const [loadedModelInfo, setLoadedModelInfo] = useState<{
    file: string;
    index: number;
    mapping?: UniversalItemModelMapping;
  } | null>(null);

  // Params state for param-dependent items
  const [itemParams, setItemParams] = useState<{
    p0: number;
    p1: number;
    p2: number;
    p3: number;
  }>({
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  });

  // Helper to get param value by index
  const getParamValue = (paramIndex: number): number => {
    switch (paramIndex) {
      case 0:
        return itemParams.p0;
      case 1:
        return itemParams.p1;
      case 2:
        return itemParams.p2;
      case 3:
        return itemParams.p3;
      default:
        return 0;
    }
  };

  const workerRef = useRef<Worker | null>(null);

  // Get the current game option
  const selectedGame = GAME_OPTIONS.find((g) => g.id === selectedGameId);

  // Get item mapper for the selected game
  const mapper =
    selectedGameId !== null ? getGameMapper(selectedGameId) : undefined;

  // Check if current item is param-dependent
  const paramDependentInfo = useMemo(() => {
    if (selectedGameId !== Game.OTTO_MATIC || selectedItemType === null)
      return null;
    const options = ottoItemMapper.getParamDependentOptions(selectedItemType);
    if (!options) return null;

    // Validate paramIndex is 0-3
    const paramIndex = options.paramIndex;
    if (
      paramIndex !== 0 &&
      paramIndex !== 1 &&
      paramIndex !== 2 &&
      paramIndex !== 3
    ) {
      return null;
    }

    return {
      paramIndex,
      options: options.options.map((opt) => ({
        value: opt.value,
        name: opt.label,
      })),
    };
  }, [selectedGameId, selectedItemType]);

  // Get current mapping based on params
  const currentMapping = useMemo(() => {
    if (selectedItemType === null || !mapper) return undefined;
    return mapper.getMapping(selectedItemType, undefined, itemParams);
  }, [selectedItemType, mapper, itemParams]);

  // Get all items for the selected game with their mapping status
  const gameItems = useMemo<ItemInfo[]>(() => {
    if (!selectedGame) return [];

    const itemTypes = selectedGame.globals.ITEM_TYPES;
    const splineItemTypes = selectedGame.globals.SPLINE_ITEM_TYPES;
    const items: ItemInfo[] = [];
    const isOttoMatic = selectedGame.id === Game.OTTO_MATIC;

    for (const [typeStr, name] of Object.entries(itemTypes)) {
      const type = parseInt(typeStr);
      if (isNaN(type)) continue;

      // Use hasModel which accounts for param-dependent items
      const hasMapping = mapper?.hasModel(type) ?? false;
      const mapping = mapper?.getMapping(type);
      // Check if this item type can be used as a spline item
      const isSplineItem =
        splineItemTypes !== undefined && type in splineItemTypes;
      // Check if this is a param-dependent item using the Otto mapper
      const isParamDependent = isOttoMatic
        ? ottoItemMapper.isParamDependent(type)
        : false;

      items.push({
        type,
        name,
        hasMapping,
        mapping,
        isSplineItem,
        isParamDependent,
      });
    }

    // Sort by type number
    items.sort((a, b) => a.type - b.type);

    return items;
  }, [selectedGame, mapper]);

  // Get the selected item info
  const selectedItem = gameItems.find((i) => i.type === selectedItemType);

  // Count items with mappings and spline items
  const mappedItemCount = gameItems.filter((i) => i.hasMapping).length;
  const splineItemCount = gameItems.filter((i) => i.isSplineItem).length;

  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);

  // Reset state when game changes
  const handleGameChange = useCallback((gameIdStr: string) => {
    const gameId = parseInt(gameIdStr) as Game;
    setSelectedGameId(gameId);
    setSelectedItemType(null);
    setGltfScene(null);
    setModelStats(null);
    setLoadedModelInfo(null);
    setError(null);
    setItemParams({ p0: 0, p1: 0, p2: 0, p3: 0 });
    setStatus("Select an item to load its 3D model");
  }, []);

  // Handle item selection
  const handleItemChange = useCallback(
    (itemTypeStr: string) => {
      const itemType = parseInt(itemTypeStr);
      setSelectedItemType(itemType);
      setGltfScene(null);
      setModelStats(null);
      setLoadedModelInfo(null);
      setError(null);
      setItemParams({ p0: 0, p1: 0, p2: 0, p3: 0 }); // Reset params

      const item = gameItems.find((i) => i.type === itemType);
      if (item) {
        if (item.hasMapping || item.isParamDependent) {
          setStatus(`Selected: ${item.name} - Click "Load Model" to view`);
        } else {
          setStatus(`Selected: ${item.name} - No model mapping available`);
        }
      }
    },
    [gameItems],
  );

  // Handle param change for param-dependent items
  const handleParamChange = useCallback((paramName: string, value: number) => {
    setItemParams((prev) => ({ ...prev, [paramName]: value }));
    setGltfScene(null); // Clear loaded model when param changes
    setLoadedModelInfo(null);
  }, []);

  // Load the model for the selected item
  const loadItemModel = useCallback(async () => {
    // Use currentMapping which accounts for params
    if (!selectedGame || selectedItemType === null || !currentMapping) {
      setError("No model mapping available for this item");
      return;
    }

    const mapping = currentMapping;
    setLoading(true);
    setError(null);
    setStatus(`Loading model for ${selectedItem?.name ?? "item"}...`);

    // Construct the model path using the mapping's directory (either "models" or "skeletons")
    const modelPath = [
      selectedGame.basePath,
      mapping.modelPath,
      mapping.modelFile,
    ].join("/");

    console.log(
      `Loading model from: ${modelPath}, index: ${mapping.modelIndex}`,
    );
    setStatus(`Fetching ${mapping.modelFile}...`);

    const responseResult = await ResultAsync.fromPromise(
      fetch(modelPath),
      mapErr,
    );
    if (responseResult.isErr()) {
      const msg = responseResult.error;
      setError(msg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${msg}`);
      setLoading(false);
      return;
    }
    const response = responseResult.value;
    if (!response.ok) {
      const errorMsg = `Failed to fetch model: ${response.statusText} (${modelPath})`;
      setError(errorMsg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${errorMsg}`);
      setLoading(false);
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      const msg = bufferResult.error;
      setError(msg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${msg}`);
      console.error("Model load error:", bufferResult.error);
      setLoading(false);
      return;
    }
    const buffer = bufferResult.value;
    setStatus(`Converting ${mapping.modelFile} to GLB...`);

    // Convert via worker
    const glbBufferResult: Result<ArrayBuffer, Error> = await new Promise(
      (resolve) => {
        const worker = getWorker();
        let resolved = false;

        const handleMessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
          if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result) {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            resolve(ok(e.data.result));
          } else if (e.data.type === "error") {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            resolve(err(new Error(e.data.error)));
          }
        };

        const handleError = (error: ErrorEvent) => {
          if (!resolved) {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            resolve(err(new Error(error.message || "Worker error")));
          }
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);

        worker.postMessage({
          type: "bg3d-with-skeleton-to-glb",
          bg3dBuffer: buffer,
          skeletonData: undefined,
        });

        // Timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            resolve(err(new Error("Conversion timeout")));
          }
        }, WORKER_TIMEOUT_MS);
      },
    );

    if (glbBufferResult.isErr()) {
      const errorMsg = glbBufferResult.error;
      setError(errorMsg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${errorMsg}`);
      console.error("Model load error:", glbBufferResult.error);
      setLoading(false);
      return;
    }
    const glbBuffer = glbBufferResult.value;

    setStatus("Loading GLB into Three.js...");

    // Load into Three.js
    const blob = new Blob([glbBuffer], { type: "model/gltf-binary" });
    const blobUrl = URL.createObjectURL(blob);

    const loader = new GLTFLoader();
    const gltfResult = await ResultAsync.fromPromise(
      new Promise<GLTF>((resolve, reject) => {
        loader.load(
          blobUrl,
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err),
        );
      }),
      mapErr,
    );

    URL.revokeObjectURL(blobUrl);

    if (gltfResult.isErr()) {
      const errorMsg = gltfResult.error;
      setError(errorMsg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${errorMsg}`);
      console.error("Model load error:", gltfResult.error);
      setLoading(false);
      return;
    }
    const gltf = gltfResult.value;

    // Extract the specific model by index
    const groupSize = mapping.groupSize ?? 1;
    setStatus(
      `Extracting model at index ${mapping.modelIndex}${groupSize > 1 ? ` (${groupSize} groups)` : ""}...`,
    );
    const extracted = extractSubgroupByIndex(
      gltf,
      mapping.modelIndex,
      groupSize,
    );

    if (!extracted) {
      const errorMsg = `Could not extract model at index ${mapping.modelIndex}`;
      setError(errorMsg);
      const itemName = selectedItem?.name ?? "item";
      setStatus(`Error loading ${itemName}: ${errorMsg}`);
      setLoading(false);
      return;
    }

    // Apply scaling: uniform scale, then per-axis overrides
    const baseScale = mapping.scale ?? 1;
    const sx = baseScale * (mapping.scaleXZ ?? 1);
    const sy = baseScale * (mapping.scaleY ?? 1);
    const sz = baseScale * (mapping.scaleXZ ?? 1);
    extracted.scale.set(sx, sy, sz);

    if (mapping.rotationY) {
      extracted.rotateY(mapping.rotationY);
    }
    if (mapping.positionOffset) {
      extracted.position.set(
        mapping.positionOffset[0],
        mapping.positionOffset[1],
        mapping.positionOffset[2],
      );
    }

    setGltfScene(extracted);
    setModelStats(calculateModelStats(extracted));
    setLoadedModelInfo({
      file: mapping.modelFile,
      index: mapping.modelIndex,
      mapping,
    });

    const itemName = selectedItem?.name ?? "item";
    setStatus(
      `Loaded: ${itemName} (${mapping.modelFile} @ index ${mapping.modelIndex})`,
    );
    setLoading(false);
  }, [selectedGame, selectedItemType, selectedItem, currentMapping, getWorker]);

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-900">
      {/* Controls Panel */}
      <Card className="w-96 shrink-0 bg-gray-800 border-gray-700 overflow-auto">
        <CardHeader>
          <CardTitle className="text-white">Item Model Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game Selector */}
          <div className="space-y-2">
            <Label className="text-gray-300">Game</Label>
            <Select
              value={selectedGameId !== null ? String(selectedGameId) : ""}
              onValueChange={handleGameChange}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {GAME_OPTIONS.map((game) => (
                  <SelectItem
                    key={game.id}
                    value={String(game.id)}
                    className="text-white hover:bg-gray-600"
                  >
                    {game.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Selector */}
          {selectedGame && (
            <div className="space-y-2">
              <Label className="text-gray-300">
                Item ({mappedItemCount}/{gameItems.length} have models
                {splineItemCount > 0 ? `; ${splineItemCount} spline items` : ""}
                )
              </Label>
              <Select
                value={
                  selectedItemType !== null ? String(selectedItemType) : ""
                }
                onValueChange={handleItemChange}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-80">
                  {gameItems.map((item) => (
                    <SelectItem
                      key={item.type}
                      value={String(item.type)}
                      className={`text-white hover:bg-gray-600 ${
                        item.hasMapping ? "text-green-300" : "text-gray-400"
                      }`}
                    >
                      {formatItemDisplay(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Param Selector for param-dependent items */}
          {paramDependentInfo && selectedItem && (
            <div className="p-3 bg-purple-900/30 border border-purple-700 rounded space-y-2">
              <div
                className="text-purple-300 text-sm font-medium"
                aria-label="Model variant selector - model varies by parameter"
              >
                <span aria-hidden="true">⚙</span> Model Variant (p
                {paramDependentInfo.paramIndex})
              </div>
              <Select
                value={String(getParamValue(paramDependentInfo.paramIndex))}
                onValueChange={(val) =>
                  handleParamChange(
                    `p${paramDependentInfo.paramIndex}`,
                    parseInt(val),
                  )
                }
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {paramDependentInfo.options.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={String(opt.value)}
                      className="text-white hover:bg-gray-600"
                    >
                      {opt.value}: {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Item Info */}
          {selectedItem && (
            <div className="p-3 bg-gray-700/50 rounded text-sm space-y-1">
              <div className="text-white font-medium">{selectedItem.name}</div>
              <div className="text-gray-400">Type: {selectedItem.type}</div>
              {selectedItem.isSplineItem && (
                <div className="text-cyan-300">↺ Can be a spline item</div>
              )}
              {selectedItem.isParamDependent && (
                <div className="text-purple-300">
                  ⚙ Model varies by parameter
                </div>
              )}
              {currentMapping && (
                <>
                  <div className="text-blue-300">
                    File: {currentMapping.modelFile}
                  </div>
                  <div className="text-blue-300">
                    Index: {currentMapping.modelIndex}
                    {currentMapping.groupSize && currentMapping.groupSize > 1
                      ? ` (${currentMapping.groupSize} groups)`
                      : ""}
                  </div>
                  {currentMapping.requiresSkeleton && (
                    <div className="text-purple-300">
                      Requires skeleton: {currentMapping.skeletonFile}
                    </div>
                  )}
                </>
              )}
              {!currentMapping && !selectedItem.isParamDependent && (
                <div className="text-yellow-400">No model mapping defined</div>
              )}
            </div>
          )}

          {/* Load Button */}
          <Button
            onClick={loadItemModel}
            disabled={loading || !currentMapping}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Loading..." : "Load Model"}
          </Button>

          {/* Status */}
          <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
            {status}
          </div>

          {/* Loaded Model Info */}
          {loadedModelInfo && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded text-sm text-green-300 space-y-1">
              <div>Loaded from: {loadedModelInfo.file}</div>
              <div>Model index: {loadedModelInfo.index}</div>
              {loadedModelInfo.mapping?.scale && (
                <div>Scale: {loadedModelInfo.mapping.scale}</div>
              )}
              {loadedModelInfo.mapping?.groupSize &&
                loadedModelInfo.mapping.groupSize > 1 && (
                  <div>Group size: {loadedModelInfo.mapping.groupSize}</div>
                )}
              {loadedModelInfo.mapping?.citations &&
                loadedModelInfo.mapping.citations.length > 0 &&
                selectedGameId !== null && (
                  <div className="mt-2 pt-2 border-t border-green-700/50">
                    <div className="text-xs text-green-400 font-semibold mb-1">
                      Source Citations:
                    </div>
                    {loadedModelInfo.mapping.citations.map((cite, i) => {
                      const permalink = getCitationPermalink(
                        selectedGameId,
                        cite,
                      );
                      return (
                        <div key={i} className="text-xs text-green-400/80">
                          {permalink ? (
                            <a
                              href={permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-green-300"
                            >
                              {cite.file}:{cite.line}
                            </a>
                          ) : (
                            <span>
                              {cite.file}:{cite.line}
                            </span>
                          )}
                          {" — "}
                          {cite.description}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* Model Stats */}
          {modelStats && (
            <div className="p-3 bg-gray-700/50 rounded text-sm text-gray-400 flex gap-4">
              <span>Vertices: {modelStats.vertices.toLocaleString()}</span>
              <span>
                Faces: {Math.round(modelStats.faces).toLocaleString()}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Green items (✓) have 3D model mappings</p>
            <p>• Cyan items (↺) can be placed on splines</p>
            <p>• Purple items (⚙) have param-dependent models</p>
            <p>• Gray items don't have models defined yet</p>
            <p>• Model mappings are based on game source code analysis</p>
          </div>
        </CardContent>
      </Card>

      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Canvas
          camera={{
            position: CAMERA_POSITION,
            fov: CAMERA_FOV,
            near: CAMERA_NEAR,
            far: CAMERA_FAR,
          }}
          style={{ background: "#1a1a2e" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 2, 1]} intensity={1} />

          <ModelDisplay gltfScene={gltfScene} />

          <OrbitControls />
          <Grid
            args={[GRID_SIZE, GRID_SIZE]}
            cellSize={GRID_CELL_SIZE}
            cellThickness={0.5}
            cellColor="#3a3a5a"
            sectionSize={GRID_SECTION_SIZE}
            sectionThickness={1}
            sectionColor="#5a5a8a"
            fadeDistance={GRID_FADE_DISTANCE}
            fadeStrength={1}
          />
          <axesHelper args={[100]} />
        </Canvas>
      </div>
    </div>
  );
}
