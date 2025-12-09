import { useState, useRef } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { AnimationViewer, AnimationInfo } from "@/components/AnimationViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { TextureManager } from "@/components/TextureManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModelUploadPanel } from "./ModelViewer/ModelUploadPanel";
import { VisualizationOptions } from "./ModelViewer/VisualizationOptions";

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
import { skeletonResourceToBinary } from "../modelParsers/skeletonBinaryExport";
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
  const [animationMixer, setAnimationMixer] =
    useState<THREE.AnimationMixer | null>(null);
  const [uploadStep, setUploadStep] = useState<
    "select-bg3d" | "select-skeleton" | "completed"
  >("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [useGameSelector, setUseGameSelector] = useState<boolean>(true); // New state for UI mode
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [logBonePositions, setLogBonePositions] = useState<boolean>(false);
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
            imageData.data[pixelIndex] = texture.pixels[i] ?? 0;
            imageData.data[pixelIndex + 1] = texture.pixels[i + 1] ?? 0;
            imageData.data[pixelIndex + 2] = texture.pixels[i + 2] ?? 0;
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
    const fileName = bg3dFile.name.toLowerCase();
    const isBg3d = fileName.endsWith(".bg3d");
    const is3dmf = fileName.endsWith(".3dmf");
    
    if (!isBg3d && !is3dmf) {
      toast.error("Please select a BG3D or 3DMF file");
      return;
    }

    if (
      skeletonFile &&
      !skeletonFile.name.toLowerCase().endsWith(".skeleton.rsrc")
    ) {
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
          console.log(
            "Parsing skeleton file with TypeScript implementation...",
          );
          const skeletonArrayBuffer = await skeletonFile.arrayBuffer();
          skeletonData = parseSkeletonRsrcTS(skeletonArrayBuffer);
          console.log("Skeleton data parsed:", skeletonData);
        } catch (error) {
          console.warn("Failed to parse skeleton file:", error);
          toast.error(
            "Failed to parse skeleton file. Loading model without animations.",
          );
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

          // Use skeleton data if available for proper glTF animation support
          const message: BG3DGltfWorkerMessage = skeletonData
            ? {
                type: "bg3d-with-skeleton-to-glb",
                bg3dBuffer: bg3dArrayBuffer,
                skeletonData: skeletonData!,
              }
            : {
                type: "bg3d-to-glb",
                buffer: bg3dArrayBuffer,
              };
          worker.postMessage(message);
        },
      );

      if (result.type === "error") {
        toast.error(`Error loading model: ${result.error}`);
        return;
      }

      if (
        result.type === "bg3d-to-glb" ||
        result.type === "bg3d-with-skeleton-to-glb"
      ) {
        console.log(
          "Worker result:",
          result.type,
          "Array buffer size:",
          result.result.byteLength,
        );

        // Validate the ArrayBuffer
        if (!result.result || result.result.byteLength === 0) {
          toast.error("Worker returned empty or invalid GLB data");
          return;
        }

        const glbBlob = new Blob([result.result], {
          type: "model/gltf-binary",
        });
        console.log("Created blob:", glbBlob.size, "bytes");

        const url = URL.createObjectURL(glbBlob);
        console.log("Created blob URL:", url);

        setGltfUrl(url);
        setBg3dParsed(result.parsed);

        // If we parsed skeleton data but exported without it for compatibility,
        // still show the animation information
        if (skeletonData && result.type === "bg3d-to-glb") {
          // Add the skeleton data to the parsed result for display
          const enhancedParsed = { ...result.parsed };
          if (!enhancedParsed.skeleton) {
            // Convert skeleton resource to BG3D skeleton format for display
            enhancedParsed.skeleton = {
              version: 272,
              numAnims: Object.keys(skeletonData.AnHd).length,
              numJoints: Object.keys(skeletonData.Bone).length,
              num3DMFLimbs: 0,
              bones: Object.values(skeletonData.Bone).map(
                (bone: Record<string, unknown>, index: number) => ({
                  parentBone: -1, // Simplified for display
                  name: bone.name || `Bone_${index}`,
                  coordX: 0,
                  coordY: 0,
                  coordZ: 0,
                  numPointsAttachedToBone: 0,
                  numNormalsAttachedToBone: 0,
                  pointIndices: [],
                  normalIndices: [],
                }),
              ),
              animations: Object.values(skeletonData.AnHd).map(
                (anim: Record<string, unknown>, index: number) => ({
                  name: anim.obj?.animName || `Animation_${index}`,
                  numAnimEvents: 0,
                  events: [],
                  keyframes: {},
                }),
              ),
            };
          }
          setBg3dParsed(enhancedParsed);
          console.log(
            `Animation metadata preserved: ${
              enhancedParsed.skeleton?.animations?.length || 0
            } animations detected`,
          );
        } else {
          setBg3dParsed(result.parsed);
        }

        extractTexturesFromParsed(result.parsed);

        const fileName = skeletonFile
          ? `${bg3dFile.name} + ${skeletonFile.name}`
          : bg3dFile.name;
        toast.success(`Successfully loaded ${fileName}`);

        if (result.parsed.skeleton?.animations?.length) {
          console.log(
            `Model contains ${result.parsed.skeleton.animations.length} animations`,
          );
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
    const modelFile = files.find((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".bg3d") || name.endsWith(".3dmf");
    });
    const skeletonFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".skeleton.rsrc"),
    );

    if (uploadStep === "select-bg3d") {
      if (modelFile) {
        if (skeletonFile) {
          // Both files dropped at once, process immediately
          handleFileUpload(modelFile, skeletonFile);
        } else {
          // Only model dropped, move to skeleton selection step
          handleBg3dFileSelect(modelFile);
        }
      } else if (skeletonFile) {
        toast.error("Please first select a BG3D or 3DMF file");
      } else {
        toast.error("Please drop a BG3D or 3DMF file");
      }
    } else if (uploadStep === "select-skeleton") {
      if (skeletonFile) {
        handleSkeletonFileSelect(skeletonFile);
      } else if (modelFile) {
        toast.error(
          "Already selected model file. Please select a skeleton file or skip this step.",
        );
      } else {
        toast.error(
          "Please drop a skeleton.rsrc file or click 'Skip Skeleton'",
        );
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Handle animation state from ModelCanvas
  function handleAnimationsReady(
    animationInfos: AnimationInfo[],
    mixer: THREE.AnimationMixer | null,
  ) {
    // Use glTF animations from the model
    setAnimations(animationInfos);
    setAnimationMixer(mixer);

    if (animationInfos.length > 0) {
      console.log(
        `Loaded ${animationInfos.length} animations from glTF:`,
        animationInfos.map((a) => `${a.name} (${a.duration.toFixed(2)}s)`),
      );
    } else {
      console.log("No animations found in glTF");
    }
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

  async function handleReplaceTexture(
    texture: Texture,
    newFile: File,
  ): Promise<void> {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for texture replacement");
      return;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = async () => {
        try {
          // Validate size matches the existing texture
          if (
            texture.size &&
            (img.width !== texture.size.width ||
              img.height !== texture.size.height)
          ) {
            toast.error(
              `Image size mismatch: Expected ${texture.size.width}×${texture.size.height}, got ${img.width}×${img.height}`,
            );
            reject(new Error("Image size mismatch"));
            return;
          }

          // Extract material and texture indices from texture name
          const nameMatch = texture.name.match(/Material_(\d+)_Texture_(\d+)/);
          if (!nameMatch) {
            toast.error("Invalid texture name format");
            reject(new Error("Invalid texture name format"));
            return;
          }

          const materialIndex = parseInt(nameMatch[1] ?? "0");
          const textureIndex = parseInt(nameMatch[2] ?? "0");

          // Convert image to canvas and extract pixel data
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            toast.error("Failed to get canvas context");
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          // Convert to RGB or RGBA pixel array based on existing texture format
          const existingTexture =
            bg3dParsed.materials[materialIndex]?.textures[textureIndex];
          if (!existingTexture) {
            toast.error("Texture not found in BG3D data");
            reject(new Error("Texture not found in BG3D data"));
            return;
          }

          const isRGBA =
            existingTexture.pixels.length === img.width * img.height * 4;
          const newPixels = new Uint8Array(
            isRGBA ? img.width * img.height * 4 : img.width * img.height * 3,
          );

          for (let i = 0; i < imageData.data.length; i += 4) {
            const pixelIndex = i / 4;
            if (isRGBA) {
              newPixels[pixelIndex * 4] = imageData.data[i] ?? 0; // R
              newPixels[pixelIndex * 4 + 1] = imageData.data[i + 1] ?? 0; // G
              newPixels[pixelIndex * 4 + 2] = imageData.data[i + 2] ?? 0; // B
              newPixels[pixelIndex * 4 + 3] = imageData.data[i + 3] ?? 255; // A
            } else {
              newPixels[pixelIndex * 3] = imageData.data[i] ?? 0; // R
              newPixels[pixelIndex * 3 + 1] = imageData.data[i + 1] ?? 0; // G
              newPixels[pixelIndex * 3 + 2] = imageData.data[i + 2] ?? 0; // B
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
                        height: img.height,
                      };
                    }
                    return texture;
                  }),
                };
              }
              return material;
            }),
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
            toast.error(`Error replacing texture: ${result.error}`);
            reject(new Error(result.error));
            return;
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

  const handleDownloadBG3D = async () => {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for download");
      return;
    }

    try {
      // Convert BG3D parsed data back to binary format using worker
      const worker = new BG3DGltfWorker();
      worker.onmessage = async (e: MessageEvent<BG3DGltfWorkerResponse>) => {
        const result = e.data;
        if (result.type === "error") {
          toast.error(`Failed to convert BG3D: ${result.error}`);
          worker.terminate();
          return;
        }

        if (result.type === "bg3d-parsed-to-bg3d") {
          // Download the actual BG3D binary
          const blob = new Blob([result.result], {
            type: "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "model.bg3d";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Also download skeleton if available
          if (
            bg3dParsed.skeleton &&
            bg3dParsed.skeleton.animations.length > 0
          ) {
            console.log("Exporting skeleton resource for download...");
            try {
              const skeletonResource = bg3dSkeletonToSkeletonResource(
                bg3dParsed.skeleton,
              );

              // Convert to binary .rsrc format
              const skeletonBinary = await skeletonResourceToBinary(
                skeletonResource,
              );
              const skeletonBlob = new Blob([skeletonBinary], {
                type: "application/octet-stream",
              });
              const skeletonUrl = URL.createObjectURL(skeletonBlob);

              const skeletonLink = document.createElement("a");
              skeletonLink.href = skeletonUrl;
              skeletonLink.download = "model.skeleton.rsrc";
              document.body.appendChild(skeletonLink);
              skeletonLink.click();
              document.body.removeChild(skeletonLink);
              URL.revokeObjectURL(skeletonUrl);

              toast.success("Skeleton data exported as .rsrc file");
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

  const handleDownload3DMF = async () => {
    if (!bg3dParsed) {
      toast.error("No model data available for download");
      return;
    }

    try {
      // Convert BG3DParseResult to 3DMF format
      const { bg3dParseResultToMetaFile, write3DMFFromMetaFile } = await import(
        "../modelParsers/threeDMF"
      );

      const metaResult = bg3dParseResultToMetaFile(bg3dParsed);
      if (!metaResult.ok) {
        toast.error(`Failed to convert to 3DMF: ${metaResult.error.message}`);
        return;
      }

      const writeResult = write3DMFFromMetaFile(metaResult.value);
      if (!writeResult.ok) {
        toast.error(`Failed to write 3DMF: ${writeResult.error.message}`);
        return;
      }

      // Download the 3DMF binary
      const blob = new Blob([writeResult.value], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "model.3dmf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("3DMF model downloaded");
    } catch (error) {
      console.error("Error downloading 3DMF:", error);
      toast.error("Failed to download 3DMF model");
    }
  };

  const handleTextureEdit = async (
    texture: Texture,
    editedImageData: ImageData,
  ): Promise<void> => {
    // Convert ImageData to a File and use the existing replace function
    const canvas = document.createElement("canvas");
    canvas.width = editedImageData.width;
    canvas.height = editedImageData.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Failed to get canvas context");
      return;
    }

    ctx.putImageData(editedImageData, 0, 0);

    // Convert canvas to blob and then to file
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });

    const file = new File([blob], `${texture.name}.png`, { type: "image/png" });
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
    // Don't reset useGameSelector - let user keep their preference
    toast.success("Model cleared");
  };

  const loadTestModel = async () => {
    try {
      // Load both Otto.bg3d and Otto.skeleton.rsrc test files
      const [bg3dResponse, skeletonResponse] = await Promise.all([
        fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d"),
        fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc"),
      ]);

      if (!bg3dResponse.ok) {
        toast.error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`);
        return;
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
        console.warn(
          "Otto skeleton file not found, loading without animations",
        );
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
      const bg3dResponse = await fetch(
        "/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d",
      );

      if (!bg3dResponse.ok) {
        toast.error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`);
        return;
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
      <div className="h-full flex gap-4 p-4 bg-gray-900 text-white">
        {/* Left sidebar - Controls */}
        <div className="flex flex-col w-80 space-y-4 px-2 overflow-y-auto">
          <ModelUploadPanel
            gltfUrl={gltfUrl}
            useGameSelector={useGameSelector}
            setUseGameSelector={setUseGameSelector}
            loading={loading}
            uploadStep={uploadStep}
            pendingBg3dFile={pendingBg3dFile}
            fileInputRef={fileInputRef}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
            handleBg3dFileSelect={handleBg3dFileSelect}
            handleSkeletonFileSelect={handleSkeletonFileSelect}
            handleSkipSkeleton={handleSkipSkeleton}
            loadTestModel={loadTestModel}
            loadTestModelWithoutSkeleton={loadTestModelWithoutSkeleton}
            handleFileUpload={handleFileUpload}
            handleDownloadBG3D={handleDownloadBG3D}
            handleDownloadGLB={handleDownloadGLB}
            handleDownload3DMF={handleDownload3DMF}
            handleClearModel={handleClearModel}
            onCancelSelection={() => {
              setUploadStep("select-bg3d");
              setPendingBg3dFile(null);
            }}
          />

          {scene && modelNodes.length > 0 && (
            <ModelHierarchy
              nodes={modelNodes}
              clonedScene={scene}
              onVisibilityChange={onVisibilityChange}
            />
          )}

          {/* Visualization Controls */}
          {gltfUrl && (
            <VisualizationOptions
              wireframeMode={wireframeMode}
              setWireframeMode={setWireframeMode}
              showSkeleton={showSkeleton}
              setShowSkeleton={setShowSkeleton}
              logBonePositions={logBonePositions}
              setLogBonePositions={setLogBonePositions}
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
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0">
          {gltfUrl ? (
            <ErrorBoundary>
              <ModelCanvas
                gltfUrl={gltfUrl}
                setModelNodes={setModelNodes}
                onSceneReady={setScene}
                onAnimationsReady={handleAnimationsReady}
                wireframeMode={wireframeMode}
                showSkeleton={showSkeleton}
                logBonePositions={logBonePositions}
              />
            </ErrorBoundary>
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
