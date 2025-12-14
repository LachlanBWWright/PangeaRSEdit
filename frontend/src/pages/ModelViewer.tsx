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
import * as THREE from "three";
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

  const [scene, setScene] = useState<THREE.Group | undefined>(undefined);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
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
  const handleAnimationsReady = useCallback(
    (
      animationInfos: AnimationInfo[],
      mixer: THREE.AnimationMixer | null,
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
    (nodeObject: THREE.Object3D, visible: boolean) => {
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
                key={gltfUrl}
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
