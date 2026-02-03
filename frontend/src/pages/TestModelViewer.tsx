/**
 * Test Model Viewer
 * 
 * A dedicated page for testing 3D model loading from different games.
 * Allows selecting a game, model file, and specific model index to load.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Group } from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Game configuration for model loading
 */
interface GameConfig {
  id: string;
  name: string;
  basePath: string;
  modelFiles: string[];
  skeletonPath?: string;
  skeletonFiles?: string[];
  format: "bg3d" | "3dmf";
}

const GAME_CONFIGS: GameConfig[] = [
  {
    id: "ottomatic",
    name: "Otto Matic",
    basePath: "/PangeaRSEdit/games/ottomatic/models",
    skeletonPath: "/PangeaRSEdit/games/ottomatic/skeletons",
    modelFiles: [
      "global.bg3d",
      "level1_farm.bg3d",
      "level2_slime.bg3d",
      "level3_blobboss.bg3d",
      "level4_apocalypse.bg3d",
      "level5_cloud.bg3d",
      "level6_jungle.bg3d",
      "level8_fireice.bg3d",
      "level9_saucer.bg3d",
      "level10_brainboss.bg3d",
    ],
    skeletonFiles: [
      "BeeWoman.bg3d",
      "Blob.bg3d",
      "BrainAlien.bg3d",
      "Clown.bg3d",
      "ClownFish.bg3d",
      "Corn.bg3d",
      "EliteBrainAlien.bg3d",
      "Farmer.bg3d",
      "Flamester.bg3d",
      "FlyTrap.bg3d",
      "GiantLizard.bg3d",
      "HammerBot.bg3d",
      "JawsBot.bg3d",
      "MagnetMonster.bg3d",
      "Mantis.bg3d",
      "Mutant.bg3d",
      "MutantRobot.bg3d",
      "Onion.bg3d",
      "Otto.bg3d",
      "Pitchfork.bg3d",
      "PodGuy.bg3d",
      "Scientist.bg3d",
      "Squooshy.bg3d",
      "StrongBox.bg3d",
      "SwingerBot.bg3d",
      "Tomato.bg3d",
    ],
    format: "bg3d",
  },
  {
    id: "bugdom2",
    name: "Bugdom 2",
    basePath: "/PangeaRSEdit/games/bugdom2/models",
    modelFiles: [
      "Global.bg3d",
      "Foliage.bg3d",
      "Level1_Garden.bg3d",
      "Level2_Sidewalk.bg3d",
      "Level4_Plumbing.bg3d",
      "Level5_Playroom.bg3d",
      "Level6_Closet.bg3d",
      "Level7_Gutter.bg3d",
      "Level8_Garbage.bg3d",
      "Level9_Balsa.bg3d",
      "Level10_Park.bg3d",
    ],
    format: "bg3d",
  },
  {
    id: "bugdom1",
    name: "Bugdom",
    basePath: "/PangeaRSEdit/games/bugdom1/models",
    modelFiles: [
      "Global_Models1.3dmf",
      "Global_Models2.3dmf",
      "Lawn_Models1.3dmf",
      "Lawn_Models2.3dmf",
      "Pond_Models.3dmf",
      "Forest_Models.3dmf",
      "BeeHive_Models.3dmf",
      "Night_Models.3dmf",
      "AntHill_Models.3dmf",
    ],
    format: "3dmf",
  },
  {
    id: "nanosaur2",
    name: "Nanosaur 2",
    basePath: "/PangeaRSEdit/games/nanosaur2/models",
    modelFiles: [
      "global.bg3d",
      "level1.bg3d",
      "level2.bg3d",
      "level3.bg3d",
    ],
    format: "bg3d",
  },
  {
    id: "nanosaur1",
    name: "Nanosaur",
    basePath: "/PangeaRSEdit/games/nanosaur1/models",
    modelFiles: [],
    format: "3dmf",
  },
  {
    id: "cromagrally",
    name: "Cro-Mag Rally",
    basePath: "/PangeaRSEdit/games/cromagrally/models",
    modelFiles: [],
    format: "bg3d",
  },
  {
    id: "billyfrontier",
    name: "Billy Frontier",
    basePath: "/PangeaRSEdit/games/billyfrontier/models",
    modelFiles: [],
    format: "bg3d",
  },
];

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

export function TestModelViewer() {
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [modelIndex, setModelIndex] = useState<number>(0);
  const [maxIndex, setMaxIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gltfScene, setGltfScene] = useState<Group | null>(null);
  const [fullGltf, setFullGltf] = useState<GLTF | null>(null);
  const [status, setStatus] = useState<string>("Select a game and model file to begin");
  const [showSkeletons, setShowSkeletons] = useState<boolean>(false);
  
  const workerRef = useRef<Worker | null>(null);
  
  // Get the current game config
  const gameConfig = GAME_CONFIGS.find(g => g.id === selectedGame);
  
  // Get the list of files to show based on skeleton toggle
  const availableFiles = showSkeletons && gameConfig?.skeletonFiles 
    ? gameConfig.skeletonFiles 
    : gameConfig?.modelFiles ?? [];
  
  // Get the base path based on skeleton toggle
  const basePath = showSkeletons && gameConfig?.skeletonPath 
    ? gameConfig.skeletonPath 
    : gameConfig?.basePath ?? "";
  
  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);
  
  // Load model file
  const loadModelFile = useCallback(async () => {
    if (!gameConfig || !selectedFile) {
      setError("Please select a game and model file");
      return;
    }
    
    setLoading(true);
    setError(null);
    setStatus("Fetching model file...");
    
    try {
      const url = `${basePath}/${selectedFile}`;
      console.log(`Loading model from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      setStatus(`Converting ${gameConfig.format.toUpperCase()} to GLB...`);
      
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
      
      // Store full GLTF for extraction
      setFullGltf(gltf);
      
      // Count models in the file
      const groupsContainer = gltf.scene.children[0];
      const numModels = groupsContainer?.children.length ?? 0;
      setMaxIndex(Math.max(0, numModels - 1));
      
      // Extract the requested model index
      const extracted = extractSubgroupByIndex(gltf, modelIndex);
      setGltfScene(extracted);
      
      setStatus(`Loaded! File contains ${numModels} model(s). Showing index ${modelIndex}.`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      console.error("Model load error:", err);
    } finally {
      setLoading(false);
    }
  }, [gameConfig, selectedFile, modelIndex, getWorker, basePath]);
  
  // Update displayed model when index changes (if we have a loaded GLTF)
  useEffect(() => {
    if (fullGltf) {
      const extracted = extractSubgroupByIndex(fullGltf, modelIndex);
      setGltfScene(extracted);
      setStatus(`Showing model index ${modelIndex} of ${maxIndex}`);
    }
  }, [modelIndex, fullGltf, maxIndex]);
  
  // Navigate to next/previous model
  const nextModel = () => {
    if (modelIndex < maxIndex) {
      setModelIndex(modelIndex + 1);
    }
  };
  
  const prevModel = () => {
    if (modelIndex > 0) {
      setModelIndex(modelIndex - 1);
    }
  };
  
  return (
    <div className="flex h-full gap-4 p-4 bg-gray-900">
      {/* Controls Panel */}
      <Card className="w-80 flex-shrink-0 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Test Model Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game Selector */}
          <div className="space-y-2">
            <Label className="text-gray-300">Game</Label>
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {GAME_CONFIGS.map(game => (
                  <SelectItem 
                    key={game.id} 
                    value={game.id}
                    className="text-white hover:bg-gray-600"
                  >
                    {game.name} ({game.format.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Skeleton Toggle - only show if game has skeletons */}
          {gameConfig?.skeletonFiles && gameConfig.skeletonFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSkeletons"
                checked={showSkeletons}
                onChange={(e) => {
                  setShowSkeletons(e.target.checked);
                  setSelectedFile("");  // Reset file selection when toggling
                }}
                className="w-4 h-4"
              />
              <Label htmlFor="showSkeletons" className="text-gray-300 cursor-pointer">
                Show Skeleton Characters
              </Label>
            </div>
          )}
          
          {/* Model File Selector */}
          <div className="space-y-2">
            <Label className="text-gray-300">
              {showSkeletons ? "Skeleton File" : "Model File"}
            </Label>
            <Select 
              value={selectedFile} 
              onValueChange={setSelectedFile}
              disabled={!gameConfig || availableFiles.length === 0}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder={availableFiles.length ? "Select a file" : "No files available"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                {availableFiles.map(file => (
                  <SelectItem 
                    key={file} 
                    value={file}
                    className="text-white hover:bg-gray-600"
                  >
                    {file}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Model Index */}
          <div className="space-y-2">
            <Label className="text-gray-300">Model Index (0-{maxIndex})</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={prevModel}
                disabled={modelIndex <= 0 || !fullGltf}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                ←
              </Button>
              <Input
                type="number"
                min={0}
                max={maxIndex}
                value={modelIndex}
                onChange={(e) => setModelIndex(Math.max(0, Math.min(maxIndex, parseInt(e.target.value) || 0)))}
                className="bg-gray-700 border-gray-600 text-white text-center"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={nextModel}
                disabled={modelIndex >= maxIndex || !fullGltf}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                →
              </Button>
            </div>
          </div>
          
          {/* Load Button */}
          <Button 
            onClick={loadModelFile}
            disabled={loading || !selectedGame || !selectedFile}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Loading..." : "Load Model"}
          </Button>
          
          {/* Status */}
          <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
            {status}
          </div>
          
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}
          
          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Select a game to see available model files</p>
            <p>• BG3D files contain multiple sub-models</p>
            <p>• Use index selector to browse models</p>
            <p>• 3DMF files are from older games (Bugdom, Nanosaur)</p>
          </div>
        </CardContent>
      </Card>
      
      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Canvas
          camera={{ position: [300, 200, 300], fov: 50 }}
          style={{ background: "#1a1a2e" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          <ModelDisplay gltfScene={gltfScene} />
          
          <OrbitControls />
          <Grid 
            args={[1000, 1000]} 
            cellSize={50}
            cellThickness={0.5}
            cellColor="#3a3a5a"
            sectionSize={200}
            sectionThickness={1}
            sectionColor="#5a5a8a"
            fadeDistance={2000}
            fadeStrength={1}
          />
          <axesHelper args={[100]} />
        </Canvas>
      </div>
    </div>
  );
}
