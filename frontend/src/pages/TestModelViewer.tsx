/**
 * Test Model Viewer
 *
 * A dedicated page for testing 3D model loading from different games.
 * Allows selecting a game, model file, and specific model index to load.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { ResultAsync } from "neverthrow";

/**
 * Describes a model file with its path and label
 */
interface ModelFileEntry {
  filename: string;
  path: string;
  label: string;
  isSkeleton: boolean;
}

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
    skeletonPath: "/PangeaRSEdit/games/bugdom2/skeletons",
    skeletonFiles: [
      "Ant.bg3d",
      "BuddyBug.bg3d",
      "BumbleBee.bg3d",
      "Checkpoint.bg3d",
      "Chipmunk.bg3d",
      "ComputerBug.bg3d",
      "DragonFly.bg3d",
      "EvilPlant.bg3d",
      "Fish.bg3d",
      "Flea.bg3d",
      "Frog.bg3d",
      "Gnome.bg3d",
      "Grasshopper.bg3d",
      "HoboBag.bg3d",
      "HouseFly.bg3d",
      "Moth.bg3d",
      "Mouse.bg3d",
      "MouseTrap.bg3d",
      "OttoToy.bg3d",
      "Roach.bg3d",
      "Snail.bg3d",
      "SnakeHead.bg3d",
      "Soldier.bg3d",
      "Tick.bg3d",
    ],
    format: "bg3d",
  },
  {
    id: "bugdom1",
    name: "Bugdom",
    basePath: "/PangeaRSEdit/games/bugdom1/models",
    skeletonPath: "/PangeaRSEdit/games/bugdom1/skeletons",
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
    skeletonFiles: [
      "Skippy.3dmf",
      "Ant.3dmf",
      "AntKing.3dmf",
      "Bat.3dmf",
      "BoxerFly.3dmf",
      "Buddy.3dmf",
      "Caterpillar.3dmf",
      "DoodleBug.3dmf",
      "DragonFly.3dmf",
      "FireFly.3dmf",
      "FlyingBee.3dmf",
      "Foot.3dmf",
      "LadyBug.3dmf",
      "Larva.3dmf",
      "Mosquito.3dmf",
      "PondFish.3dmf",
      "QueenBee.3dmf",
      "Roach.3dmf",
      "RootSwing.3dmf",
      "Slug.3dmf",
      "Spider.3dmf",
      "WaterBug.3dmf",
      "WingedFireAnt.3dmf",
      "WorkerBee.3dmf",
    ],
    format: "3dmf",
  },
  {
    id: "nanosaur2",
    name: "Nanosaur 2",
    basePath: "/PangeaRSEdit/games/nanosaur2/models",
    skeletonPath: "/PangeaRSEdit/games/nanosaur2/skeletons",
    modelFiles: [
      "global.bg3d",
      "desert.bg3d",
      "forest.bg3d",
      "swamp.bg3d",
      "weapons.bg3d",
      "playerparts.bg3d",
      "levelintro.bg3d",
    ],
    skeletonFiles: [
      "nano.bg3d",
      "brach.bg3d",
      "ramphor.bg3d",
      "raptor.bg3d",
      "worm.bg3d",
      "bonusworm.bg3d",
      "wormhole.bg3d",
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
    skeletonPath: "/PangeaRSEdit/games/cromagrally/skeletons",
    modelFiles: [
      "global.bg3d",
      "atlantis.bg3d",
      "aztec.bg3d",
      "carparts.bg3d",
      "carselect.bg3d",
      "china.bg3d",
      "coliseum.bg3d",
      "crete.bg3d",
      "desert.bg3d",
      "egypt.bg3d",
      "europe.bg3d",
      "ice.bg3d",
      "jungle.bg3d",
      "ramps.bg3d",
      "scandinavia.bg3d",
      "stonehenge.bg3d",
      "tarpits.bg3d",
      "weapons.bg3d",
    ],
    skeletonFiles: [
      "Beetle.bg3d",
      "BirdBomb.bg3d",
      "Brog.bg3d",
      "BrogStanding.bg3d",
      "BrontoNeck.bg3d",
      "Camel.bg3d",
      "Catapult.bg3d",
      "Dragon.bg3d",
      "Druid.bg3d",
      "Flag.bg3d",
      "Flower.bg3d",
      "Grag.bg3d",
      "GragStanding.bg3d",
      "Mummy.bg3d",
      "PolarBear.bg3d",
      "Pterodactyl.bg3d",
      "Shark.bg3d",
      "Troll.bg3d",
      "Viking.bg3d",
      "Yeti.bg3d",
    ],
    format: "bg3d",
  },
  {
    id: "billyfrontier",
    name: "Billy Frontier",
    basePath: "/PangeaRSEdit/games/billyfrontier/models",
    skeletonPath: "/PangeaRSEdit/games/billyfrontier/skeletons",
    modelFiles: [
      "global.bg3d",
      "buildings.bg3d",
      "swamp.bg3d",
      "targetpractice.bg3d",
      "town.bg3d",
    ],
    skeletonFiles: [
      "Bandito.bg3d",
      "Billy.bg3d",
      "FrogMan.bg3d",
      "KangaCow.bg3d",
      "KangaRex.bg3d",
      "Rygar.bg3d",
      "Shorty.bg3d",
      "TremorAlien.bg3d",
      "TremorGhost.bg3d",
      "Walker.bg3d",
    ],
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
 * Extract a specific subgroup from a GLTF scene by index
 */
function extractSubgroupByIndex(gltf: GLTF, modelIndex: number): Group | null {
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

  const targetModel = groupsContainer.children[modelIndex];
  if (!targetModel) {
    return null;
  }

  const clonedModel = targetModel.clone(true);
  const newScene = new Group();
  newScene.add(clonedModel);

  return newScene;
}

/**
 * Get all available files for a game (combines models and skeletons)
 */
function getAllFilesForGame(config: GameConfig): ModelFileEntry[] {
  const files: ModelFileEntry[] = [];

  // Add model files
  config.modelFiles.forEach((filename) => {
    files.push({
      filename,
      path: `${config.basePath}/${filename}`,
      label: filename,
      isSkeleton: false,
    });
  });

  // Add skeleton files if available
  if (config.skeletonPath && config.skeletonFiles) {
    config.skeletonFiles.forEach((filename) => {
      files.push({
        filename,
        path: `${config.skeletonPath}/${filename}`,
        label: `[Skeleton] ${filename}`,
        isSkeleton: true,
      });
    });
  }

  return files;
}

export function TestModelViewer() {
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedFileKey, setSelectedFileKey] = useState<string>("");
  const [modelIndex, setModelIndex] = useState<number>(0);
  const [maxIndex, setMaxIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fullGltf, setFullGltf] = useState<GLTF | null>(null);
  const [status, setStatus] = useState<string>(
    "Select a game and model file to begin",
  );
  const [modelNames, setModelNames] = useState<string[]>([]);

  const workerRef = useRef<Worker | null>(null);

  // Get the current game config
  const gameConfig = useMemo(
    () => GAME_CONFIGS.find((g) => g.id === selectedGame),
    [selectedGame],
  );

  // Get all files for the selected game (models + skeletons combined)
  const allFiles = useMemo(
    () => (gameConfig ? getAllFilesForGame(gameConfig) : []),
    [gameConfig],
  );

  // Get the selected file entry
  const selectedFileEntry = useMemo(
    () => allFiles.find((f) => f.path === selectedFileKey),
    [allFiles, selectedFileKey],
  );

  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);

  // Derived 3D scene and stats
  const gltfScene = useMemo(() => {
    if (!fullGltf) return null;
    return extractSubgroupByIndex(fullGltf, modelIndex);
  }, [fullGltf, modelIndex]);

  const modelStats = useMemo(() => {
    return calculateModelStats(gltfScene);
  }, [gltfScene]);

  // Reset model index when file selection changes
  const handleFileChange = useCallback((fileKey: string) => {
    setSelectedFileKey(fileKey);
    setModelIndex(0);
    setMaxIndex(0);
    setFullGltf(null);
    setModelNames([]);
    setStatus("File selected. Click 'Load Model' to load.");
  }, []);

  // Reset everything when game changes
  const handleGameChange = useCallback((gameId: string) => {
    setSelectedGame(gameId);
    setSelectedFileKey("");
    setModelIndex(0);
    setMaxIndex(0);
    setFullGltf(null);
    setModelNames([]);
    setStatus("Select a model file to continue");
  }, []);

  // Load model file
  const loadModelFile = useCallback(async () => {
    if (!gameConfig || !selectedFileEntry) {
      setError("Please select a game and model file");
      return;
    }

    setLoading(true);
    setError(null);
    setModelIndex(0); // Reset index when loading new file
    setStatus("Fetching model file...");

    const url = selectedFileEntry.path;
    console.log(`Loading model from: ${url}`);

    const fetchResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (fetchResult.isErr()) {
      const errorMsg = `Failed to fetch: ${fetchResult.error}`;
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      console.error("Model fetch error:", fetchResult.error);
      setLoading(false);
      return;
    }

    const response = fetchResult.value;
    if (!response.ok) {
      const errorMsg = `Failed to fetch: ${response.statusText}`;
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      setLoading(false);
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      const errorMsg = `Failed to read buffer: ${bufferResult.error}`;
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      console.error("Buffer read error:", bufferResult.error);
      setLoading(false);
      return;
    }

    const buffer = bufferResult.value;
    setStatus(`Converting ${gameConfig.format.toUpperCase()} to GLB...`);

    // Convert via worker
    const glbBufferResult = await ResultAsync.fromPromise(
      new Promise<ArrayBuffer>((resolve, reject) => {
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
      }),
      mapErr,
    );

    if (glbBufferResult.isErr()) {
      const errorMsg = `Conversion failed: ${glbBufferResult.error}`;
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      console.error("Conversion error:", glbBufferResult.error);
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
      const errorMsg = `Failed to load GLTF: ${gltfResult.error}`;
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
      console.error("GLTF load error:", gltfResult.error);
      setLoading(false);
      return;
    }

    const gltf = gltfResult.value;

    // Store full GLTF for extraction
    setFullGltf(gltf);

    // Count models in the file and extract their names
    const groupsContainer = gltf.scene.children[0];
    const numModels = groupsContainer?.children.length ?? 0;
    setMaxIndex(Math.max(0, numModels - 1));

    // Extract model names from the group children
    const names: string[] = [];
    if (groupsContainer?.children) {
      groupsContainer.children.forEach((child, idx) => {
        names.push(child.name || `Model ${idx}`);
      });
    }
    setModelNames(names);

    const currentName = names[0] || `Model 0`;
    setStatus(
      `Loaded! File contains ${numModels} model(s). Showing: ${currentName}`,
    );
    setLoading(false);
  }, [gameConfig, selectedFileEntry, getWorker]);

  // Derived status message
  const displayStatus = useMemo(() => {
    if (loading) return status;
    if (error) return `Error: ${error}`;
    if (fullGltf) {
      const modelName = modelNames[modelIndex] || `Model ${modelIndex}`;
      return `Showing: ${modelName} (index ${modelIndex} of ${maxIndex})`;
    }
    return status;
  }, [loading, error, fullGltf, modelNames, modelIndex, maxIndex, status]);

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
      <Card className="w-80 shrink-0 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Test Model Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game Selector */}
          <div className="space-y-2">
            <Label className="text-gray-300">Game</Label>
            <Select value={selectedGame} onValueChange={handleGameChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {GAME_CONFIGS.map((game) => (
                  <SelectItem
                    key={game.id}
                    value={game.id}
                    className="text-white focus:bg-gray-600"
                  >
                    {game.name} ({game.format.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model File Selector - Combined models and skeletons */}
          <div className="space-y-2">
            <Label className="text-gray-300">Model File</Label>
            <Select
              value={selectedFileKey}
              onValueChange={handleFileChange}
              disabled={!gameConfig || allFiles.length === 0}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue
                  placeholder={
                    allFiles.length ? "Select a file" : "No files available"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 max-h-80">
                {allFiles.map((file) => (
                  <SelectItem
                    key={file.path}
                    value={file.path}
                    className={`text-white focus:bg-gray-600 ${file.isSkeleton ? "text-purple-300" : ""}`}
                  >
                    {file.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Load Button - MOVED ABOVE index controls */}
          <Button
            onClick={loadModelFile}
            disabled={loading || !selectedGame || !selectedFileEntry}
            className="w-full"
          >
            {loading ? "Loading..." : "Load Model"}
          </Button>

          {/* Model Index - only show after loading */}
          {fullGltf && (
            <div className="space-y-2">
              <Label className="text-gray-300">
                Model Index (0-{maxIndex})
                {modelNames[modelIndex] && (
                  <span className="ml-2 text-blue-400">
                    {modelNames[modelIndex]}
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevModel}
                  disabled={modelIndex <= 0}
                  className="text-white"
                >
                  ←
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={maxIndex}
                  value={modelIndex}
                  onChange={(e) =>
                    setModelIndex(
                      Math.max(
                        0,
                        Math.min(maxIndex, parseInt(e.target.value) || 0),
                      ),
                    )
                  }
                  className="bg-gray-700 border-gray-600 text-white text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextModel}
                  disabled={modelIndex >= maxIndex}
                  className="text-white"
                >
                  →
                </Button>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
            {displayStatus}
          </div>

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
            <p>• Select a game to see available model files</p>
            <p>• BG3D files contain multiple sub-models</p>
            <p>• Use index selector to browse models after loading</p>
            <p>• Purple items are skeleton/character files</p>
          </div>
        </CardContent>
      </Card>

      {/* 3D Canvas - Fixed camera far plane for clipping */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Canvas
          camera={{ position: [300, 200, 300], fov: 50, near: 1, far: 50000 }}
          style={{ background: "#1a1a2e" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[1, 2, 1]} intensity={1} />

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
