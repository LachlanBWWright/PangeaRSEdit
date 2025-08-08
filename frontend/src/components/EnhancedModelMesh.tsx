import * as THREE from "three";

interface EnhancedModelMeshProps {
  scene: THREE.Group;
}

export function EnhancedModelMesh({ scene }: EnhancedModelMeshProps) {
  if (!scene) {
    console.warn("No scene available");
    return null;
  }
  return (
    <>
      {scene.children.map((child, index) => (
        <primitive key={index} object={child} />
      ))}
    </>
  );
}
