import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";
import { ModelCanvasProps } from "@/components/model-viewer/types";
import { useModelHierarchy } from "@/components/model-viewer/useModelHierarchy";
import { useModelAnimations } from "@/components/model-viewer/useModelAnimations";
import { AnimationUpdater } from "@/components/model-viewer/AnimationUpdater";
import { Game } from "@/data/globals/globals";
import { Box3, Vector3, Object3D } from "three";

export function ModelCanvas(props: ModelCanvasProps) {
  // Memoize camera config to prevent Canvas re-initialization on every render
  const cameraConfig = useMemo(() => {
    let position: [number, number, number] = [0, 0, 100];

    // Raised camera for Bugdom 1 (keep more overhead view)
    if (props.gameType === Game.BUGDOM) {
      // Double the previous vertical offset for a higher overhead view
      position = [60, 60, 0];
    }

    // Zoom in for Bugdom 2 to show more detail
    else if (props.gameType === Game.BUGDOM_2) {
      position = [0, 0, 60];
    }

    // Keep Billy Frontier slightly zoomed in like before
    else if (props.gameType === Game.BILLY_FRONTIER) {
      position = [0, 0, 80];
    }

    // Zoom out for Cro-Mag Rally for a wider view
    else if (props.gameType === Game.CRO_MAG) {
      position = [0, 0, 160];
    }

    return {
      position,
      fov: 110,
      near: 0.1,
      far: 10000,
    };
  }, [props.gameType]);
  const {
    gltfUrl,
    setModelNodes,
    onSceneReady,
    onAnimationsReady,
    onBoneTransformChange,
    wireframeMode,
    showSkeleton,
    logBonePositions,
    selectedBoneName,
  } = props;

  // Always call hooks unconditionally (must be called in every render in same order)
  const gltfResult = useGLTF(gltfUrl || "");
  console.log("gltfresult");
  console.log(gltfResult);

  // Extract model hierarchy
  useModelHierarchy(gltfResult, setModelNodes, onSceneReady);

  // Handle animations
  const { animationMixer } = useModelAnimations(gltfResult, onAnimationsReady);

  const [isTransforming, setIsTransforming] = useState(false);
  const scene = gltfResult?.scene ?? null;
  const selectedBoneObject = useMemo<Object3D | null>(() => {
    if (!scene || !selectedBoneName) {
      return null;
    }
    let found: Object3D | null = null;
    scene.traverse((object) => {
      if (object.name === selectedBoneName) {
        found = object;
      }
    });
    return found;
  }, [scene, selectedBoneName]);
  const lastBoneTransformRef = useRef<[number, number, number] | null>(null);
  const BONE_TRANSFORM_THRESHOLD = 0.0005; // Small threshold to avoid noisy gizmo updates.

  const handleBoneTransformChange = useCallback(() => {
    if (!selectedBoneObject || !onBoneTransformChange) {
      return;
    }
    const { x, y, z } = selectedBoneObject.position;
    const previous = lastBoneTransformRef.current;
    if (
      previous &&
      Math.abs(previous[0] - x) < BONE_TRANSFORM_THRESHOLD &&
      Math.abs(previous[1] - y) < BONE_TRANSFORM_THRESHOLD &&
      Math.abs(previous[2] - z) < BONE_TRANSFORM_THRESHOLD
    ) {
      return;
    }
    lastBoneTransformRef.current = [x, y, z];
    onBoneTransformChange([x, y, z]);
  }, [selectedBoneObject, onBoneTransformChange]);

  useEffect(() => {
    lastBoneTransformRef.current = null;
    if (selectedBoneObject) {
      handleBoneTransformChange();
    }
  }, [selectedBoneObject, handleBoneTransformChange]);

  // Shift Bugdom 1 model down by half its bounding box height so it appears grounded
  const modelPosition = useMemo((): [number, number, number] => {
    if (props.gameType === Game.BUGDOM && gltfResult?.scene) {
      const box = new Box3().setFromObject(gltfResult.scene);
      const size = new Vector3();
      box.getSize(size);
      return [0, -size.y / 2, 0];
    }
    return [0, 0, 0];
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
        <ambientLight intensity={0.8} color={"#ffffff"} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={1} />
        {gltfResult?.scene && (
          <EnhancedModelMesh
            key={gltfResult.scene.uuid}
            scene={gltfResult.scene}
            wireframeMode={wireframeMode}
            showSkeleton={showSkeleton}
            selectedBoneName={selectedBoneName}
            position={modelPosition}
          />
        )}
        {selectedBoneObject && (
          <TransformControls
            object={selectedBoneObject}
            mode="translate"
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
          enableRotate={!isTransforming}
          autoRotate={!isTransforming}
          autoRotateSpeed={2}
        />
      </Canvas>
    </>
  );
}
