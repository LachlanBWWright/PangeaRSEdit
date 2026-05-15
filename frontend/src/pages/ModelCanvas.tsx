import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";
import { ModelCanvasProps } from "@/components/model-viewer/types";
import { useModelHierarchy } from "@/components/model-viewer/useModelHierarchy";
import { useModelAnimations } from "@/components/model-viewer/useModelAnimations";
import { AnimationUpdater } from "@/components/model-viewer/AnimationUpdater";
import { Object3D } from "three";
import {
  buildModelCanvasCameraConfig,
  findSceneObjectByName,
  getModelPosition,
  isWithinThreshold,
} from "@/pages/modelCanvasState";

export function ModelCanvas(props: ModelCanvasProps) {
  const cameraConfig = buildModelCanvasCameraConfig(props.gameType);
  const {
    gltfUrl,
    setModelNodes,
    onSceneReady,
    onAnimationsReady,
    onBoneTransformChange,
    onBoneRotationChange,
    onBoneScaleChange,
    wireframeMode,
    showSkeleton,
    logBonePositions,
    selectedBoneName,
    gizmoMode = "translate",
    interactionMode = "navigate",
    previewLighting = false,
    autoRotate = false,
    autoRotateSpeed = 2,
    skinData,
    weightBrushSettings,
    weightVisualizationMode,
    onWeightBrushStroke,
    sceneUpdateRevision,
  } = props;

  // Always call hooks unconditionally (must be called in every render in same order)
  const gltfResult = useGLTF(gltfUrl || "");

  // Extract model hierarchy
  useModelHierarchy(gltfResult, setModelNodes, onSceneReady);

  // Handle animations
  const { animationMixer } = useModelAnimations(gltfResult, onAnimationsReady);

  const [isTransforming, setIsTransforming] = useState(false);
  const scene = gltfResult?.scene ?? null;
  const selectedBoneObject = useMemo<Object3D | null>(() => {
    return findSceneObjectByName(scene, selectedBoneName ?? undefined);
  }, [scene, selectedBoneName]);
  const lastBoneTransformRef = useRef<[number, number, number] | null>(null);
  const lastBoneRotationRef = useRef<[number, number, number, number] | null>(
    null,
  );
  const lastBoneScaleRef = useRef<[number, number, number] | null>(null);
  const BONE_TRANSFORM_THRESHOLD = 0.0005; // Small threshold to avoid noisy gizmo updates.

  const handleBoneTransformChange = useCallback(() => {
    if (!selectedBoneObject) {
      return;
    }

    if (gizmoMode === "translate" && onBoneTransformChange) {
      const { x, y, z } = selectedBoneObject.position;
      const previous = lastBoneTransformRef.current;
      const currentPosition: [number, number, number] = [x, y, z];
      if (
        isWithinThreshold(previous, currentPosition, BONE_TRANSFORM_THRESHOLD)
      ) {
        return;
      }
      lastBoneTransformRef.current = [...currentPosition];
      onBoneTransformChange([...currentPosition]);
    } else if (gizmoMode === "rotate" && onBoneRotationChange) {
      const q = selectedBoneObject.quaternion;
      const previous = lastBoneRotationRef.current;
      const currentRotation: [number, number, number, number] = [
        q.x,
        q.y,
        q.z,
        q.w,
      ];
      if (
        isWithinThreshold(previous, currentRotation, BONE_TRANSFORM_THRESHOLD)
      ) {
        return;
      }
      lastBoneRotationRef.current = [...currentRotation];
      onBoneRotationChange([...currentRotation]);
    } else if (gizmoMode === "scale" && onBoneScaleChange) {
      const { x, y, z } = selectedBoneObject.scale;
      const previous = lastBoneScaleRef.current;
      const currentScale: [number, number, number] = [x, y, z];
      if (isWithinThreshold(previous, currentScale, BONE_TRANSFORM_THRESHOLD)) {
        return;
      }
      lastBoneScaleRef.current = [...currentScale];
      onBoneScaleChange([...currentScale]);
    }
  }, [
    selectedBoneObject,
    onBoneTransformChange,
    onBoneRotationChange,
    onBoneScaleChange,
    gizmoMode,
  ]);

  useEffect(() => {
    lastBoneTransformRef.current = null;
    lastBoneRotationRef.current = null;
    lastBoneScaleRef.current = null;
    if (selectedBoneObject) {
      handleBoneTransformChange();
    }
  }, [selectedBoneObject, handleBoneTransformChange]);

  const modelPosition = useMemo((): [number, number, number] => {
    return getModelPosition(props.gameType, gltfResult?.scene ?? null);
  }, [gltfResult, props.gameType]);

  // Validate gltfUrl for rendering (after hooks)
  const isValidUrl = gltfUrl && typeof gltfUrl === "string";

  if (!isValidUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Error: Invalid model URL
      </div>
    );
  }

  return (
    <>
      {/* ModelHierarchy is now rendered in the sidebar by ModelViewer */}
      <Canvas
        camera={cameraConfig}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {previewLighting ? (
          <ambientLight intensity={1.25} color={"#ffffff"} />
        ) : (
          <>
            <ambientLight intensity={0.5} color={"#ffffff"} />
            <directionalLight position={[1, 2, 1]} intensity={1} />
          </>
        )}
        {gltfResult?.scene && (
          <EnhancedModelMesh
            key={gltfResult.scene.uuid}
            scene={gltfResult.scene}
            wireframeMode={wireframeMode}
            showSkeleton={showSkeleton}
            selectedBoneName={selectedBoneName}
            previewLighting={previewLighting}
            skinData={skinData}
            weightBrushSettings={weightBrushSettings}
            weightVisualizationMode={weightVisualizationMode}
            interactionMode={interactionMode}
            onWeightBrushStroke={onWeightBrushStroke}
            sceneUpdateRevision={sceneUpdateRevision}
            position={modelPosition}
          />
        )}
        {selectedBoneObject && interactionMode === "bone-edit" && (
          <TransformControls
            object={selectedBoneObject}
            mode={gizmoMode}
            size={0.7}
            onObjectChange={handleBoneTransformChange}
            onMouseDown={() => setIsTransforming(true)}
            onMouseUp={() => setIsTransforming(false)}
          />
        )}
        <AnimationUpdater
          animationMixer={animationMixer}
          logBonePositions={logBonePositions}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={!isTransforming}
          enableRotate={interactionMode === "navigate" && !isTransforming}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      </Canvas>
    </>
  );
}
