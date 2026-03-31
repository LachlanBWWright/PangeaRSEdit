import { Object3D, SkinnedMesh } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export function prepareSceneForAnimationExport(scene: Object3D): Object3D {
  const exportScene = clone(scene);
  exportScene.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      object.pose();
    }
  });
  exportScene.updateMatrixWorld(true);
  return exportScene;
}
