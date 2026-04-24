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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ResultAsync, err, ok } from "neverthrow";

import {
  BG3D_EXPORT_TARGETS,
  getBG3DExportTarget,
} from "@/modelParsers/bg3dExportTargets";

import { BG3DParseResult } from "../modelParsers/parseBG3D";
import { toast, Toaster } from "sonner";
import { AnimationMixer, Group, SkinnedMesh } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  extractAnimationMetadataFromGlb,
  normalizeGlbBuffer,
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
import { getParsedToGlbWorkerResponse } from "./ModelViewer/utils/bg3dGltfWorkerResponses";
import { prepareSceneForAnimationExport } from "./ModelViewer/utils/prepareSceneForAnimationExport";
import { useFileUpload } from "./ModelViewer/hooks/useFileUpload";
import { useTextureManagement } from "./ModelViewer/hooks/useTextureManagement";
import type { UploadStep } from "./ModelViewer/types";
import type { Texture, ModelNode } from "./ModelViewer/types";
import { mapErr } from "@/utils/mapErr";

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [modelSessionId, setModelSessionId] = useState(0);
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
  const [boneRotation, setBoneRotation] = useState<
    [number, number, number, number] | null
  >(null);
  const [boneScale, setBoneScale] = useState<[number, number, number] | null>(
    null,
  );
  const [gizmoMode, setGizmoMode] =
    useState<import("@/components/model-viewer/types").GizmoMode>("translate");
  const [uploadStep, setUploadStep] = useState<UploadStep>("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [showSkeletonOverlay, setShowSkeletonOverlay] =
    useState<boolean>(false);
  const [logBonePositions, setLogBonePositions] = useState<boolean>(false);
  const [boneRenameInput, setBoneRenameInput] = useState<string>("");
  const latestAnimationsRef = useRef<AnimationInfo[]>([]);
  const animationPersistRequestIdRef = useRef(0);
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
    return uploadFile(bg3dFile, skeletonFile).then((result) => {
      if (result.isOk()) {
        setModelSessionId((current) => current + 1);
      }
      return result;
    });
  };

  // Handle BG3D file selection (step 1 of two-step flow)
  const handleBg3dFileSelect = async (file: File) => {
    const isGlb = file.name.toLowerCase().endsWith(".glb");
    if (isGlb) {
      await handleFileUpload(file);
      return;
    }

    setPendingBg3dFile(file);
    setModelSourceKind(
      file.name.toLowerCase().endsWith(".3dmf") ? "3dmf" : "bg3d",
    );
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
      return (
        name.endsWith(".bg3d") ||
        name.endsWith(".3dmf") ||
        name.endsWith(".glb")
      );
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

  const exportSceneWithAnimations = useCallback(
    async (animationInfos: AnimationInfo[]) => {
      if (!scene) {
        return ok(null);
      }

      const exporter = new GLTFExporter();
      const exportScene = prepareSceneForAnimationExport(scene);
      const animationsToExport = animationInfos.map(
        (animation) => animation.clip,
      );

      const exportedResult = await ResultAsync.fromPromise(
        new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            exportScene,
            (result) => {
              if (result instanceof ArrayBuffer) {
                resolve(result);
                return;
              }
              reject(
                new Error(
                  "GLTFExporter returned JSON output instead of GLB bytes",
                ),
              );
            },
            (error) => {
              reject(error instanceof Error ? error : new Error(String(error)));
            },
            {
              binary: true,
              animations: animationsToExport,
              embedImages: true,
            },
          );
        }),
        mapErr,
      );

      if (exportedResult.isErr()) {
        return err(exportedResult.error);
      }

      return ok(exportedResult.value);
    },
    [scene],
  );

  const buildUpdatedGlbBuffer = useCallback(
    async (buffer: ArrayBuffer, animationInfos: AnimationInfo[]) => {
      let nextBuffer = buffer;
      const bg3dEventsByName = new Map(
        bg3dParsed?.skeleton?.animations.map((animation) => [
          animation.name,
          animation.events,
        ]) ?? [],
      );

      for (const [animationIndex, animation] of animationInfos.entries()) {
        const events =
          bg3dEventsByName.get(animation.name) ??
          gltfAnimationMetadata[animation.name]?.events ??
          [];

        if (events.length === 0) {
          continue;
        }

        const updatedBufferResult = await ResultAsync.fromPromise(
          updateGlbAnimationEvents(nextBuffer, animationIndex, events),
          mapErr,
        );
        if (updatedBufferResult.isErr()) {
          return err(updatedBufferResult.error);
        }
        if (updatedBufferResult.value.isErr()) {
          return err(updatedBufferResult.value.error);
        }
        nextBuffer = updatedBufferResult.value.value;
      }

      return ok(nextBuffer);
    },
    [bg3dParsed?.skeleton?.animations, gltfAnimationMetadata],
  );

  const persistAnimations = useCallback(
    async (animationInfos: AnimationInfo[]) => {
      if (!scene) {
        setAnimations(animationInfos);
        latestAnimationsRef.current = animationInfos;
        return;
      }

      const requestId = ++animationPersistRequestIdRef.current;

      const exportedBufferResult =
        await exportSceneWithAnimations(animationInfos);
      if (exportedBufferResult.isErr()) {
        console.error(
          "Failed to export animation edits to GLB",
          exportedBufferResult.error,
        );
        toast.error(
          `Failed to export animation edits to GLB: ${exportedBufferResult.error.message}`,
        );
        return;
      }
      if (!exportedBufferResult.value) {
        return;
      }

      const bufferWithEventsResult = await buildUpdatedGlbBuffer(
        exportedBufferResult.value,
        animationInfos,
      );
      if (bufferWithEventsResult.isErr()) {
        console.error(
          "Failed to update animation event metadata",
          bufferWithEventsResult.error,
        );
        toast.error(
          `Failed to update animation event metadata: ${bufferWithEventsResult.error.message}`,
        );
        return;
      }

      const normalizedBufferResult = await ResultAsync.fromPromise(
        normalizeGlbBuffer(bufferWithEventsResult.value),
        mapErr,
      );
      if (normalizedBufferResult.isErr()) {
        console.error(
          "Failed to normalize animation-edited GLB",
          normalizedBufferResult.error,
        );
        toast.error(
          `Failed to normalize animation-edited GLB: ${normalizedBufferResult.error.message}`,
        );
        return;
      }
      const normalizedBuffer = normalizedBufferResult.value;

      if (requestId !== animationPersistRequestIdRef.current) {
        return;
      }

      if (gltfUrl) {
        URL.revokeObjectURL(gltfUrl);
      }

      const glbBlob = new Blob([normalizedBuffer], {
        type: "model/gltf-binary",
      });
      const newUrl = URL.createObjectURL(glbBlob);

      setAnimations(animationInfos);
      latestAnimationsRef.current = animationInfos;
      setGltfBuffer(normalizedBuffer);
      setGltfUrl(newUrl);

      const metadataResult = await ResultAsync.fromPromise(
        extractAnimationMetadataFromGlb(normalizedBuffer),
        mapErr,
      );
      if (metadataResult.isOk()) {
        setGltfAnimationMetadata(metadataResult.value);
      }

      const workerResult = await ResultAsync.fromPromise(
        new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
          const worker = new BG3DGltfWorker();
          worker.onmessage = (e) => {
            resolve(e.data);
            worker.terminate();
          };
          worker.onerror = (e) => {
            reject(e);
            worker.terminate();
          };
          worker.postMessage({
            type: "glb-to-bg3d",
            buffer: normalizedBuffer,
          } satisfies BG3DGltfWorkerMessage);
        }),
        mapErr,
      );

      if (workerResult.isOk()) {
        const result = workerResult.value;
        if (result.type === "glb-to-bg3d" && result.parsed) {
          setBg3dParsed(result.parsed);
        }
      }
    },
    [buildUpdatedGlbBuffer, exportSceneWithAnimations, gltfUrl, scene],
  );

  // Handle animation state from ModelCanvas
  const handleAnimationsReady = useCallback(
    (animationInfos: AnimationInfo[], mixer: AnimationMixer | null) => {
      // Use glTF animations from the model
      const normalizedAnimations = animationInfos.map((animation) => ({
        ...animation,
        loop: animation.loop ?? true,
      }));
      setAnimations(normalizedAnimations);
      latestAnimationsRef.current = normalizedAnimations;
      setAnimationMixer(mixer);
      if (normalizedAnimations.length === 0) {
        setLogBonePositions(false);
      }
      setSelectedBoneName(null);
      setBoneTransform(null);
    },
    [],
  );

  const handleAnimationsChange = useCallback(
    (animationInfos: AnimationInfo[]) => {
      latestAnimationsRef.current = animationInfos;
      void persistAnimations(animationInfos);
    },
    [persistAnimations],
  );

  const handleBoneTransformChange = useCallback(
    (position: [number, number, number]) => {
      setBoneTransform(position);
    },
    [],
  );

  const handleBoneRotationChange = useCallback(
    (quaternion: [number, number, number, number]) => {
      setBoneRotation(quaternion);
    },
    [],
  );

  const handleBoneScaleChange = useCallback(
    (scale: [number, number, number]) => {
      setBoneScale(scale);
    },
    [],
  );

  const handleGizmoModeChange = useCallback(
    (mode: import("@/components/model-viewer/types").GizmoMode) => {
      setGizmoMode(mode);
    },
    [],
  );

  const handleBoneSelectionChange = useCallback((boneName: string | null) => {
    setSelectedBoneName(boneName);
    setBoneRenameInput(boneName ?? "");
    setBoneTransform(null);
    setBoneRotation(null);
    setBoneScale(null);
  }, []);

  const handleRenameSelectedBone = useCallback(() => {
    if (!scene || !selectedBoneName) {
      toast.error("Select a bone before renaming");
      return;
    }
    const nextName = boneRenameInput.trim();
    if (!nextName) {
      toast.error("Bone name cannot be empty");
      return;
    }
    if (nextName === selectedBoneName) {
      return;
    }

    let renamed = false;
    scene.traverse((object) => {
      if (object.name === selectedBoneName) {
        object.name = nextName;
        renamed = true;
      }
    });

    if (!renamed) {
      toast.error("Selected bone was not found in the loaded model");
      return;
    }

    setAnimations((currentAnimations) =>
      currentAnimations.map((animation) => {
        const cloned = animation.clip.clone();
        cloned.tracks.forEach((track) => {
          if (track.name.startsWith(`${selectedBoneName}.`)) {
            track.name = `${nextName}.${track.name.slice(selectedBoneName.length + 1)}`;
          }
        });
        return {
          ...animation,
          clip: cloned,
        };
      }),
    );
    latestAnimationsRef.current = latestAnimationsRef.current.map(
      (animation) => {
        const cloned = animation.clip.clone();
        cloned.tracks.forEach((track) => {
          if (track.name.startsWith(`${selectedBoneName}.`)) {
            track.name = `${nextName}.${track.name.slice(selectedBoneName.length + 1)}`;
          }
        });
        return {
          ...animation,
          clip: cloned,
        };
      },
    );

    setBg3dParsed((currentParsed) => {
      if (!currentParsed?.skeleton?.bones) {
        return currentParsed;
      }
      return {
        ...currentParsed,
        skeleton: {
          ...currentParsed.skeleton,
          bones: currentParsed.skeleton.bones.map((bone) =>
            bone.name === selectedBoneName ? { ...bone, name: nextName } : bone,
          ),
        },
      };
    });

    setModelNodes((currentNodes) => {
      const renameNode = (node: ModelNode): ModelNode => ({
        ...node,
        name: node.name === selectedBoneName ? nextName : node.name,
        children: node.children?.map(renameNode),
      });
      return currentNodes.map(renameNode);
    });

    setSelectedBoneName(nextName);
    toast.success(`Renamed bone '${selectedBoneName}' to '${nextName}'`);
  }, [boneRenameInput, scene, selectedBoneName]);

  const boneInfluenceRows = useMemo(() => {
    if (!scene) {
      return [] as {
        boneName: string;
        vertexCount: number;
        weightedSum: number;
      }[];
    }

    const totals = new Map<
      string,
      { vertexCount: number; weightedSum: number }
    >();

    scene.traverse((object) => {
      if (!(object instanceof SkinnedMesh) || !object.skeleton) {
        return;
      }
      const geometry = object.geometry;
      if (!geometry) {
        return;
      }

      const skinIndex = geometry.getAttribute("skinIndex");
      const skinWeight = geometry.getAttribute("skinWeight");
      if (!skinIndex || !skinWeight) {
        return;
      }

      const vertexCount = Math.min(skinIndex.count, skinWeight.count);
      for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
        for (let influenceIndex = 0; influenceIndex < 4; influenceIndex += 1) {
          const weight =
            influenceIndex === 0
              ? skinWeight.getX(vertexIndex)
              : influenceIndex === 1
                ? skinWeight.getY(vertexIndex)
                : influenceIndex === 2
                  ? skinWeight.getZ(vertexIndex)
                  : skinWeight.getW(vertexIndex);
          const boneIndex =
            influenceIndex === 0
              ? skinIndex.getX(vertexIndex)
              : influenceIndex === 1
                ? skinIndex.getY(vertexIndex)
                : influenceIndex === 2
                  ? skinIndex.getZ(vertexIndex)
                  : skinIndex.getW(vertexIndex);
          if (!Number.isFinite(weight) || weight <= 0) {
            continue;
          }
          const bone = object.skeleton?.bones?.[boneIndex];
          const boneName = bone?.name;
          if (!boneName) {
            continue;
          }
          const current = totals.get(boneName) ?? {
            vertexCount: 0,
            weightedSum: 0,
          };
          current.vertexCount += 1;
          current.weightedSum += weight;
          totals.set(boneName, current);
        }
      }
    });

    return Array.from(totals.entries())
      .map(([boneName, total]) => ({
        boneName,
        vertexCount: total.vertexCount,
        weightedSum: total.weightedSum,
      }))
      .sort((a, b) => b.weightedSum - a.weightedSum);
  }, [scene]);

  const displayedBoneInfluenceRows = useMemo(() => {
    if (!selectedBoneName) {
      return boneInfluenceRows;
    }
    const selectedRow = boneInfluenceRows.find(
      (row) => row.boneName === selectedBoneName,
    );
    if (!selectedRow) {
      return boneInfluenceRows;
    }
    return [
      selectedRow,
      ...boneInfluenceRows.filter((row) => row.boneName !== selectedBoneName),
    ];
  }, [boneInfluenceRows, selectedBoneName]);

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
            animations: bg3dParsed.skeleton.animations.map(
              (animation, index) =>
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
        const workerResult = await ResultAsync.fromPromise(
          new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
            worker.onmessage = (e) => {
              resolve(e.data);
              worker.terminate();
            };
            worker.onerror = (e) => {
              reject(e);
              worker.terminate();
            };
            const message = {
              type: "bg3d-parsed-to-glb",
              parsed: updatedParsed,
            } satisfies BG3DGltfWorkerMessage;
            worker.postMessage(message);
          }),
          mapErr,
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

        const responseResult = getParsedToGlbWorkerResponse(
          workerResult.value,
          "update animation events",
        );
        if (responseResult.isErr()) {
          toast.error(responseResult.error.message);
          return;
        }
        const result = responseResult.value;

        if (gltfUrl) {
          URL.revokeObjectURL(gltfUrl);
        }

        const normalizedBuffer = await normalizeGlbBuffer(result.result);

        const glbBlob = new Blob([normalizedBuffer], {
          type: "model/gltf-binary",
        });
        const newUrl = URL.createObjectURL(glbBlob);
        setBg3dParsed(result.parsed ?? updatedParsed);
        setGltfBuffer(normalizedBuffer);
        setGltfUrl(newUrl);
        const metadataResult = await ResultAsync.fromPromise(
          extractAnimationMetadataFromGlb(normalizedBuffer),
          mapErr,
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

      const updatedBufferResult = await ResultAsync.fromPromise(
        updateGlbAnimationEvents(gltfBuffer, animationIndex, nextEvents),
        mapErr,
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
      const normalizedBuffer = await normalizeGlbBuffer(
        updatedBufferResult.value.value,
      );

      if (gltfUrl) {
        URL.revokeObjectURL(gltfUrl);
      }

      const glbBlob = new Blob([normalizedBuffer], {
        type: "model/gltf-binary",
      });
      const newUrl = URL.createObjectURL(glbBlob);
      setGltfBuffer(normalizedBuffer);
      setGltfUrl(newUrl);
      const metadataResult = await ResultAsync.fromPromise(
        extractAnimationMetadataFromGlb(normalizedBuffer),
        mapErr,
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

    const extractMetadata = async () => {
      const result = await ResultAsync.fromPromise(
        extractAnimationMetadataFromGlb(gltfBuffer),
        mapErr,
      );
      if (cancelled) return;
      if (result.isErr()) {
        console.warn(
          "Failed to extract animation metadata from GLB",
          result.error,
        );
        if (!cancelled) setGltfAnimationMetadata({});
        return;
      }
      if (!cancelled) setGltfAnimationMetadata(result.value);
    };

    void extractMetadata();

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
          {
            eventCount: number;
            events: { time: number; type: number; value: number }[];
          }
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
    const result = await ResultAsync.fromPromise(
      downloadTexture(texture, texture.name),
      mapErr,
    );
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
    if (!gltfBuffer) {
      toast.error("No GLB buffer available for BG3D download");
      return;
    }

    const result = await downloadBG3DModel(
      gltfBuffer,
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
    if (!gltfBuffer) {
      toast.error("No GLB buffer available for 3DMF download");
      return;
    }

    const result = await download3DMFModel(
      gltfBuffer,
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
    setWireframeMode(false);
    setShowSkeletonOverlay(false);
    setLogBonePositions(false);
    setSelectedBoneName(null);
    setBoneRenameInput("");
    setUploadStep("select-bg3d");
    setPendingBg3dFile(null);
    setModelSessionId((current) => current + 1);
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
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-2">
              <div className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden">
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
                    showSkeleton={showSkeletonOverlay}
                    setShowSkeleton={setShowSkeletonOverlay}
                    logBonePositions={logBonePositions}
                    setLogBonePositions={setLogBonePositions}
                    hasAnimations={hasAnimations}
                  />
                )}

                {gltfUrl && hasAnimations && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        Bone Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400">
                          Selected Bone
                        </label>
                        <Input
                          value={boneRenameInput}
                          onChange={(e) => setBoneRenameInput(e.target.value)}
                          placeholder="Select a bone in Animation Viewer"
                          disabled={!selectedBoneName}
                        />
                        <Button
                          onClick={handleRenameSelectedBone}
                          disabled={
                            !selectedBoneName || !boneRenameInput.trim()
                          }
                          className="w-full"
                          size="sm"
                        >
                          Rename Bone
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">
                          Bone-Vertex Influence Summary
                        </p>
                        <div className="max-h-44 overflow-y-auto rounded border border-gray-700">
                          {displayedBoneInfluenceRows.length === 0 ? (
                            <div className="p-2 text-xs text-gray-500">
                              No skinning weights found.
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-700">
                              {displayedBoneInfluenceRows
                                .slice(0, 120)
                                .map((row) => (
                                  <div
                                    key={row.boneName}
                                    className={`grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-xs ${
                                      row.boneName === selectedBoneName
                                        ? "bg-blue-900/30"
                                        : ""
                                    }`}
                                  >
                                    <span
                                      className="truncate"
                                      title={row.boneName}
                                    >
                                      {row.boneName}
                                    </span>
                                    <span className="text-gray-300">
                                      vtx {row.vertexCount}
                                    </span>
                                    <span className="text-gray-400">
                                      w {row.weightedSum.toFixed(1)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                    key={modelSessionId}
                    animations={animations}
                    animationMixer={animationMixer}
                    gameLabel={gameLabel}
                    modelSourceKind={modelSourceKind}
                    onAnimationsChange={handleAnimationsChange}
                    onBoneSelectionChange={handleBoneSelectionChange}
                    onAnimationEventsChange={handleAnimationEventsChange}
                    animationMetadata={animationMetadata}
                    boneTransform={boneTransform}
                    boneRotation={boneRotation}
                    boneScale={boneScale}
                    onGizmoModeChange={handleGizmoModeChange}
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
                              • Some BG3D models may not contain extractable
                              textures
                            </p>
                            <p>
                              • Textures may be embedded differently or
                              compressed
                            </p>
                            <p>
                              • Try a different model format if texture editing
                              is needed
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
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
                    showSkeleton={showSkeletonOverlay && hasAnimations}
                    logBonePositions={logBonePositions}
                    selectedBoneName={hasAnimations ? selectedBoneName : null}
                    onBoneTransformChange={handleBoneTransformChange}
                    onBoneRotationChange={handleBoneRotationChange}
                    onBoneScaleChange={handleBoneScaleChange}
                    gizmoMode={gizmoMode}
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
