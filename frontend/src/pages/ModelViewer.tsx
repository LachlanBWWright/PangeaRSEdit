import { useState, useRef } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { TextureManager } from "@/components/TextureManager";

// ...existing code...
import { ConversionPanel } from "@/components/ConversionPanel";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { toast } from "sonner";
import * as THREE from "three";

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
  // --- Begin moved logic from EnhancedModelMesh ---
  // State and refs must be declared first
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [bg3dParsed, setBg3dParsed] = useState<BG3DParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [textures] = useState<Texture[]>([]);
  const [scene, setScene] = useState<THREE.Group | undefined>(undefined);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remove conditional useGLTF, handled in ModelCanvas

  // Convert BG3D texture to displayable image URL

  // --- End moved logic ---
  // ...existing code...

  async function handleFileUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".bg3d")) {
      toast.error("Please select a BG3D file");
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
        setBg3dParsed(result.parsed);
        toast.success(`Successfully loaded ${file.name}`);
      }
    } catch (error) {
      console.error("Error loading BG3D file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load BG3D file",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const bg3dFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".bg3d"),
    );
    if (bg3dFile) {
      handleFileUpload(bg3dFile);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Removed unused handleTexturesExtracted and handleNodesExtracted

  // Removed handleClonedSceneUpdate, handled in ModelCanvas

  function onVisibilityChange(nodeObject: THREE.Object3D, visible: boolean) {
    nodeObject.visible = visible;
    // ModelCanvas will update model nodes after visibility change
    console.log("Visibility change:", {
      nodeName: nodeObject.name,
      visible,
    });
  }

  async function handleDownloadTexture(texture: Texture) {
    try {
      const response = await fetch(texture.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${texture.name}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${texture.name} has been downloaded`);
    } catch (error) {
      console.error("Error downloading texture:", error);
      toast.error("Failed to download texture");
    }
  }

  async function handleReplaceTexture(texture: Texture, newFile: File) {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for texture replacement");
      return;
    }

    try {
      // Parse material and texture indices from texture name
      const match = texture.name.match(/Material_(\d+)_Texture_(\d+)/);
      if (!match) {
        throw new Error("Could not parse texture name format");
      }

      const materialIndex = parseInt(match[1]);
      const textureIndex = parseInt(match[2]);

      // Load the new image file
      const imageUrl = URL.createObjectURL(newFile);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Convert image to pixel data
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Update the BG3D texture data
      const material = bg3dParsed.materials[materialIndex];
      if (!material) {
        throw new Error(`Material ${materialIndex} not found`);
      }

      const bg3dTexture = material.textures[textureIndex];
      if (!bg3dTexture) {
        throw new Error(
          `Texture ${textureIndex} not found in material ${materialIndex}`,
        );
      }

      // Update texture properties
      bg3dTexture.width = canvas.width;
      bg3dTexture.height = canvas.height;

      // Convert RGBA to the format expected by BG3D (likely RGB)
      const rgbData = new Uint8Array(canvas.width * canvas.height * 3);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const rgbIndex = (i / 4) * 3;
        rgbData[rgbIndex] = imageData.data[i]; // R
        rgbData[rgbIndex + 1] = imageData.data[i + 1]; // G
        rgbData[rgbIndex + 2] = imageData.data[i + 2]; // B
      }

      bg3dTexture.pixels = rgbData;
      bg3dTexture.bufferSize = rgbData.length;

      // Regenerate the GLTF from the modified BG3D data
      setLoading(true);
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
            type: "bg3d-parsed-to-glb",
            parsed: bg3dParsed,
          };
          worker.postMessage(message);
        },
      );

      if (result.type === "error") {
        throw new Error(result.error);
      }

      if (result.type === "bg3d-parsed-to-glb") {
        // Update the GLTF URL with the new model
        const glbBlob = new Blob([result.result], {
          type: "model/gltf-binary",
        });

        // Clean up old URL
        if (gltfUrl) {
          URL.revokeObjectURL(gltfUrl);
        }

        const newUrl = URL.createObjectURL(glbBlob);
        setGltfUrl(newUrl);

        // Update the BG3D parsed state to trigger texture re-extraction
        setBg3dParsed({ ...bg3dParsed });

        toast.success(
          `Successfully replaced ${texture.name} and updated model`,
        );
      }

      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error("Error replacing texture:", error);
      toast.error(
        `Failed to replace texture: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  }

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
      toast.error("Failed to load Otto.bg3d sample file");
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

            {scene && modelNodes.length > 0 && (
              <ModelHierarchy
                nodes={modelNodes}
                clonedScene={scene}
                onVisibilityChange={onVisibilityChange}
              />
            )}

            {/* Texture Manager - Always show this section when model is loaded */}
            {gltfUrl && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">
                    Texture Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {textures.length > 0 ? (
                    <TextureManager
                      textures={textures}
                      onDownloadTexture={handleDownloadTexture}
                      onReplaceTexture={handleReplaceTexture}
                    />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        No textures found in this model
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>
                          • Some BG3D models may not contain extractable
                          textures
                        </p>
                        <p>
                          • Textures may be embedded differently or compressed
                        </p>
                        <p>
                          • Try a different model format if texture editing is
                          needed
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
              <ModelCanvas
                gltfUrl={gltfUrl}
                setModelNodes={setModelNodes}
                onSceneReady={setScene}
              />
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
