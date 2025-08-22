import { useState, useRef } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { AnimationViewer, AnimationInfo } from "@/components/AnimationViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Download } from "lucide-react";
import { TextureManager } from "@/components/TextureManager";

// ...existing code...
import { SkeletonConversionPanel } from "@/components/SkeletonConversionPanel";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { parseSkeletonRsrcTS } from "../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "../modelParsers/skeletonExport";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
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
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null);
  const [uploadStep, setUploadStep] = useState<"select-bg3d" | "select-skeleton" | "completed">("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
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

  // Removed Pyodide worker initialization since we're using TypeScript implementation

  // Remove conditional useGLTF, handled in ModelCanvas

  // Convert BG3D texture to displayable image URL

  // --- End moved logic ---
  // ...existing code...

  async function handleFileUpload(bg3dFile: File, skeletonFile?: File) {
    if (!bg3dFile.name.toLowerCase().endsWith(".bg3d")) {
      toast.error("Please select a BG3D file");
      return;
    }
    
    if (skeletonFile && !skeletonFile.name.toLowerCase().endsWith(".skeleton.rsrc")) {
      toast.error("Skeleton file must be a .skeleton.rsrc file");
      return;
    }

    setLoading(true);
    try {
      const bg3dArrayBuffer = await bg3dFile.arrayBuffer();
      let skeletonData: SkeletonResource | undefined;

      // Parse skeleton file if provided
      if (skeletonFile) {
        try {
          console.log("Parsing skeleton file with TypeScript implementation...");
          const skeletonArrayBuffer = await skeletonFile.arrayBuffer();
          skeletonData = parseSkeletonRsrcTS(skeletonArrayBuffer);
          console.log("Skeleton data parsed:", skeletonData);
        } catch (error) {
          console.warn("Failed to parse skeleton file:", error);
          toast.error("Failed to parse skeleton file. Loading model without animations.");
        }
      }

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
          
          // Choose the appropriate message type based on whether we have skeleton data
          const message: BG3DGltfWorkerMessage = skeletonData
            ? {
                type: "bg3d-with-skeleton-to-glb",
                bg3dBuffer: bg3dArrayBuffer,
                skeletonData,
              }
            : {
                type: "bg3d-to-glb",
                buffer: bg3dArrayBuffer,
              };
          worker.postMessage(message);
        },
      );
      
      if (result.type === "error") {
        throw new Error(result.error);
      }
      
      if (result.type === "bg3d-to-glb" || result.type === "bg3d-with-skeleton-to-glb") {
        const glbBlob = new Blob([result.result], {
          type: "model/gltf-binary",
        });
        const url = URL.createObjectURL(glbBlob);
        setGltfUrl(url);
        setBg3dParsed(result.parsed);
        extractTexturesFromParsed(result.parsed);
        
        const fileName = skeletonFile ? `${bg3dFile.name} + ${skeletonFile.name}` : bg3dFile.name;
        toast.success(`Successfully loaded ${fileName}`);
        
        if (result.parsed.skeleton?.animations?.length) {
          console.log(`Model contains ${result.parsed.skeleton.animations.length} animations`);
        }
        
        // Reset upload state
        setUploadStep("completed");
        setPendingBg3dFile(null);
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

  async function handleBg3dFileSelect(bg3dFile: File) {
    setPendingBg3dFile(bg3dFile);
    setUploadStep("select-skeleton");
  }

  async function handleSkeletonFileSelect(skeletonFile?: File) {
    if (pendingBg3dFile) {
      await handleFileUpload(pendingBg3dFile, skeletonFile);
    }
  }

  function handleSkipSkeleton() {
    if (pendingBg3dFile) {
      handleFileUpload(pendingBg3dFile);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const bg3dFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".bg3d"),
    );
    const skeletonFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".skeleton.rsrc"),
    );
    
    if (uploadStep === "select-bg3d") {
      if (bg3dFile) {
        if (skeletonFile) {
          // Both files dropped at once, process immediately
          handleFileUpload(bg3dFile, skeletonFile);
        } else {
          // Only BG3D dropped, move to skeleton selection step
          handleBg3dFileSelect(bg3dFile);
        }
      } else if (skeletonFile) {
        toast.error("Please first select a BG3D file");
      } else {
        toast.error("Please drop a BG3D file");
      }
    } else if (uploadStep === "select-skeleton") {
      if (skeletonFile) {
        handleSkeletonFileSelect(skeletonFile);
      } else if (bg3dFile) {
        toast.error("Already selected BG3D file. Please select a skeleton file or skip this step.");
      } else {
        toast.error("Please drop a skeleton.rsrc file or click 'Skip Skeleton'");
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Handle animation state from ModelCanvas
  function handleAnimationsReady(animationInfos: AnimationInfo[], mixer: THREE.AnimationMixer | null) {
    setAnimations(animationInfos);
    setAnimationMixer(mixer);
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

          // Update the BG3D parsed data with a proper deep copy
          const updatedBG3D = { 
            ...bg3dParsed,
            materials: bg3dParsed.materials.map((material, idx) => {
              if (idx === materialIndex) {
                return {
                  ...material,
                  textures: material.textures.map((texture, texIdx) => {
                    if (texIdx === textureIndex) {
                      return {
                        ...existingTexture,
                        pixels: newPixels,
                        width: img.width,
                        height: img.height
                      };
                    }
                    return texture;
                  })
                };
              }
              return material;
            })
          };

          // Reset scene state to prevent crashes
          setScene(undefined);
          setModelNodes([]);
          
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
            // Clean up old URL first
            if (gltfUrl) {
              URL.revokeObjectURL(gltfUrl);
            }
            
            // Update state with new model (similar to handleFileUpload)
            setBg3dParsed(updatedBG3D);
            
            // Create new GLTF URL
            const glbBlob = new Blob([result.result], {
              type: "model/gltf-binary",
            });
            const newUrl = URL.createObjectURL(glbBlob);
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
          
          // Also download skeleton if available
          if (bg3dParsed.skeleton && bg3dParsed.skeleton.animations.length > 0) {
            console.log("Exporting skeleton resource for download...");
            try {
              const skeletonResource = bg3dSkeletonToSkeletonResource(bg3dParsed.skeleton);
              
              // For now, export as JSON until we have TypeScript binary conversion
              const skeletonJson = JSON.stringify(skeletonResource, null, 2);
              const skeletonBlob = new Blob([skeletonJson], { type: "application/json" });
              const skeletonUrl = URL.createObjectURL(skeletonBlob);
              
              const skeletonLink = document.createElement("a");
              skeletonLink.href = skeletonUrl;
              skeletonLink.download = "model.skeleton.json";
              document.body.appendChild(skeletonLink);
              skeletonLink.click();
              document.body.removeChild(skeletonLink);
              URL.revokeObjectURL(skeletonUrl);
              
              toast.success("Skeleton data exported as JSON");
            } catch (error) {
              console.error("Error exporting skeleton:", error);
              toast.error("Failed to export skeleton data");
            }
          }
          
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

  // NOTE: Skeleton download functionality disabled - using GLB export for now
  // const handleDownloadSkeleton = async () => {
  //   if (!bg3dParsed?.skeleton) {
  //     return;
  //   }

  //   try {
  //     console.log("Converting skeleton to resource format...");
  //     const skeletonResource = bg3dSkeletonToSkeletonResource(bg3dParsed.skeleton);
      
  //     // TODO: Implement skeleton resource to binary conversion using TypeScript
  //     console.warn("Skeleton binary export not yet implemented with TypeScript. Download skipped.");
  //     toast.error("Skeleton binary export not yet implemented. Please use GLB export for now.");
  //   } catch (error) {
  //     console.error("Error downloading skeleton:", error);
  //     toast.error("Failed to download skeleton file");
  //   }
  // };

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
    setUploadStep("select-bg3d");
    setPendingBg3dFile(null);
    toast.success("Model cleared");
  };

  const loadTestModel = async () => {
    try {
      // Load both Otto.bg3d and Otto.skeleton.rsrc test files
      const [bg3dResponse, skeletonResponse] = await Promise.all([
        fetch("/PangeaRSEdit/Otto.bg3d"),
        fetch("/PangeaRSEdit/Otto.skeleton.rsrc"),
      ]);
      
      if (!bg3dResponse.ok) {
        throw new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`);
      }
      
      const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
      const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
        type: "application/octet-stream",
      });
      
      let skeletonFile: File | undefined;
      if (skeletonResponse.ok) {
        const skeletonArrayBuffer = await skeletonResponse.arrayBuffer();
        skeletonFile = new File([skeletonArrayBuffer], "Otto.skeleton.rsrc", {
          type: "application/octet-stream",
        });
        console.log("Loaded Otto skeleton file");
      } else {
        console.warn("Otto skeleton file not found, loading without animations");
      }
      
      await handleFileUpload(bg3dFile, skeletonFile);
    } catch (error) {
      console.error("Error loading sample model:", error);
      toast.error("Failed to load Otto sample files");
    }
  };

  const loadTestModelWithoutSkeleton = async () => {
    try {
      // Load only Otto.bg3d test file
      const bg3dResponse = await fetch("/PangeaRSEdit/Otto.bg3d");
      
      if (!bg3dResponse.ok) {
        throw new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`);
      }
      
      const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
      const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
        type: "application/octet-stream",
      });
      
      console.log("Loading Otto model without skeleton data for comparison");
      await handleFileUpload(bg3dFile); // No skeleton file
    } catch (error) {
      console.error("Error loading sample model without skeleton:", error);
      toast.error("Failed to load Otto sample file");
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
                  {uploadStep === "select-bg3d" && (
                    <>
                      <div
                        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-400 mb-2">
                          Drop BG3D file here or click to select
                        </p>
                        <p className="text-sm text-gray-500">Upload .bg3d file first, then optionally add skeleton</p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".bg3d"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.name.toLowerCase().endsWith(".bg3d")) {
                            handleBg3dFileSelect(file);
                          } else if (file) {
                            toast.error("Please select a BG3D file");
                          }
                        }}
                      />
                    </>
                  )}

                  {uploadStep === "select-skeleton" && pendingBg3dFile && (
                    <>
                      <div className="text-sm text-gray-300 mb-3">
                        BG3D file selected: <strong>{pendingBg3dFile.name}</strong>
                      </div>
                      
                      <div
                        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-400 mb-2">
                          Drop skeleton file here or click to select
                        </p>
                        <p className="text-sm text-gray-500">Optional: Add .skeleton.rsrc file for animations</p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".skeleton.rsrc"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
                            handleSkeletonFileSelect(file);
                          } else if (file) {
                            toast.error("Please select a skeleton.rsrc file");
                          }
                        }}
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSkipSkeleton}
                          variant="outline"
                          className="flex-1 text-white"
                          disabled={loading}
                        >
                          Skip Skeleton
                        </Button>
                        <Button
                          onClick={() => {
                            setUploadStep("select-bg3d");
                            setPendingBg3dFile(null);
                          }}
                          variant="ghost"
                          className="flex-1 text-gray-400 hover:text-white"
                        >
                          Choose Different BG3D
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={loadTestModel}
                    variant="outline"
                    className="w-full text-white"
                    disabled={loading}
                  >
                    Load Otto.bg3d Sample Model (with Skeleton)
                  </Button>

                  <Button
                    onClick={loadTestModelWithoutSkeleton}
                    variant="outline"
                    className="w-full text-white"
                    disabled={loading}
                  >
                    Load Otto.bg3d Sample Model (without Skeleton)
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
                    accept=".bg3d,.skeleton.rsrc"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const bg3dFile = files.find(f => f.name.toLowerCase().endsWith(".bg3d"));
                      const skeletonFile = files.find(f => f.name.toLowerCase().endsWith(".skeleton.rsrc"));
                      
                      if (bg3dFile) {
                        handleFileUpload(bg3dFile, skeletonFile);
                      } else if (files.length > 0) {
                        toast.error("Please select a BG3D file (and optionally a skeleton.rsrc file)");
                      }
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

          {/* Animation Viewer - Show when animations are available */}
          {gltfUrl && (
            <AnimationViewer
              animations={animations}
              animationMixer={animationMixer}
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
          <SkeletonConversionPanel
            title="Convert BG3D to GLB"
            description="Upload .bg3d and optional .skeleton.rsrc files to convert and download as .glb."
            conversionType="bg3d-to-glb"
          />

          <SkeletonConversionPanel
            title="Convert GLB to BG3D"
            description="Upload a .glb file to convert and download as .bg3d."
            conversionType="glb-to-bg3d"
          />
        </div>

        {/* Main viewport - 3D Scene */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
          {gltfUrl ? (
            <ModelCanvas
              gltfUrl={gltfUrl}
              setModelNodes={setModelNodes}
              onSceneReady={setScene}
              onAnimationsReady={handleAnimationsReady}
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
