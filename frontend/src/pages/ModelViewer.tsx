import { useState, useRef, useCallback, useMemo } from "react";
import { ModelCanvas } from "./ModelCanvas";
// import { ModelHierarchy } from "@/components/ModelHierarchy";
import { AnimationViewer, AnimationInfo } from "@/components/AnimationViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { TextureManager } from "@/components/TextureManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModelUploadPanel } from "./ModelViewer/ModelUploadPanel";
import { VisualizationOptions } from "./ModelViewer/VisualizationOptions";
import { fromPromise } from "@/types/result";

import { SkeletonConversionPanel } from "@/components/SkeletonConversionPanel";
import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { toast, Toaster } from "sonner";
import { AnimationMixer, Group } from "three";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "../modelParsers/bg3dGltfWorker";
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

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [animationMixer, setAnimationMixer] = useState<AnimationMixer | null>(
    null,
  );
  const [selectedBoneName, setSelectedBoneName] = useState<string | null>(null);
  const [boneTransform, setBoneTransform] = useState<
    [number, number, number] | null
  >(null);
  const [uploadStep, setUploadStep] = useState<
    "select-bg3d" | "select-skeleton" | "completed"
  >("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [useGameSelector, setUseGameSelector] = useState<boolean>(true); // New state for UI mode
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [logBonePositions, setLogBonePositions] = useState<boolean>(false);

  const [, setScene] = useState<Group | undefined>(undefined);
  const [, setModelNodes] = useState<ModelNode[]>([]);
  const [bg3dParsed, setBg3dParsed] = useState<BG3DParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle BG3D file selection (step 1 of two-step flow)
  const handleBg3dFileSelect = (file: File) => {
    setPendingBg3dFile(file);
    setUploadStep("select-skeleton");
  };

  // Handle skeleton file selection (step 2 of two-step flow)
  const handleSkeletonFileSelect = (file?: File) => {
    if (pendingBg3dFile) {
      handleFileUpload(pendingBg3dFile, file);
    }
  };

  // Skip skeleton selection and proceed with just the BG3D file
  const handleSkipSkeleton = () => {
    if (pendingBg3dFile) {
      handleFileUpload(pendingBg3dFile);
    }
  };

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
    (animationInfos: AnimationInfo[], mixer: AnimationMixer | null) => {
      // Use glTF animations from the model
      const normalizedAnimations = animationInfos.map((animation) => ({
        ...animation,
        loop: animation.loop ?? true,
      }));
      setAnimations(normalizedAnimations);
      setAnimationMixer(mixer);
      setSelectedBoneName(null);
      setBoneTransform(null);

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

  const handleBoneTransformChange = useCallback(
    (position: [number, number, number]) => {
      setBoneTransform(position);
    },
    [],
  );

  const handleBoneSelectionChange = useCallback((boneName: string | null) => {
    setSelectedBoneName(boneName);
    setBoneTransform(null);
  }, []);

  const animationMetadata = useMemo(() => {
    if (!bg3dParsed?.skeleton?.animations) {
      return {};
    }
    return bg3dParsed.skeleton.animations.reduce(
      (acc, animation) => {
        acc[animation.name] = {
          eventCount: animation.numAnimEvents,
          events: animation.events,
        };
        return acc;
      },
      {} as Record<
        string,
        { eventCount: number; events: { time: number; type: number; value: number }[] }
      >,
    );
  }, [bg3dParsed]);

  // Removed unused handleTexturesExtracted and handleNodesExtracted

  // Removed handleClonedSceneUpdate, handled in ModelCanvas

  async function handleDownloadTexture(texture: Texture) {
    const result = await fromPromise(downloadTexture(texture, texture.name));
    if (result.isErr()) {
      console.error("Error downloading texture:", result.error);
      toast.error("Failed to download texture");
      return;
    }
    toast.success(`${texture.name} has been downloaded`);
  }

  const handleReplaceTexture = (texture: Texture, newFile: File) => {
    return replaceTexture(texture, newFile);
  };

  const handleDownloadBG3D = async () => {
    if (!bg3dParsed) {
      toast.error("No BG3D data available for download");
      return;
    }

    const result = await fromPromise(downloadBG3DModel(bg3dParsed));
    if (result.isErr()) {
      console.error("Error downloading BG3D:", result.error);
      toast.error(result.error.message);
      return;
    }
    toast.success("BG3D model downloaded");
  };

  const handleDownloadGLB = () => {
    if (!gltfUrl) {
      toast.error("No GLB model available for download");
      return;
    }

    downloadGLBModel(gltfUrl);
    toast.success("GLB model downloaded");
  };

  const handleDownload3DMF = async () => {
    if (!bg3dParsed) {
      toast.error("No model data available for download");
      return;
    }

    const result = await fromPromise(download3DMFModel(bg3dParsed));
    if (result.isErr()) {
      console.error("Error downloading 3DMF:", result.error);
      toast.error(result.error.message);
      return;
    }
    toast.success("3DMF model downloaded");
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
    const result = await loadOttoTestModel();
    if (result.isErr()) {
      console.error("Error loading sample model:", result.error);
      toast.error("Failed to load Otto sample files");
      return;
    }

    const { bg3dFile, skeletonFile } = result.value;
    const uploadResult = await handleFileUpload(bg3dFile, skeletonFile);
    if (!uploadResult || uploadResult.isErr()) {
      console.error("Error uploading sample model:", uploadResult?.error);
      toast.error(
        uploadResult?.error?.message || "Failed to load Otto sample files",
      );
      return;
    }
  };

  const loadTestModelWithoutSkeleton = async () => {
    const result = await loadOttoTestModelWithoutSkeleton();
    if (result.isErr()) {
      console.error(
        "Error loading sample model without skeleton:",
        result.error,
      );
      toast.error("Failed to load Otto sample file");
      return;
    }

    const bg3dFile = result.value;
    const uploadResult = await handleFileUpload(bg3dFile);
    if (!uploadResult || uploadResult.isErr()) {
      console.error("Error uploading sample model:", uploadResult?.error);
      toast.error(
        uploadResult?.error?.message || "Failed to load Otto sample file",
      );
      return;
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
                    const downloadName = file.name.replace(/\.glb$/, ".bg3d");
                    const bufferResult = await fromPromise(file.arrayBuffer());
                    if (bufferResult.isErr()) {
                      alert(
                        "GLB to BG3D conversion failed: " +
                          bufferResult.error.message,
                      );
                      return;
                    }
                    const buffer = bufferResult.value;
                    const worker = new BG3DGltfWorker();
                    worker.postMessage({ type: "glb-to-bg3d", buffer }, [
                      buffer,
                    ]);
                    worker.onmessage = (
                      event: MessageEvent<BG3DGltfWorkerResponse>,
                    ) => {
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
                  const downloadName = file.name.replace(/\.glb$/, ".bg3d");
                  const bufferResult = await fromPromise(file.arrayBuffer());
                  if (bufferResult.isErr()) {
                    alert(
                      "GLB to BG3D conversion failed: " +
                        bufferResult.error.message,
                    );
                    return;
                  }
                  const buffer = bufferResult.value;
                  const worker = new BG3DGltfWorker();
                  worker.postMessage({ type: "glb-to-bg3d", buffer }, [buffer]);
                  worker.onmessage = (
                    event: MessageEvent<BG3DGltfWorkerResponse>,
                  ) => {
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
                }}
              />
            </CardContent>
          </Card>

          {/* Visualization Controls */}
          {gltfUrl && (
            <VisualizationOptions
              wireframeMode={wireframeMode}
              setWireframeMode={setWireframeMode}
              logBonePositions={logBonePositions}
              setLogBonePositions={setLogBonePositions}
            />
          )}

          {/* Animation Viewer - Show when animations are available */}
          {gltfUrl && (
            <AnimationViewer
              key={gltfUrl}
              animations={animations}
              animationMixer={animationMixer}
              onBoneSelectionChange={handleBoneSelectionChange}
              animationMetadata={animationMetadata}
              boneTransform={boneTransform}
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
                showSkeleton={wireframeMode}
                logBonePositions={logBonePositions}
                selectedBoneName={selectedBoneName}
                onBoneTransformChange={handleBoneTransformChange}
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
      <Toaster />
    </>
  );
}
