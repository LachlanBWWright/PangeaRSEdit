/**
 * Item Model Viewer
 * 
 * A test page for viewing 3D models by selecting a game and item.
 * Shows item names (like "Exit Rocket") instead of mesh names (like "Mesh_001").
 * Uses the item mappers to find the correct model file and index for each item.
 */

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
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
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
import type { UniversalItemModelMapping } from "@/data/items/itemModelTypes";

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
    name: "Bugdom", 
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
    name: "Nanosaur", 
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
function calculateModelStats(scene: Group | null): { vertices: number; faces: number } {
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
 * Extract a specific subgroup from a GLTF scene by index
 */
function extractSubgroupByIndex(gltf: GLTF, modelIndex: number): Group | null {
  try {
    const groupsContainer = 
      gltf.scene.children && gltf.scene.children.length > 0
        ? gltf.scene.children[0]
        : null;
        
    if (!groupsContainer) {
      console.warn("No groups container found");
      return null;
    }
    
    if (modelIndex >= groupsContainer.children.length) {
      console.warn(`Model index ${modelIndex} out of range (max ${groupsContainer.children.length - 1})`);
      return null;
    }
    
    const targetModel = groupsContainer.children[modelIndex];
    if (!targetModel) {
      return null;
    }
    
    const clonedModel = targetModel.clone(true);
    const newScene = new Group();
    newScene.add(clonedModel);
    
    return newScene;
  } catch (error) {
    console.error("Error extracting subgroup:", error);
    return null;
  }
}

export function ItemModelViewer() {
  const [selectedGameId, setSelectedGameId] = useState<Game | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gltfScene, setGltfScene] = useState<Group | null>(null);
  const [status, setStatus] = useState<string>("Select a game and item to begin");
  const [modelStats, setModelStats] = useState<{ vertices: number; faces: number } | null>(null);
  const [loadedModelInfo, setLoadedModelInfo] = useState<{ file: string; index: number } | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  
  // Get the current game option
  const selectedGame = GAME_OPTIONS.find(g => g.id === selectedGameId);
  
  // Get item mapper for the selected game
  const mapper = selectedGameId !== null ? getGameMapper(selectedGameId) : undefined;
  
  // Get all items for the selected game with their mapping status
  const gameItems = useMemo<ItemInfo[]>(() => {
    if (!selectedGame) return [];
    
    const itemTypes = selectedGame.globals.ITEM_TYPES;
    const items: ItemInfo[] = [];
    
    for (const [typeStr, name] of Object.entries(itemTypes)) {
      const type = parseInt(typeStr);
      if (isNaN(type)) continue;
      
      const mapping = mapper?.getMapping(type);
      items.push({
        type,
        name,
        hasMapping: mapping !== undefined,
        mapping,
      });
    }
    
    // Sort by type number
    items.sort((a, b) => a.type - b.type);
    
    return items;
  }, [selectedGame, mapper]);
  
  // Get the selected item info
  const selectedItem = gameItems.find(i => i.type === selectedItemType);
  
  // Count items with mappings
  const mappedItemCount = gameItems.filter(i => i.hasMapping).length;
  
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
    setStatus("Select an item to load its 3D model");
  }, []);
  
  // Handle item selection
  const handleItemChange = useCallback((itemTypeStr: string) => {
    const itemType = parseInt(itemTypeStr);
    setSelectedItemType(itemType);
    setGltfScene(null);
    setModelStats(null);
    setLoadedModelInfo(null);
    setError(null);
    
    const item = gameItems.find(i => i.type === itemType);
    if (item) {
      if (item.hasMapping) {
        setStatus(`Selected: ${item.name} - Click "Load Model" to view`);
      } else {
        setStatus(`Selected: ${item.name} - No model mapping available`);
      }
    }
  }, [gameItems]);
  
  // Load the model for the selected item
  const loadItemModel = useCallback(async () => {
    if (!selectedGame || selectedItemType === null || !selectedItem?.mapping) {
      setError("No model mapping available for this item");
      return;
    }
    
    const mapping = selectedItem.mapping;
    setLoading(true);
    setError(null);
    setStatus(`Loading model for ${selectedItem.name}...`);
    
    try {
      // Construct the model path
      const modelDir = mapping.modelPath === "skeletons" ? "skeletons" : "models";
      const modelPath = `${selectedGame.basePath}/${modelDir}/${mapping.modelFile}`;
      
      console.log(`Loading model from: ${modelPath}, index: ${mapping.modelIndex}`);
      setStatus(`Fetching ${mapping.modelFile}...`);
      
      const response = await fetch(modelPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText} (${modelPath})`);
      }
      
      const buffer = await response.arrayBuffer();
      setStatus(`Converting ${mapping.modelFile} to GLB...`);
      
      // Convert via worker
      const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const worker = getWorker();
        let resolved = false;
        
        const handleMessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
          if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result) {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            resolve(e.data.result);
          } else if (e.data.type === "error") {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            reject(new Error(e.data.error));
          }
        };
        
        const handleError = (error: ErrorEvent) => {
          if (!resolved) {
            resolved = true;
            worker.removeEventListener("message", handleMessage);
            worker.removeEventListener("error", handleError);
            reject(new Error(error.message || "Worker error"));
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
            reject(new Error("Conversion timeout"));
          }
        }, 60000);
      });
      
      setStatus("Loading GLB into Three.js...");
      
      // Load into Three.js
      const blob = new Blob([glbBuffer], { type: "model/gltf-binary" });
      const blobUrl = URL.createObjectURL(blob);
      
      const loader = new GLTFLoader();
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(
          blobUrl,
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      });
      
      URL.revokeObjectURL(blobUrl);
      
      // Extract the specific model by index
      setStatus(`Extracting model at index ${mapping.modelIndex}...`);
      const extracted = extractSubgroupByIndex(gltf, mapping.modelIndex);
      
      if (!extracted) {
        throw new Error(`Could not extract model at index ${mapping.modelIndex}`);
      }
      
      // Apply scale and rotation if specified
      if (mapping.scale && mapping.scale !== 1) {
        extracted.scale.set(mapping.scale, mapping.scale, mapping.scale);
      }
      if (mapping.rotationY) {
        extracted.rotateY(mapping.rotationY);
      }
      
      setGltfScene(extracted);
      setModelStats(calculateModelStats(extracted));
      setLoadedModelInfo({ file: mapping.modelFile, index: mapping.modelIndex });
      
      setStatus(`Loaded: ${selectedItem.name} (${mapping.modelFile} @ index ${mapping.modelIndex})`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus(`Error loading ${selectedItem.name}: ${errorMsg}`);
      console.error("Model load error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedItemType, selectedItem, getWorker]);
  
  return (
    <div className="flex h-full gap-4 p-4 bg-gray-900">
      {/* Controls Panel */}
      <Card className="w-96 flex-shrink-0 bg-gray-800 border-gray-700 overflow-auto">
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
                {GAME_OPTIONS.map(game => (
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
                Item ({mappedItemCount}/{gameItems.length} have models)
              </Label>
              <Select 
                value={selectedItemType !== null ? String(selectedItemType) : ""} 
                onValueChange={handleItemChange}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-80">
                  {gameItems.map(item => (
                    <SelectItem 
                      key={item.type} 
                      value={String(item.type)}
                      className={`text-white hover:bg-gray-600 ${
                        item.hasMapping ? "text-green-300" : "text-gray-400"
                      }`}
                    >
                      {item.type}: {item.name} {item.hasMapping ? "✓" : ""}
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
              {selectedItem.mapping && (
                <>
                  <div className="text-blue-300">
                    File: {selectedItem.mapping.modelFile}
                  </div>
                  <div className="text-blue-300">
                    Index: {selectedItem.mapping.modelIndex}
                  </div>
                  {selectedItem.mapping.requiresSkeleton && (
                    <div className="text-purple-300">
                      Requires skeleton: {selectedItem.mapping.skeletonFile}
                    </div>
                  )}
                </>
              )}
              {!selectedItem.mapping && (
                <div className="text-yellow-400">No model mapping defined</div>
              )}
            </div>
          )}
          
          {/* Load Button */}
          <Button 
            onClick={loadItemModel}
            disabled={loading || !selectedItem?.hasMapping}
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
            <div className="p-3 bg-green-900/30 border border-green-700 rounded text-sm text-green-300">
              <div>Loaded from: {loadedModelInfo.file}</div>
              <div>Model index: {loadedModelInfo.index}</div>
            </div>
          )}
          
          {/* Model Stats */}
          {modelStats && (
            <div className="p-3 bg-gray-700/50 rounded text-sm text-gray-400 flex gap-4">
              <span>Vertices: {modelStats.vertices.toLocaleString()}</span>
              <span>Faces: {Math.round(modelStats.faces).toLocaleString()}</span>
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
            <p>• Gray items don't have models defined yet</p>
            <p>• Model mappings are based on game source code analysis</p>
          </div>
        </CardContent>
      </Card>
      
      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Canvas
          camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR }}
          style={{ background: "#1a1a2e" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
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
