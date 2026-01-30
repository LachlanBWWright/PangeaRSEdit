<<<<<<< HEAD
import { useState, useRef, useCallback } from "react";
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
import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { toast } from "sonner";
import { AnimationMixer, Group, Object3D } from "three";
import {
  downloadTexture,
  downloadBG3DModel,
  downloadGLBModel,
  download3DMFModel,
} from "./ModelViewer/utils/downloadUtils";
import {
  loadOttoTestModel,
  loadOttoTestModelWithoutSkeleton,
} from "./ModelViewer/utils/testModelLoaders";
import { useFileUpload } from "./ModelViewer/hooks/useFileUpload";
import { useTextureManagement } from "./ModelViewer/hooks/useTextureManagement";
import type { Texture, ModelNode } from "./ModelViewer/types";
=======
import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
//import { TextureManager } from "@/components/TextureManager";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";

interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
}

// Component to load and display GLTF model
function ModelMesh({
  url,
  visible,
  onTexturesExtracted,
}: {
  url: string;
  visible: boolean;
  onTexturesExtracted: (textures: Texture[]) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    // Extract textures from the GLTF scene
    const extractedTextures: Texture[] = [];
    scene.traverse((child: any) => {
      if (child.material) {
        const material = child.material;

        // Check for diffuse/base color texture
        if (material.map) {
          extractedTextures.push({
            name: `Material_${material.name || "Unknown"}_Diffuse`,
            url: material.map.image?.src || "",
            type: "diffuse",
          });
        }

        // Check for normal map
        if (material.normalMap) {
          extractedTextures.push({
            name: `Material_${material.name || "Unknown"}_Normal`,
            url: material.normalMap.image?.src || "",
            type: "normal",
          });
        }

        // Check for other texture types
        ["roughnessMap", "metalnessMap", "aoMap", "emissiveMap"].forEach(
          (mapType) => {
            if (material[mapType]) {
              extractedTextures.push({
                name: `Material_${material.name || "Unknown"}_${mapType}`,
                url: material[mapType].image?.src || "",
                type: "other",
              });
            }
          },
        );
      }
    });

    // Remove duplicates and invalid textures
    const uniqueTextures = extractedTextures.filter(
      (texture, index, self) =>
        texture.url && self.findIndex((t) => t.url === texture.url) === index,
    );

    onTexturesExtracted(uniqueTextures);
  }, [scene, onTexturesExtracted]);

  if (!visible) {
    return null;
  }

  return <primitive object={scene} position={[0, 0, 0]} scale={1} />;
}
>>>>>>> origin/main

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [textures, setTextures] = useState<Texture[]>([]);
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [animationMixer, setAnimationMixer] =
    useState<AnimationMixer | null>(null);
  const [uploadStep, setUploadStep] = useState<
    "select-bg3d" | "select-skeleton" | "completed"
  >("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [useGameSelector, setUseGameSelector] = useState<boolean>(true); // New state for UI mode
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [logBonePositions, setLogBonePositions] = useState<boolean>(false);

  const [scene, setScene] = useState<Group | undefined>(undefined);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
=======
  const [models, setModels] = useState<
    Array<{ name: string; visible: boolean }>
  >([]);
  /* const [textures, setTextures] = useState<Texture[]>([]); */
>>>>>>> origin/main
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

<<<<<<< HEAD
  // Initialize file upload hook
  const { uploadFile } = useFileUpload({
    onGltfUrlChange: setGltfUrl,
    onBg3dParsedChange: setBg3dParsed,
    onTexturesChange: setTextures,
    onLoadingChange: setLoading,
    onUploadStepChange: setUploadStep,
  });

  // Initialize texture management hook
  const { replaceTexture, editTexture } = useTextureManagement({
    bg3dParsed,
    gltfUrl,
    onBg3dParsedChange: setBg3dParsed,
    onGltfUrlChange: setGltfUrl,
    onSceneReset: () => {
      setScene(undefined);
      setModelNodes([]);
    },
    onTexturesChange: setTextures,
  });

  // Wrapper that delegates to the hook
  const handleFileUpload = (bg3dFile: File, skeletonFile?: File) => {
    return uploadFile(bg3dFile, skeletonFile);
  };
=======
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".bg3d")) {
        toast({
          title: "Invalid File",
          description: "Please select a BG3D file",
          variant: "destructive",
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
>>>>>>> origin/main

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

<<<<<<< HEAD
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
  const handleAnimationsReady = useCallback(
    (
      animationInfos: AnimationInfo[],
      mixer: AnimationMixer | null,
    ) => {
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
    },
    [],
  );

  // Removed unused handleTexturesExtracted and handleNodesExtracted

  // Removed handleClonedSceneUpdate, handled in ModelCanvas

  const onVisibilityChange = useCallback(
    (nodeObject: Object3D, visible: boolean) => {
      nodeObject.visible = visible;
      // ModelCanvas will update model nodes after visibility change
      console.log("Visibility change:", {
        nodeName: nodeObject.name,
        visible,
      });
    },
    [],
  );

  async function handleDownloadTexture(texture: Texture) {
    try {
      await downloadTexture(texture, texture.name);
      toast.success(`${texture.name} has been downloaded`);
    } catch (error) {
      console.error("Error downloading texture:", error);
      toast.error("Failed to download texture");
    }
  }

  const handleReplaceTexture = (texture: Texture, newFile: File) => {
    return replaceTexture(texture, newFile);
  };

  const handleDownloadBG3D = async () => {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for download");
      return;
    }

    try {
      await downloadBG3DModel(bg3dParsed);
      toast.success("BG3D model downloaded");
    } catch (error) {
      console.error("Error downloading BG3D:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download BG3D model",
      );
    }
  };

  const handleDownloadGLB = () => {
    if (!gltfUrl) {
      toast.error("No GLB model available for download");
      return;
    }

    try {
      downloadGLBModel(gltfUrl);
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
      await download3DMFModel(bg3dParsed);
      toast.success("3DMF model downloaded");
    } catch (error) {
      console.error("Error downloading 3DMF:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download 3DMF model",
      );
    }
  };

  const handleTextureEdit = (
    texture: Texture,
    editedImageData: ImageData,
  ): Promise<void> => {
    return editTexture(texture, editedImageData);
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
      const { bg3dFile, skeletonFile } = await loadOttoTestModel();
      await handleFileUpload(bg3dFile, skeletonFile);
    } catch (error) {
      console.error("Error loading sample model:", error);
      toast.error("Failed to load Otto sample files");
    }
  };

  const loadTestModelWithoutSkeleton = async () => {
    try {
      const bg3dFile = await loadOttoTestModelWithoutSkeleton();
      await handleFileUpload(bg3dFile);
    } catch (error) {
      console.error("Error loading sample model without skeleton:", error);
      toast.error("Failed to load Otto sample file");
=======
        if (result.type === "error") {
          throw new Error(result.error);
        }

        if (result.type === "bg3d-to-glb") {
          const glbBlob = new Blob([result.result], {
            type: "model/gltf-binary",
          });
          const url = URL.createObjectURL(glbBlob);
          setGltfUrl(url);

          // Initialize models list (we'll expand this when we can inspect the GLTF)
          setModels([{ name: file.name.replace(".bg3d", ""), visible: true }]);

          toast({
            title: "Model Loaded",
            description: `Successfully loaded ${file.name}`,
          });
        }
      } catch (error) {
        console.error("Error loading BG3D file:", error);
        toast({
          title: "Error Loading Model",
          description:
            error instanceof Error ? error.message : "Failed to load BG3D file",
          variant: "destructive",
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
      //setTextures(extractedTextures);
    },
    [],
  );

  /*   const handleDownloadTexture = useCallback(
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

        toast({
          title: "Texture Downloaded",
          description: `${texture.name} has been downloaded`,
        });
      } catch (error) {
        console.error("Error downloading texture:", error);
        toast({
          title: "Download Failed",
          description: "Failed to download texture",
          variant: "destructive",
        });
      }
    },
    [toast],
  ); */

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
      toast({
        title: "Error Loading Sample Model",
        description: "Failed to load Otto.bg3d sample file",
        variant: "destructive",
      });
>>>>>>> origin/main
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <div className="flex flex-col flex-1 bg-gray-900 text-white">
      <div className="flex flex-1 gap-4 p-4">
        {/* Left sidebar - Controls */}
        <div className="w-80 space-y-4">
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
          {/* BG3D to GLB Upload (Web Worker) - Refactored UI */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Convert BG3D to GLB</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-300">
                Upload a .bg3d file to convert and download as .glb.
              </p>
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  const file = files.find((f) =>
                    f.name.toLowerCase().endsWith(".bg3d"),
                  );
                  if (file) {
                    let downloadName = file.name.replace(/\.bg3d$/, ".glb");
                    try {
                      const buffer = await file.arrayBuffer();
                      const worker = new BG3DGltfWorker();
                      worker.postMessage({ type: "bg3d-to-glb", buffer }, [
                        buffer,
                      ]);
                      worker.onmessage = (event) => {
                        if (event.data.type === "error") {
                          alert(
                            "BG3D to GLB conversion failed: " +
                              event.data.error,
                          );
                          worker.terminate();
                          return;
                        }
                        if (event.data.type === "bg3d-to-glb") {
                          const result = event.data.result;
                          const convertedBlob = new Blob([result], {
                            type: "model/gltf-binary",
                          });
                          const url = URL.createObjectURL(convertedBlob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = downloadName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                          worker.terminate();
                        }
                      };
                    } catch (err) {
                      alert(
                        "BG3D to GLB conversion failed: " +
                          (err instanceof Error ? err.message : err),
                      );
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() =>
                  document.getElementById("bg3d-to-glb-upload")?.click()
                }
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">
                  Drop a BG3D file here or click to select
                </p>
                <p className="text-sm text-gray-500">Supports .bg3d files</p>
              </div>
              <input
                type="file"
                accept=".bg3d"
                className="hidden"
                id="bg3d-to-glb-upload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  let downloadName = file.name.replace(/\.bg3d$/, ".glb");
                  try {
                    const buffer = await file.arrayBuffer();
                    const worker = new BG3DGltfWorker();
                    worker.postMessage({ type: "bg3d-to-glb", buffer }, [
                      buffer,
                    ]);
                    worker.onmessage = (event) => {
                      if (event.data.type === "error") {
                        alert(
                          "BG3D to GLB conversion failed: " + event.data.error,
                        );
                        worker.terminate();
                        return;
                      }
                      if (event.data.type === "bg3d-to-glb") {
                        const result = event.data.result;
                        const convertedBlob = new Blob([result], {
                          type: "model/gltf-binary",
                        });
                        const url = URL.createObjectURL(convertedBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = downloadName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        worker.terminate();
                      }
                    };
                  } catch (err) {
                    alert(
                      "BG3D to GLB conversion failed: " +
                        (err instanceof Error ? err.message : err),
                    );
                  }
                }}
              />
            </CardContent>
          </Card>
>>>>>>> origin/main

          {/* GLB to BG3D Upload (Web Worker) - Refactored UI */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Convert GLB to BG3D</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-300">
                Upload a .glb file to convert and download as .bg3d.
              </p>
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  const file = files.find((f) =>
                    f.name.toLowerCase().endsWith(".glb"),
                  );
                  if (file) {
                    let downloadName = file.name.replace(/\.glb$/, ".bg3d");
                    try {
                      const buffer = await file.arrayBuffer();
                      const worker = new BG3DGltfWorker();
                      worker.postMessage({ type: "glb-to-bg3d", buffer }, [
                        buffer,
                      ]);
                      worker.onmessage = (event) => {
                        if (event.data.type === "error") {
                          alert(
                            "GLB to BG3D conversion failed: " +
                              event.data.error,
                          );
                          worker.terminate();
                          return;
                        }
                        if (event.data.type === "glb-to-bg3d") {
                          const result = event.data.result;
                          const convertedBlob = new Blob([result], {
                            type: "application/octet-stream",
                          });
                          const url = URL.createObjectURL(convertedBlob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = downloadName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                          worker.terminate();
                        }
                      };
                    } catch (err) {
                      alert(
                        "GLB to BG3D conversion failed: " +
                          (err instanceof Error ? err.message : err),
                      );
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() =>
                  document.getElementById("glb-to-bg3d-upload")?.click()
                }
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">
                  Drop a GLB file here or click to select
                </p>
                <p className="text-sm text-gray-500">Supports .glb files</p>
              </div>
              <input
                type="file"
                accept=".glb"
                className="hidden"
                id="glb-to-bg3d-upload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  let downloadName = file.name.replace(/\.glb$/, ".bg3d");
                  try {
                    const buffer = await file.arrayBuffer();
                    const worker = new BG3DGltfWorker();
                    worker.postMessage({ type: "glb-to-bg3d", buffer }, [
                      buffer,
                    ]);
                    worker.onmessage = (event) => {
                      if (event.data.type === "error") {
                        alert(
                          "GLB to BG3D conversion failed: " + event.data.error,
                        );
                        worker.terminate();
                        return;
                      }
                      if (event.data.type === "glb-to-bg3d") {
                        const result = event.data.result;
                        const convertedBlob = new Blob([result], {
                          type: "application/octet-stream",
                        });
                        const url = URL.createObjectURL(convertedBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = downloadName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        worker.terminate();
                      }
                    };
                  } catch (err) {
                    alert(
                      "GLB to BG3D conversion failed: " +
                        (err instanceof Error ? err.message : err),
                    );
                  }
                }}
              />
            </CardContent>
          </Card>

<<<<<<< HEAD
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
=======
          {/* Skeleton Resource Upload */}
          {/*           <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Parse Skeleton Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-300">
                Upload Skeleton Resource (.skeleton.rsrc) to console log the
                parsed data.
              </p>
              <input
                type="file"
                accept=".skeleton.rsrc"
                className="hidden"
                id="skeleton-upload"
                onChange={async (e) => {
                  const skeletonFile = e.target.files?.[0];
                  if (!skeletonFile) return;
                  // TODO: Connect to skeleton parsing logic
                  console.log("Skeleton resource file uploaded:", skeletonFile);
                  const res = await parseSkeletonRsrc({
                    pyodideWorker: undefined,
                    bytes: await skeletonFile.arrayBuffer(),
                  });
                  console.log(res);
                }}
              />
              <Button
                variant="outline"
                className="w-full text-white"
                onClick={() =>
                  document.getElementById("skeleton-upload")?.click()
                }
              >
                Select Skeleton Resource
              </Button>
            </CardContent>
          </Card> */}
>>>>>>> origin/main
        </div>

        {/* Main viewport - 3D Scene */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0">
          {gltfUrl ? (
<<<<<<< HEAD
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
=======
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
              <ambientLight intensity={1} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <directionalLight position={[-10, -10, -5]} intensity={1} />

              {/* Load the GLTF model */}
              <ModelMesh
                url={gltfUrl}
                visible={models[0]?.visible ?? true}
                onTexturesExtracted={handleTexturesExtracted}
              />

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
              />
            </Canvas>
>>>>>>> origin/main
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
      <Toaster />
    </div>
  );
}
