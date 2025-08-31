import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";
import { ModelCanvasProps } from "@/components/model-viewer/types";
import { useModelHierarchy } from "@/components/model-viewer/useModelHierarchy";
import { useModelAnimations } from "@/components/model-viewer/useModelAnimations";
import { AnimationUpdater } from "@/components/model-viewer/AnimationUpdater";
import { gltf } from "gltf-validator";

export function ModelCanvas(props: ModelCanvasProps) {
  const { gltfUrl, setModelNodes, onSceneReady, onAnimationsReady } = props;

  // Validate gltfUrl before using it
  if (!gltfUrl || typeof gltfUrl !== "string") {
    console.error("Invalid gltfUrl provided to ModelCanvas:", gltfUrl);
    return <div>Error: Invalid model URL</div>;
  }

  // Always call useGLTF unconditionally
  const gltfResult = useGLTF(gltfUrl);
  console.log("gltfresult");
  console.log(gltfResult);
  // Extract model hierarchy
  useModelHierarchy(gltfResult, setModelNodes, onSceneReady);

  // Handle animations
  const { animationMixer } = useModelAnimations(gltfResult, onAnimationsReady);

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
        {gltfResult && <EnhancedModelMesh scene={gltfResult.scene} />}
        <AnimationUpdater animationMixer={animationMixer} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </>
  );
}
