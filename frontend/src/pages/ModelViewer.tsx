import { useState, useRef } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Download } from "lucide-react";
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
  const [textures, setTextures] = useState<Texture[]>([]);
  function extractTexturesFromParsed(bg3dParsed: BG3DParseResult | null) {
    if (!bg3dParsed) {
      setTextures([]);
      return;
    }
    const extractedTextures: Texture[] = [];
    bg3dParsed.materials.forEach((material, materialIndex) => {
      material.textures.forEach((texture, textureIndex) => {
        // Convert BG3D texture to displayable image URL
        // Create a canvas to convert the raw pixel data to an image
        const canvas = document.createElement("canvas");
        canvas.width = texture.width;
        canvas.height = texture.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imageData = ctx.createImageData(texture.width, texture.height);
        if (texture.pixels.length === texture.width * texture.height * 3) {
          // RGB format
          for (let i = 0; i < texture.pixels.length; i += 3) {
            const pixelIndex = (i / 3) * 4;
            imageData.data[pixelIndex] = texture.pixels[i];
            imageData.data[pixelIndex + 1] = texture.pixels[i + 1];
            imageData.data[pixelIndex + 2] = texture.pixels[i + 2];
            imageData.data[pixelIndex + 3] = 255;
          }
        } else if (
          texture.pixels.length ===
          texture.width * texture.height * 4
        ) {
          // RGBA format
          imageData.data.set(texture.pixels);
        } else {
          // Unknown format, fill with gray
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = 128;
            imageData.data[i + 1] = 128;
            imageData.data[i + 2] = 128;
            imageData.data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const imageUrl = canvas.toDataURL("image/png");
        extractedTextures.push({
          name: `Material_${materialIndex}_Texture_${textureIndex}`,
          url: imageUrl,
          type: "diffuse",
          material: `Material ${materialIndex}`,
          size: { width: texture.width, height: texture.height },
        });
      });
    });
    setTextures(extractedTextures);
  }
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
        extractTexturesFromParsed(result.parsed);
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

  async function handleReplaceTexture(texture: Texture, newFile: File): Promise<void> {
    if (!bg3dParsed) {
      throw new Error("No BG3D data available for texture replacement");
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = async () => {
        try {
          // Validate size matches the existing texture
          if (texture.size && 
              (img.width !== texture.size.width || img.height !== texture.size.height)) {
            throw new Error(
              `Image size mismatch: Expected ${texture.size.width}×${texture.size.height}, got ${img.width}×${img.height}`
            );
          }

          // Extract material and texture indices from texture name
          const nameMatch = texture.name.match(/Material_(\d+)_Texture_(\d+)/);
          if (!nameMatch) {
            throw new Error("Invalid texture name format");
          }
          
          const materialIndex = parseInt(nameMatch[1]);
          const textureIndex = parseInt(nameMatch[2]);

          // Convert image to canvas and extract pixel data
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Failed to get canvas context");
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          
          // Convert to RGB or RGBA pixel array based on existing texture format
          const existingTexture = bg3dParsed.materials[materialIndex]?.textures[textureIndex];
          if (!existingTexture) {
            throw new Error("Texture not found in BG3D data");
          }

          const isRGBA = existingTexture.pixels.length === img.width * img.height * 4;
          const newPixels = new Uint8Array(isRGBA ? img.width * img.height * 4 : img.width * img.height * 3);
          
          for (let i = 0; i < imageData.data.length; i += 4) {
            const pixelIndex = i / 4;
            if (isRGBA) {
              newPixels[pixelIndex * 4] = imageData.data[i];     // R
              newPixels[pixelIndex * 4 + 1] = imageData.data[i + 1]; // G
              newPixels[pixelIndex * 4 + 2] = imageData.data[i + 2]; // B
              newPixels[pixelIndex * 4 + 3] = imageData.data[i + 3]; // A
            } else {
              newPixels[pixelIndex * 3] = imageData.data[i];     // R
              newPixels[pixelIndex * 3 + 1] = imageData.data[i + 1]; // G
              newPixels[pixelIndex * 3 + 2] = imageData.data[i + 2]; // B
            }
          }

          // Update the BG3D parsed data
          const updatedBG3D = { ...bg3dParsed };
          updatedBG3D.materials[materialIndex].textures[textureIndex] = {
            ...existingTexture,
            pixels: newPixels,
            width: img.width,
            height: img.height
          };

          // Convert updated BG3D back to GLB
          const worker = new BG3DGltfWorker();
          const result = await new Promise<BG3DGltfWorkerResponse>(
            (workerResolve, workerReject) => {
              worker.onmessage = (e) => {
                workerResolve(e.data);
                worker.terminate();
              };
              worker.onerror = (e) => {
                workerReject(e);
                worker.terminate();
              };
              const message: BG3DGltfWorkerMessage = {
                type: "bg3d-parsed-to-glb",
                parsed: updatedBG3D,
              };
              worker.postMessage(message);
            },
          );

          if (result.type === "error") {
            throw new Error(result.error);
          }

          if (result.type === "bg3d-parsed-to-glb") {
            // Update state with new model
            setBg3dParsed(updatedBG3D);
            
            // Create new GLTF URL and update the 3D view
            const glbBlob = new Blob([result.result], {
              type: "model/gltf-binary",
            });
            const newUrl = URL.createObjectURL(glbBlob);
            
            // Clean up old URL
            if (gltfUrl) {
              URL.revokeObjectURL(gltfUrl);
            }
            
            setGltfUrl(newUrl);
            
            // Re-extract textures to update the UI
            extractTexturesFromParsed(updatedBG3D);
            
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(newFile);
    });
  }

  const handleDownloadBG3D = () => {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for download");
      return;
    }

    try {
      // Convert BG3D parsed data back to binary format using worker
      const worker = new BG3DGltfWorker();
      worker.onmessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
        const result = e.data;
        if (result.type === "error") {
          toast.error(`Failed to convert BG3D: ${result.error}`);
          worker.terminate();
          return;
        }

        if (result.type === "bg3d-parsed-to-bg3d") {
          // Download the actual BG3D binary
          const blob = new Blob([result.result], { type: "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "model.bg3d";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("BG3D model downloaded");
        }
        worker.terminate();
      };
      
      worker.onerror = () => {
        toast.error("Failed to process BG3D data");
        worker.terminate();
      };

      const message: BG3DGltfWorkerMessage = {
        type: "bg3d-parsed-to-bg3d",
        parsed: bg3dParsed,
      };
      worker.postMessage(message);
    } catch (error) {
      console.error("Error downloading BG3D:", error);
      toast.error("Failed to download BG3D model");
    }
  };

  const handleDownloadGLB = () => {
    if (!gltfUrl) {
      toast.error("No GLB model available for download");
      return;
    }

    try {
      const a = document.createElement("a");
      a.href = gltfUrl;
      a.download = "model.glb";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("GLB model downloaded");
    } catch (error) {
      console.error("Error downloading GLB:", error);
      toast.error("Failed to download GLB model");
    }
  };

  const handleTextureEdit = async (texture: Texture, editedImageData: ImageData): Promise<void> => {
    // Convert ImageData to a File and use the existing replace function
    const canvas = document.createElement('canvas');
    canvas.width = editedImageData.width;
    canvas.height = editedImageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.putImageData(editedImageData, 0, 0);
    
    // Convert canvas to blob and then to file
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, 'image/png');
    });

    const file = new File([blob], `${texture.name}.png`, { type: 'image/png' });
    return handleReplaceTexture(texture, file);
  };

  const handleClearModel = () => {
    setGltfUrl(null);
    setBg3dParsed(null);
    setTextures([]);
    setModelNodes([]);
    setScene(undefined);
    toast.success("Model cleared");
  };

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
      <div
        className="flex flex-1 gap-4 p-4 flex-row max-h-screen overflow-clip bg-gray-900 text-white"
        style={{
          height: "calc(100vh - 56px)",
          maxHeight: "calc(100vh - 56px)",
        }}
      >
        {/* Left sidebar - Controls */}
        <div className="flex flex-col w-80 space-y-4 px-2 overflow-hidden">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                {gltfUrl ? "Model Actions" : "Model Upload"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!gltfUrl ? (
                // Model upload interface
                <>
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
                </>
              ) : (
                // Model actions interface
                <div className="space-y-3">
                  <div className="text-sm text-gray-300 mb-3">
                    Model loaded successfully
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={handleDownloadBG3D}
                      variant="outline"
                      className="w-full text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download as BG3D
                    </Button>
                    
                    <Button
                      onClick={handleDownloadGLB}
                      variant="outline"
                      className="w-full text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download as GLB
                    </Button>
                    
                    <Button
                      onClick={handleClearModel}
                      variant="outline"
                      className="w-full text-red-400 hover:text-red-300 border-red-600 hover:border-red-500"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Model
                    </Button>
                  </div>
                  
                  <hr className="border-gray-600" />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Load Different Model
                  </Button>
                  
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
                </div>
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
              <CardContent className="max-h-60 overflow-y-auto">
                {textures.length > 0 ? (
                  <TextureManager
                    textures={textures}
                    onDownloadTexture={handleDownloadTexture}
                    onReplaceTexture={handleReplaceTexture}
                    onTextureEdit={handleTextureEdit}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">
                      No textures found in this model
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        • Some BG3D models may not contain extractable textures
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
                <h3 className="text-xl font-semibold mb-2">No Model Loaded</h3>
                <p>Upload a BG3D file to start viewing 3D models</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
