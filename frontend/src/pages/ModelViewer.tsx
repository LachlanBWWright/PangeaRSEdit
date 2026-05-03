import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ModelCanvas } from "./ModelCanvas";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import {
  AnimationViewer,
  AnimationInfo,
  type AnimationEvent,
  type ModelSourceKind,
} from "@/components/AnimationViewer";
import {
  collectBoneInfluenceRowsFromSkinData,
  collectBoneInfluenceRows,
  pinSelectedBoneRow,
} from "@/components/AnimationViewer/rigToolsState";
import { ModelRigPanel } from "@/components/ModelRigPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Redo2, Undo2, Upload } from "lucide-react";
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
import { toast } from "sonner";
import { AnimationMixer, Group } from "three";
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
import { extractUvLayout } from "@/modelEditing/uv/extractUvLayout";
import { applyUvEditToScene } from "@/modelEditing/uv/applyUvEditToScene";
import { applyUvEditToBg3d } from "@/modelEditing/uv/applyUvEditToBg3d";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";
import { extractSkinWeights } from "@/modelEditing/weights/extractSkinWeights";
import { applyWeightEditToScene } from "@/modelEditing/weights/applyWeightEditToScene";
import { applyWeightBrushStroke } from "@/modelEditing/weights/weightBrushStroke";
import {
  defaultWeightBrushSettings,
  type SkinWeightsData,
  type WeightBrushSettings,
  type WeightVisualizationMode,
} from "@/modelEditing/weights/weightTypes";
import type { ViewerInteractionMode } from "@/components/model-viewer/types";

type ViewerHistoryAction =
  | {
      type: "uv";
      textureName: string;
      before: UvLayout;
      after: UvLayout;
    }
  | {
      type: "weights";
      before: SkinWeightsData;
      after: SkinWeightsData;
    }
  | {
      type: "bone-rename";
      beforeName: string;
      afterName: string;
    };

function renameAnimationBone(
  animation: AnimationInfo,
  currentName: string,
  nextName: string,
): AnimationInfo {
  const cloned = animation.clip.clone();
  cloned.tracks.forEach((track) => {
    if (track.name.startsWith(`${currentName}.`)) {
      track.name = `${nextName}.${track.name.slice(currentName.length + 1)}`;
    }
  });
  return {
    ...animation,
    clip: cloned,
  };
}

function renameModelNodeBone(
  node: ModelNode,
  currentName: string,
  nextName: string,
): ModelNode {
  return {
    ...node,
    name: node.name === currentName ? nextName : node.name,
    children: node.children?.map((child) =>
      renameModelNodeBone(child, currentName, nextName),
    ),
  };
}

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
  const [uvLayoutOverridesWithScene, setUvLayoutOverridesWithScene] = useState<{
    scene: Group;
    overrides: Map<string, UvLayout>;
  } | null>(null);
  const [skinDataWithScene, setSkinDataWithScene] = useState<{
    scene: Group;
    data: SkinWeightsData;
  } | null>(null);
  const [weightBrushSettings, setWeightBrushSettings] =
    useState<WeightBrushSettings>(defaultWeightBrushSettings);
  const [interactionMode, setInteractionMode] =
    useState<ViewerInteractionMode>("navigate");
  const [weightVisualizationMode, setWeightVisualizationMode] =
    useState<WeightVisualizationMode>("none");
  const [viewerHistory, setViewerHistory] = useState<{
    past: ViewerHistoryAction[];
    future: ViewerHistoryAction[];
  }>({
    past: [],
    future: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerHistoryRef = useRef(viewerHistory);
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
        setViewerHistory({ past: [], future: [] });
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
          `Failed to export animation edits to GLB: ${exportedBufferResult.error}`,
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
          `Failed to update animation event metadata: ${bufferWithEventsResult.error}`,
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
          `Failed to normalize animation-edited GLB: ${normalizedBufferResult.error}`,
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

  // Derive UV layouts from scene, merging any user-applied overrides.
  // Overrides are scoped to the current scene so they reset on model reload.
  const uvLayouts = useMemo<Map<string, UvLayout>>(() => {
    if (!scene || textures.length === 0) return new Map();
    const base = new Map<string, UvLayout>();
    for (const texture of textures) {
      const result = extractUvLayout(scene, texture);
      if (result.isOk()) {
        base.set(texture.name, result.value);
      }
    }
    const overrides =
      uvLayoutOverridesWithScene?.scene === scene
        ? uvLayoutOverridesWithScene.overrides
        : null;
    if (overrides) {
      for (const [k, v] of overrides) {
        base.set(k, v);
      }
    }
    return base;
  }, [scene, textures, uvLayoutOverridesWithScene]);

  // Derive skin data from scene, applying any user repair overrides.
  // Override is scoped to the current scene so it resets on model reload.
  const skinData = useMemo<SkinWeightsData | null>(() => {
    if (!scene) return null;
    if (skinDataWithScene?.scene === scene) return skinDataWithScene.data;
    const result = extractSkinWeights(scene);
    return result.isOk() ? result.value : null;
  }, [scene, skinDataWithScene]);

  useEffect(() => {
    viewerHistoryRef.current = viewerHistory;
  }, [viewerHistory]);

  const pushViewerHistory = useCallback((action: ViewerHistoryAction) => {
    setViewerHistory((current) => ({
      past: [...current.past, action],
      future: [],
    }));
  }, []);

  const applyCommittedUvLayout = useCallback(
    (textureName: string, updatedLayout: UvLayout) => {
      if (!scene) {
        return false;
      }

      applyUvEditToScene(scene, updatedLayout);
      setBg3dParsed((currentParsed) => {
        if (!currentParsed) {
          return currentParsed;
        }

        const result = applyUvEditToBg3d(currentParsed, updatedLayout);
        return result.isOk() ? result.value : currentParsed;
      });
      setUvLayoutOverridesWithScene((prev) => {
        const existing =
          prev?.scene === scene
            ? new Map(prev.overrides)
            : new Map<string, UvLayout>();
        existing.set(textureName, updatedLayout);
        return { scene, overrides: existing };
      });

      return true;
    },
    [scene],
  );

  const applyBoneRenameChange = useCallback(
    (currentName: string, nextName: string) => {
      if (!scene || currentName === nextName) {
        return false;
      }

      let renamed = false;
      scene.traverse((object) => {
        if (object.name === currentName) {
          object.name = nextName;
          renamed = true;
        }
      });

      if (!renamed) {
        return false;
      }

      setAnimations((currentAnimations) =>
        currentAnimations.map((animation) =>
          renameAnimationBone(animation, currentName, nextName),
        ),
      );
      latestAnimationsRef.current = latestAnimationsRef.current.map(
        (animation) => renameAnimationBone(animation, currentName, nextName),
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
              bone.name === currentName ? { ...bone, name: nextName } : bone,
            ),
          },
        };
      });
      setModelNodes((currentNodes) =>
        currentNodes.map((node) =>
          renameModelNodeBone(node, currentName, nextName),
        ),
      );
      setSelectedBoneName(nextName);
      setBoneRenameInput(nextName);
      setWeightBrushSettings((current) =>
        current.targetBone === currentName
          ? { ...current, targetBone: nextName }
          : current,
      );

      return true;
    },
    [scene],
  );

  const applyViewerHistoryAction = useCallback(
    (action: ViewerHistoryAction, direction: "undo" | "redo") => {
      if (action.type === "uv") {
        return applyCommittedUvLayout(
          action.textureName,
          direction === "undo" ? action.before : action.after,
        );
      }

      if (action.type === "weights") {
        if (!scene) {
          return false;
        }

        const nextData = direction === "undo" ? action.before : action.after;
        applyWeightEditToScene(scene, nextData);
        setSkinDataWithScene({ scene, data: nextData });
        return true;
      }

      return applyBoneRenameChange(
        direction === "undo" ? action.afterName : action.beforeName,
        direction === "undo" ? action.beforeName : action.afterName,
      );
    },
    [applyBoneRenameChange, applyCommittedUvLayout, scene],
  );

  const handleUndoViewerChange = useCallback(() => {
    const action = viewerHistoryRef.current.past.at(-1);
    if (!action) {
      return;
    }

    if (!applyViewerHistoryAction(action, "undo")) {
      toast.error("Could not undo the last model viewer change");
      return;
    }

    setViewerHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [action, ...current.future],
    }));
  }, [applyViewerHistoryAction]);

  const handleRedoViewerChange = useCallback(() => {
    const action = viewerHistoryRef.current.future[0];
    if (!action) {
      return;
    }

    if (!applyViewerHistoryAction(action, "redo")) {
      toast.error("Could not redo the last model viewer change");
      return;
    }

    setViewerHistory((current) => ({
      past: [...current.past, action],
      future: current.future.slice(1),
    }));
  }, [applyViewerHistoryAction]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed || event.key.toLowerCase() !== "z") {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        handleRedoViewerChange();
        return;
      }

      handleUndoViewerChange();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedoViewerChange, handleUndoViewerChange]);

  const handleApplyUvEdit = useCallback(
    (textureName: string, updatedLayout: UvLayout) => {
      const previousLayout = uvLayouts.get(textureName);
      if (!previousLayout) {
        return;
      }

      if (applyCommittedUvLayout(textureName, updatedLayout)) {
        pushViewerHistory({
          type: "uv",
          textureName,
          before: previousLayout,
          after: updatedLayout,
        });
      }
    },
    [applyCommittedUvLayout, pushViewerHistory, uvLayouts],
  );

  const handlePreviewUvEdit = useCallback(
    (_textureName: string, updatedLayout: UvLayout) => {
      if (!scene) {
        return;
      }

      applyUvEditToScene(scene, updatedLayout);
    },
    [scene],
  );

  const handleResetUvPreview = useCallback(
    (textureName: string) => {
      if (!scene) {
        return;
      }

      const committedLayout = uvLayouts.get(textureName);
      if (!committedLayout) {
        return;
      }

      applyUvEditToScene(scene, committedLayout);
    },
    [scene, uvLayouts],
  );

  const handleRepairWeights = useCallback(
    (repaired: SkinWeightsData) => {
      if (!scene || !skinData) return;
      applyWeightEditToScene(scene, repaired);
      setSkinDataWithScene({ scene, data: repaired });
      pushViewerHistory({
        type: "weights",
        before: skinData,
        after: repaired,
      });
    },
    [pushViewerHistory, scene, skinData],
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
      setInteractionMode("bone-edit");
    },
    [],
  );

  const handleBoneSelectionChange = useCallback((boneName: string | null) => {
    setSelectedBoneName(boneName);
    setBoneRenameInput(boneName ?? "");
    if (boneName) {
      setWeightBrushSettings((current) => ({
        ...current,
        targetBone: boneName,
      }));
    }
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

    if (!applyBoneRenameChange(selectedBoneName, nextName)) {
      toast.error("Selected bone was not found in the loaded model");
      return;
    }
    pushViewerHistory({
      type: "bone-rename",
      beforeName: selectedBoneName,
      afterName: nextName,
    });
    toast.success(`Renamed bone '${selectedBoneName}' to '${nextName}'`);
  }, [
    applyBoneRenameChange,
    boneRenameInput,
    pushViewerHistory,
    scene,
    selectedBoneName,
  ]);

  const boneInfluenceRows = useMemo(
    () =>
      skinData
        ? collectBoneInfluenceRowsFromSkinData(skinData)
        : collectBoneInfluenceRows(scene),
    [scene, skinData],
  );

  const displayedBoneInfluenceRows = useMemo(() => {
    if (!selectedBoneName) {
      return boneInfluenceRows;
    }
    return pinSelectedBoneRow(boneInfluenceRows, selectedBoneName);
  }, [boneInfluenceRows, selectedBoneName]);

  const handleWeightBrushSettingsChange = useCallback(
    (settings: WeightBrushSettings) => {
      setWeightBrushSettings(settings);
      if (settings.targetBone) {
        handleBoneSelectionChange(settings.targetBone);
      }
    },
    [handleBoneSelectionChange],
  );

  const handleWeightBrushStroke = useCallback(
    (
      hit: import("@/modelEditing/weights/weightBrushStroke").WeightBrushHit,
    ) => {
      if (
        !scene ||
        !skinData ||
        !weightBrushSettings.targetBone ||
        interactionMode !== "paint-weights"
      ) {
        return;
      }

      const nextData = applyWeightBrushStroke(
        scene,
        skinData,
        weightBrushSettings,
        hit,
      );
      if (nextData === skinData) {
        return;
      }

      applyWeightEditToScene(scene, nextData);
      setSkinDataWithScene({ scene, data: nextData });
      pushViewerHistory({
        type: "weights",
        before: skinData,
        after: nextData,
      });
    },
    [interactionMode, pushViewerHistory, scene, skinData, weightBrushSettings],
  );

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
            `Failed to update animation events: ${workerResult.error}`,
          );
          return;
        }

        const responseResult = getParsedToGlbWorkerResponse(
          workerResult.value,
          "update animation events",
        );
        if (responseResult.isErr()) {
          toast.error(responseResult.error);
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
          `Failed to update animation events: ${updatedBufferResult.error}`,
        );
        return;
      }
      if (updatedBufferResult.value.isErr()) {
        toast.error(
          `Failed to update animation events: ${updatedBufferResult.value.error}`,
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
      toast.error(result.error);
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
      toast.error(result.error);
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
    setInteractionMode("navigate");
    setWeightBrushSettings(defaultWeightBrushSettings);
    setWeightVisualizationMode("none");
    setViewerHistory({ past: [], future: [] });
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
                {gltfUrl && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        Undo / Redo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={handleUndoViewerChange}
                          disabled={viewerHistory.past.length === 0}
                        >
                          <Undo2 className="mr-2 h-4 w-4" />
                          Undo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={handleRedoViewerChange}
                          disabled={viewerHistory.future.length === 0}
                        >
                          <Redo2 className="mr-2 h-4 w-4" />
                          Redo
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Tracks committed UV edits, weight changes, and bone
                        renames for the current model session. Shortcuts:
                        Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z.
                      </p>
                    </CardContent>
                  </Card>
                )}

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
                    hasSkeleton={hasAnimations || skinData !== null}
                    canLogBonePositions={hasAnimations}
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
                    boneRenameInput={boneRenameInput}
                    boneInfluenceRows={displayedBoneInfluenceRows}
                    skinData={skinData}
                    onBoneRenameInputChange={setBoneRenameInput}
                    onRenameSelectedBone={handleRenameSelectedBone}
                    onRepairWeights={handleRepairWeights}
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
                          uvLayouts={uvLayouts}
                          onPreviewUvEdit={handlePreviewUvEdit}
                          onResetUvPreview={handleResetUvPreview}
                          onApplyUvEdit={handleApplyUvEdit}
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

                {gltfUrl && skinData && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        Rig & Weight Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ModelRigPanel
                        selectedBoneName={selectedBoneName}
                        boneRenameInput={boneRenameInput}
                        boneInfluenceRows={displayedBoneInfluenceRows}
                        skinData={skinData}
                        interactionMode={interactionMode}
                        brushSettings={weightBrushSettings}
                        visualizationMode={weightVisualizationMode}
                        onSelectBone={(boneName) =>
                          handleBoneSelectionChange(boneName)
                        }
                        onInteractionModeChange={setInteractionMode}
                        onBoneRenameInputChange={setBoneRenameInput}
                        onRenameSelectedBone={handleRenameSelectedBone}
                        onBrushSettingsChange={handleWeightBrushSettingsChange}
                        onVisualizationModeChange={setWeightVisualizationMode}
                        onRepairWeights={handleRepairWeights}
                      />
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
                    showSkeleton={
                      showSkeletonOverlay &&
                      (hasAnimations || skinData !== null)
                    }
                    logBonePositions={logBonePositions}
                    selectedBoneName={selectedBoneName}
                    onBoneTransformChange={handleBoneTransformChange}
                    onBoneRotationChange={handleBoneRotationChange}
                    onBoneScaleChange={handleBoneScaleChange}
                    gizmoMode={gizmoMode}
                    interactionMode={interactionMode}
                    skinData={skinData}
                    weightBrushSettings={weightBrushSettings}
                    weightVisualizationMode={weightVisualizationMode}
                    onWeightBrushStroke={handleWeightBrushStroke}
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
    </>
  );
}
