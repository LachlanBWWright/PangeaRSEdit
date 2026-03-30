import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import {
  AnimationViewer,
  AnimationInfo,
  type AnimationEvent,
  type ModelSourceKind,
} from "@/components/AnimationViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { TextureManager } from "@/components/TextureManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModelUploadPanel } from "./ModelViewer/ModelUploadPanel";
import { VisualizationOptions } from "./ModelViewer/VisualizationOptions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { fromPromise } from "@/types/result";
import { BG3D_EXPORT_TARGETS, getBG3DExportTarget } from "@/modelParsers/bg3dExportTargets";

import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { toast, Toaster } from "sonner";
import { AnimationMixer, Group } from "three";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  extractAnimationMetadataFromGlb,
  updateGlbAnimationEvents,
  type GltfAnimationMetadata,
} from "../modelParsers/gltfAnimationEvents";
import type {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import {
  downloadTexture,
  downloadBG3DModel,
  downloadGLBModel,
  download3DMFModel,
} from "./ModelViewer/utils/downloadUtils";
import { useFileUpload } from "./ModelViewer/hooks/useFileUpload";
import { useTextureManagement } from "./ModelViewer/hooks/useTextureManagement";
import type { UploadStep } from "./ModelViewer/types";
import type { Texture, ModelNode } from "./ModelViewer/types";

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [modelBaseName, setModelBaseName] = useState<string>("model");
  const [loading, setLoading] = useState(false);
  const [textures, setTextures] = useState<Texture[]>([]);
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [gltfBuffer, setGltfBuffer] = useState<ArrayBuffer | null>(null);
  const [gltfAnimationMetadata, setGltfAnimationMetadata] = useState<
    Record<string, GltfAnimationMetadata>
  >({});
  const [animationMixer, setAnimationMixer] = useState<AnimationMixer | null>(
    null,
  );
  const [selectedBoneName, setSelectedBoneName] = useState<string | null>(null);
  const [boneTransform, setBoneTransform] = useState<
    [number, number, number] | null
  >(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [logBonePositions, setLogBonePositions] = useState<boolean>(false);
  const hasAnimations = animations.length > 0;

  const [scene, setScene] = useState<Group | undefined>(undefined);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
  const [bg3dParsed, setBg3dParsed] = useState<BG3DParseResult | null>(null);
  const [gameLabel, setGameLabel] = useState<string | null>(null);
  const [modelSourceKind, setModelSourceKind] =
    useState<ModelSourceKind | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const effectiveModelBaseName = modelBaseName.trim() || "model";
  // Initialize file upload hook
  const { uploadFile } = useFileUpload({
    onGltfUrlChange: setGltfUrl,
    onGltfBufferChange: setGltfBuffer,
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
  const handleFileUpload = (
    bg3dFile: File,
    skeletonFile?: File,
    loadedGameLabel?: string,
  ) => {
    setModelBaseName(bg3dFile.name.replace(/\.[^.]+$/, ""));
    setGameLabel(loadedGameLabel ?? null);
    const lowerName = bg3dFile.name.toLowerCase();
    if (lowerName.endsWith(".3dmf")) {
      setModelSourceKind("3dmf");
    } else if (lowerName.endsWith(".bg3d")) {
      setModelSourceKind("bg3d");
    } else if (lowerName.endsWith(".glb")) {
      setModelSourceKind("glb");
    } else {
      setModelSourceKind("unknown");
    }
    return uploadFile(bg3dFile, skeletonFile);
  };

  // Handle BG3D file selection (step 1 of two-step flow)
  const handleBg3dFileSelect = async (file: File) => {
    const isGlb = file.name.toLowerCase().endsWith(".glb");
    if (isGlb) {
      await handleFileUpload(file);
      return;
    }

    setPendingBg3dFile(file);
    setModelSourceKind(file.name.toLowerCase().endsWith(".3dmf") ? "3dmf" : "bg3d");
    setUploadStep("select-skeleton");
  };

  // Handle skeleton file selection (step 2 of two-step flow)
  const handleSkeletonFileSelect = async (file?: File) => {
    if (pendingBg3dFile) {
      await handleFileUpload(pendingBg3dFile, file);
    }
  };

  // Skip skeleton selection and proceed with just the BG3D file
  const handleSkipSkeleton = async () => {
    if (pendingBg3dFile) {
      await handleFileUpload(pendingBg3dFile);
    }
  };

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const modelFile = files.find((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".bg3d") || name.endsWith(".3dmf") || name.endsWith(".glb");
    });
    const skeletonFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".skeleton.rsrc"),
    );

    if (uploadStep === "select-bg3d") {
      if (modelFile) {
        if (modelFile.name.toLowerCase().endsWith(".glb")) {
          await handleFileUpload(modelFile);
        } else if (skeletonFile) {
          await handleFileUpload(modelFile, skeletonFile);
        } else {
          await handleBg3dFileSelect(modelFile);
        }
      } else if (skeletonFile) {
        toast.error("Please first select a BG3D or 3DMF file");
      } else {
        toast.error("Please drop a BG3D, 3DMF, or GLB file");
      }
    } else if (uploadStep === "select-skeleton") {
      if (skeletonFile) {
        await handleSkeletonFileSelect(skeletonFile);
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
      if (normalizedAnimations.length === 0) {
        setLogBonePositions(false);
      }
      setSelectedBoneName(null);
      setBoneTransform(null);
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

  const handleAnimationEventsChange = useCallback(
    async (animationIndex: number, events: AnimationEvent[]) => {
      const nextEvents = events.map((event) => ({ ...event }));

      if (bg3dParsed?.skeleton?.animations) {
        if (
          animationIndex < 0 ||
          animationIndex >= bg3dParsed.skeleton.animations.length
        ) {
          toast.error(
            "Animation event edits can only be persisted for imported animations",
          );
          return;
        }

        const updatedParsed: BG3DParseResult = {
          ...bg3dParsed,
          skeleton: {
            ...bg3dParsed.skeleton,
            animations: bg3dParsed.skeleton.animations.map((animation, index) =>
              index === animationIndex
                ? {
                    ...animation,
                    numAnimEvents: nextEvents.length,
                    events: nextEvents,
                  }
                : animation,
            ),
          },
        };

        const worker = new BG3DGltfWorker();
        const workerResult = await fromPromise(
          new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
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
              parsed: updatedParsed,
            };
            worker.postMessage(message);
          }),
        );

        if (workerResult.isErr()) {
          toast.error(
            `Failed to update animation events: ${
              workerResult.error instanceof Error
                ? workerResult.error.message
                : String(workerResult.error)
            }`,
          );
          return;
        }

        const result = workerResult.value;
        if (result.type === "error") {
          toast.error(`Failed to update animation events: ${result.error}`);
          return;
        }
        if (result.type !== "bg3d-parsed-to-glb") {
          toast.error(
            `Unexpected worker response while updating animation events: ${result.type}`,
          );
          return;
        }

        if (gltfUrl) {
          URL.revokeObjectURL(gltfUrl);
        }

        const glbBlob = new Blob([result.result], {
          type: "model/gltf-binary",
        });
        const newUrl = URL.createObjectURL(glbBlob);
        setBg3dParsed(result.parsed ?? updatedParsed);
        setGltfBuffer(result.result);
        setGltfUrl(newUrl);
        const metadataResult = await fromPromise(
          extractAnimationMetadataFromGlb(result.result),
        );
        if (metadataResult.isOk()) {
          setGltfAnimationMetadata(metadataResult.value);
        } else {
          console.warn(
            "Failed to refresh animation metadata after edit",
            metadataResult.error,
          );
        }
        toast.success(
          `Updated animation events for animation #${animationIndex + 1}`,
        );
        return;
      }

      if (!gltfBuffer) {
        toast.error("No GLB buffer available for animation event edits");
        return;
      }

      if (animationIndex < 0 || animationIndex >= animations.length) {
        toast.error("Animation event edits can only target loaded animations");
        return;
      }

      const updatedBufferResult = await fromPromise(
        updateGlbAnimationEvents(
          gltfBuffer,
          animationIndex,
          nextEvents,
        ),
      );
      if (updatedBufferResult.isErr()) {
        toast.error(
          `Failed to update animation events: ${updatedBufferResult.error.message}`,
        );
        return;
      }
      if (updatedBufferResult.value.isErr()) {
        toast.error(
          `Failed to update animation events: ${updatedBufferResult.value.error.message}`,
        );
        return;
      }
      const updatedBuffer = updatedBufferResult.value.value;

      if (gltfUrl) {
        URL.revokeObjectURL(gltfUrl);
      }

      const glbBlob = new Blob([updatedBuffer], {
        type: "model/gltf-binary",
      });
      const newUrl = URL.createObjectURL(glbBlob);
      setGltfBuffer(updatedBuffer);
      setGltfUrl(newUrl);
      const metadataResult = await fromPromise(
        extractAnimationMetadataFromGlb(updatedBuffer),
      );
      if (metadataResult.isOk()) {
        setGltfAnimationMetadata(metadataResult.value);
      } else {
        console.warn(
          "Failed to refresh animation metadata after edit",
          metadataResult.error,
        );
      }
      toast.success(
        `Updated animation events for animation #${animationIndex + 1}`,
      );
    },
    [animations.length, bg3dParsed, gltfBuffer, gltfUrl],
  );

  useEffect(() => {
    let cancelled = false;
    if (!gltfBuffer || bg3dParsed?.skeleton?.animations) {
      return undefined;
    }

    void extractAnimationMetadataFromGlb(gltfBuffer)
      .then((metadata) => {
        if (!cancelled) {
          setGltfAnimationMetadata(metadata);
        }
      })
      .catch((error) => {
        console.warn("Failed to extract animation metadata from GLB", error);
        if (!cancelled) {
          setGltfAnimationMetadata({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bg3dParsed, gltfBuffer]);

  const animationMetadata = useMemo(() => {
    if (bg3dParsed?.skeleton?.animations) {
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
    }
    if (!gltfBuffer) {
      return {};
    }
    return gltfAnimationMetadata;
  }, [bg3dParsed, gltfAnimationMetadata, gltfBuffer]);

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

  const handleDownloadBG3D = async (exportTargetId: string) => {
    if (!gltfUrl) {
      toast.error("No GLB model available for BG3D download");
      return;
    }

    const result = await downloadBG3DModel(
      gltfUrl,
      effectiveModelBaseName,
      `${effectiveModelBaseName}.skeleton`,
      getBG3DExportTarget(exportTargetId),
    );
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

    downloadGLBModel(gltfUrl, effectiveModelBaseName);
    toast.success("GLB model downloaded");
  };

  const handleDownload3DMF = async (exportTargetId: string) => {
    if (!gltfUrl) {
      toast.error("No GLB model available for 3DMF download");
      return;
    }

    const result = await download3DMFModel(
      gltfUrl,
      effectiveModelBaseName,
      getBG3DExportTarget(exportTargetId),
    );
    if (result.isErr()) {
      console.error("Error downloading 3DMF:", result.error);
      toast.error(result.error.message);
      return;
    }
    toast.success("3DMF model downloaded");
  };

  const handleDownloadSelectedExport = async (targetId: string) => {
    if (!gltfUrl) {
      toast.error("No model available for download");
      return;
    }

    const target = getBG3DExportTarget(targetId);
    if (targetId === "glb") {
      handleDownloadGLB();
      return;
    }

    if (target.companionExtension === "3df") {
      await handleDownload3DMF(target.id);
      return;
    }

    await handleDownloadBG3D(target.id);
  };

  const handleTextureEdit = (
    texture: Texture,
    editedImageData: ImageData,
  ): Promise<void> => {
    return editTexture(texture, editedImageData);
  };

  const handleClearModel = () => {
    setGltfUrl(null);
    setGltfBuffer(null);
    setGltfAnimationMetadata({});
    setBg3dParsed(null);
    setGameLabel(null);
    setModelSourceKind(null);
    setTextures([]);
    setModelNodes([]);
    setModelBaseName("model");
    setScene(undefined);
    setUploadStep("select-bg3d");
    setPendingBg3dFile(null);
    toast.success("Model cleared");
  };

  return (
    <>
      <div className="h-full overflow-hidden p-4 bg-gray-900 text-white">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          <ResizablePanel
            defaultSize={28}
            minSize={20}
            className="min-h-0 min-w-0 pr-3"
          >
            <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4 overflow-y-auto overflow-x-hidden px-2">
              <ModelUploadPanel
                gltfUrl={gltfUrl}
                loading={loading}
                uploadStep={uploadStep}
                pendingBg3dFile={pendingBg3dFile}
                fileInputRef={fileInputRef}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                handleBg3dFileSelect={handleBg3dFileSelect}
                handleSkeletonFileSelect={handleSkeletonFileSelect}
                handleSkipSkeleton={handleSkipSkeleton}
                handleFileUpload={handleFileUpload}
                modelBaseName={modelBaseName}
                onModelBaseNameChange={setModelBaseName}
                exportTargets={[
                  ...BG3D_EXPORT_TARGETS,
                  { id: "glb", label: "GLB" },
                ]}
                handleDownloadSelectedExport={handleDownloadSelectedExport}
                handleClearModel={handleClearModel}
                onCancelSelection={() => {
                  setUploadStep("select-bg3d");
                  setPendingBg3dFile(null);
                }}
              />

              {/* Visualization Controls */}
              {gltfUrl && (
                <VisualizationOptions
                  wireframeMode={wireframeMode}
                  setWireframeMode={setWireframeMode}
                  logBonePositions={logBonePositions}
                  setLogBonePositions={setLogBonePositions}
                  hasAnimations={hasAnimations}
                />
              )}

          {/* Model Hierarchy — visibility toggles + poly counts */}
          {gltfUrl && modelNodes.length > 0 && (
            <ModelHierarchy
              nodes={modelNodes}
              clonedScene={scene}
              onVisibilityChange={(nodeObject, visible) => {
                nodeObject.visible = visible;
              }}
            />
          )}

          {/* Animation Viewer - Show when animations are available */}
          {gltfUrl && hasAnimations && (
          <AnimationViewer
              key={gltfUrl}
              animations={animations}
              animationMixer={animationMixer}
              gameLabel={gameLabel}
              modelSourceKind={modelSourceKind}
              onBoneSelectionChange={handleBoneSelectionChange}
              onAnimationEventsChange={handleAnimationEventsChange}
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
              <CardContent>
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
             </div>
           </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={72} minSize={35} className="min-h-0">
            <div className="h-full bg-gray-800 rounded-lg overflow-hidden min-h-0">
              {/* Main viewport - 3D Scene */}
              {gltfUrl ? (
                <ErrorBoundary>
                  <ModelCanvas
                    gltfUrl={gltfUrl}
                    setModelNodes={setModelNodes}
                    onSceneReady={setScene}
                    onAnimationsReady={handleAnimationsReady}
                    wireframeMode={wireframeMode}
                    showSkeleton={wireframeMode && hasAnimations}
                    logBonePositions={logBonePositions}
                    selectedBoneName={hasAnimations ? selectedBoneName : null}
                    onBoneTransformChange={handleBoneTransformChange}
                  />
                </ErrorBoundary>
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Toaster />
    </>
  );
}
