import { useState, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TextureManager } from "@/components/TextureManager";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";
import { ConversionPanel } from "@/components/ConversionPanel";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import { toast } from "sonner";

interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
}

interface ModelNode {
  name: string;
  type: "mesh" | "node" | "group";
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
}

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
  const [nodeVisibility, setNodeVisibility] = useState<Map<string, boolean>>(
    new Map(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".bg3d")) {
        toast("Invalid File", {
          description: "Please select a BG3D file",

          //variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        const arrayBuffer = await file.arrayBuffer();

        const worker = new BG3DGltfWorker();

        const result = await new Promise<BG3DGltfWorkerResponse>(
          (resolve, reject) => {
            worker.onmessage = (e) => {
              resolve(e.data);
              worker.terminate();
            };

            worker.onerror = (e) => {
              reject(e);
              worker.terminate();
            };

            const message: BG3DGltfWorkerMessage = {
              type: "bg3d-to-glb",
              buffer: arrayBuffer,
            };

            worker.postMessage(message);
          },
        );

        if (result.type === "error") {
          throw new Error(result.error);
        }

        if (result.type === "bg3d-to-glb") {
          const glbBlob = new Blob([result.result], {
            type: "model/gltf-binary",
          });
          const url = URL.createObjectURL(glbBlob);
          setGltfUrl(url);

          toast("Model Loaded", {
            description: `Successfully loaded ${file.name}`,
          });
        }
      } catch (error) {
        console.error("Error loading BG3D file:", error);
        toast("Error Loading Model", {
          description:
            error instanceof Error ? error.message : "Failed to load BG3D file",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const bg3dFile = files.find((file) =>
        file.name.toLowerCase().endsWith(".bg3d"),
      );
      if (bg3dFile) {
        handleFileUpload(bg3dFile);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleTexturesExtracted = useCallback(
    (extractedTextures: Texture[]) => {
      console.log("Extracted textures:", extractedTextures);
      setTextures(extractedTextures);
    },
    [],
  );

  const handleNodesExtracted = useCallback((extractedNodes: ModelNode[]) => {
    console.log("Extracted nodes:", extractedNodes);
    setModelNodes(extractedNodes);

    // Initialize visibility map with proper node tracking
    const visibilityMap = new Map<string, boolean>();
    const initializeVisibility = (
      nodes: ModelNode[],
      parentPath: string = "",
    ) => {
      nodes.forEach((node, index) => {
        const nodePath = parentPath ? `${parentPath}-${index}` : `${index}`;
        visibilityMap.set(nodePath, true);

        if (node.nodeIndex !== undefined) {
          visibilityMap.set(`node_${node.name}`, true);
        }
        if (node.meshIndex !== undefined) {
          visibilityMap.set(`mesh_${node.name}`, true);
        }

        if (node.children) {
          initializeVisibility(node.children, nodePath);
        }
      });
    };
    initializeVisibility(extractedNodes);
    setNodeVisibility(visibilityMap);
  }, []);

  const handleNodeVisibilityChange = useCallback(
    (
      nodePath: string,
      nodeIndex: number | undefined,
      meshIndex: number | undefined,
      visible: boolean,
    ) => {
      setNodeVisibility((prev) => {
        const newVisibility = new Map(prev);
        newVisibility.set(nodePath, visible);

        if (nodeIndex !== undefined) {
          newVisibility.set(`node_${nodeIndex}`, visible);
        }
        if (meshIndex !== undefined) {
          newVisibility.set(`mesh_${meshIndex}`, visible);
        }

        console.log("Visibility change:", {
          nodePath,
          nodeIndex,
          meshIndex,
          visible,
        });
        return newVisibility;
      });
    },
    [],
  );

  const handleDownloadTexture = useCallback(
    async (texture: Texture) => {
      try {
        const response = await fetch(texture.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${texture.name}.png`;
        link.click();

        URL.revokeObjectURL(url);

        toast("Texture Downloaded", {
          description: `${texture.name} has been downloaded`,
        });
      } catch (error) {
        console.error("Error downloading texture:", error);
        toast("Download Failed", {
          description: "Failed to download texture",
        });
      }
    },
    [toast],
  );

  const handleReplaceTexture = useCallback(
    async (texture: Texture, newFile: File) => {
      try {
        // Create a new object URL for the new texture
        const newUrl = URL.createObjectURL(newFile);

        // Update the texture in the list
        setTextures((prev) =>
          prev.map((t) => (t.url === texture.url ? { ...t, url: newUrl } : t)),
        );

        toast("Texture Replaced", {
          description: `Successfully replaced ${texture.name}`,
        });
      } catch (error) {
        console.error("Error replacing texture:", error);
        toast("Replace Failed", {
          description: "Failed to replace texture",
        });
      }
    },
    [toast],
  );

  const loadTestModel = async () => {
    try {
      // Load the Otto.bg3d test file
      const response = await fetch("/PangeaRSEdit/Otto.bg3d");
      if (!response.ok) {
        throw new Error(`Failed to fetch Otto.bg3d: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], "Otto.bg3d", {
        type: "application/octet-stream",
      });
      await handleFileUpload(file);
    } catch (error) {
      console.error("Error loading sample model:", error);
      toast("Error Loading Sample Model", {
        description: "Failed to load Otto.bg3d sample file",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col flex-1 bg-gray-900 text-white">
        <div className="flex flex-1 gap-4 p-4">
          {/* Left sidebar - Controls */}
          <div className="w-80 space-y-4 max-h-screen overflow-y-auto">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Model Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">
                    Drop a BG3D file here or click to select
                  </p>
                  <p className="text-sm text-gray-500">Supports .bg3d files</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bg3d"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                <Button
                  onClick={loadTestModel}
                  variant="outline"
                  className="w-full text-white"
                  disabled={loading}
                >
                  Load Otto.bg3d Sample Model
                </Button>

                {loading && (
                  <p className="text-center text-gray-400">Loading model...</p>
                )}
              </CardContent>
            </Card>

            {/* Model Hierarchy */}
            {modelNodes.length > 0 && (
              <ModelHierarchy
                nodes={modelNodes}
                onVisibilityChange={handleNodeVisibilityChange}
              />
            )}

            {/* Texture Manager */}
            {textures.length > 0 && (
              <TextureManager
                textures={textures}
                onDownloadTexture={handleDownloadTexture}
                onReplaceTexture={handleReplaceTexture}
              />
            )}
            {/* Conversion Panels */}
            <ConversionPanel
              title="Convert BG3D to GLB"
              description="Upload a .bg3d file to convert and download as .glb."
              acceptedFileType=".bg3d"
              fileExtension="bg3d"
              outputExtension="glb"
              conversionType="bg3d-to-glb"
              outputMimeType="model/gltf-binary"
            />

            <ConversionPanel
              title="Convert GLB to BG3D"
              description="Upload a .glb file to convert and download as .bg3d."
              acceptedFileType=".glb"
              fileExtension="glb"
              outputExtension="bg3d"
              conversionType="glb-to-bg3d"
              outputMimeType="application/octet-stream"
            />
          </div>

          {/* Main viewport - 3D Scene */}
          <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
            {gltfUrl ? (
              <Canvas
                camera={{
                  position: [0, 0, 50],
                  fov: 110,
                  near: 0.1,
                  far: 10000,
                }}
              >
                <ambientLight intensity={1} color={"#ff0000"} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <directionalLight position={[-10, -10, -5]} intensity={1} />

                {/* Load the GLTF model with enhanced features */}
                <EnhancedModelMesh
                  url={gltfUrl}
                  nodeVisibility={nodeVisibility}
                  onTexturesExtracted={handleTexturesExtracted}
                  onNodesExtracted={handleNodesExtracted}
                />

                <OrbitControls
                  enablePan={false}
                  enableZoom={true}
                  enableRotate={true}
                />
              </Canvas>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                    <Upload className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No Model Loaded
                  </h3>
                  <p>Upload a BG3D file to start viewing 3D models</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
