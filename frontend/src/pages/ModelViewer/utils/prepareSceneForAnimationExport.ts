import { Material, Mesh, Object3D, SkinnedMesh } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasWireframe(mat: Material): mat is Material & { wireframe: boolean } {
  return "wireframe" in mat && typeof mat.wireframe === "boolean";
}

export function prepareSceneForAnimationExport(scene: Object3D): Object3D {
  const exportScene = clone(scene);

  // Collect skeleton helper meshes added by EnhancedModelMesh (bone spheres/tubes)
  // so they don't contaminate the export. These are identified by the
  // `boneName` userData set by the skeleton visualizer.
  const toRemove: Object3D[] = [];

  exportScene.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      object.pose();
    }

    // Deep-clone materials so resetting wireframe does not mutate
    // the live viewport scene, then reset wireframe to false.
    if (object instanceof Mesh && object.material) {
      if (Array.isArray(object.material)) {
        object.material = object.material.map((mat) => {
          const clonedMat = mat.clone();
          if (hasWireframe(clonedMat)) {
            clonedMat.wireframe = false;
          }
          return clonedMat;
        });
      } else {
        const clonedMat = object.material.clone();
        if (hasWireframe(clonedMat)) {
          clonedMat.wireframe = false;
        }
        object.material = clonedMat;
      }
    }

    // Mark skeleton helper meshes (bone joint spheres and connection
    // tubes) for removal. EnhancedModelMesh tags joint spheres with
    // `userData.boneName`.
    if (
      object instanceof Mesh &&
      isRecord(object.userData) &&
      typeof object.userData["boneName"] === "string"
    ) {
      toRemove.push(object);
    }
  });

  // Also remove un-tagged connection tube meshes that were added as
  // direct bone children by the skeleton helper.  These don't carry
  // `boneName` userData but are recognisable as non-skinned Mesh
  // children of Bone objects.
  exportScene.traverse((object) => {
    if (
      object instanceof Mesh &&
      !(object instanceof SkinnedMesh) &&
      object.parent &&
      object.parent.type === "Bone" &&
      !toRemove.includes(object)
    ) {
      toRemove.push(object);
    }
  });

  for (const obj of toRemove) {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  exportScene.updateMatrixWorld(true);
  return exportScene;
}
