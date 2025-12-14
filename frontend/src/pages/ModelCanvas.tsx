import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";
import { ModelCanvasProps } from "@/components/model-viewer/types";
import { useModelHierarchy } from "@/components/model-viewer/useModelHierarchy";
import { useModelAnimations } from "@/components/model-viewer/useModelAnimations";
import { AnimationUpdater } from "@/components/model-viewer/AnimationUpdater";

export function ModelCanvas(props: ModelCanvasProps) {
  const {
    gltfUrl,
    setModelNodes,
    onSceneReady,
    onAnimationsReady,
    wireframeMode,
    showSkeleton,
    logBonePositions,
  } = props;

  // Always call hooks unconditionally (must be called in every render in same order)
  // Use fallback empty string if gltfUrl is falsy
  const gltfResult = useGLTF(gltfUrl || "");
  console.log("gltfresult");
  console.log(gltfResult);

  // Extract model hierarchy (must be called in every render)
  useModelHierarchy(gltfResult, setModelNodes, onSceneReady);

  // Handle animations (must be called in every render)
  const { animationMixer } = useModelAnimations(gltfResult, onAnimationsReady);

  // Validate gltfUrl for rendering (after hooks)
  const isValidUrl = gltfUrl && typeof gltfUrl === "string";

  if (!isValidUrl) {
    return <div className="flex items-center justify-center h-full text-gray-400">Error: Invalid model URL</div>;
  }

  return (
    <>
      {/* ModelHierarchy is now rendered in the sidebar by ModelViewer */}
      <Canvas
        camera={{
          position: [0, 0, 50],
          fov: 110,
          near: 0.1,
          far: 10000,
        }}
      >
        <ambientLight intensity={1} color={"#ff0000"} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={1} />
        {gltfResult?.scene && (
          <EnhancedModelMesh
            scene={gltfResult.scene}
            wireframeMode={wireframeMode}
            showSkeleton={showSkeleton}
          />
        )}
        <AnimationUpdater
          animationMixer={animationMixer}
          logBonePositions={logBonePositions}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </>
  );
}
