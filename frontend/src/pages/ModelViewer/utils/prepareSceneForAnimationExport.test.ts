import { describe, expect, it } from "vitest";
import {
  Bone,
  BoxGeometry,
  Group,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
} from "three";
import { prepareSceneForAnimationExport } from "./prepareSceneForAnimationExport";

describe("prepareSceneForAnimationExport", () => {
  it("clones the scene and resets skinned meshes to their bind pose", () => {
    const pelvis = new Bone();
    pelvis.name = "Pelvis";
    pelvis.position.set(0, -44.4, 8.4);

    const knee = new Bone();
    knee.name = "RightKnee";
    knee.position.set(12, -36, -9.6);
    pelvis.add(knee);

    const mesh = new SkinnedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial(),
    );
    mesh.add(pelvis);
    mesh.bind(new Skeleton([pelvis, knee]));

    const scene = new Group();
    scene.add(mesh);
    scene.updateMatrixWorld(true);

    pelvis.position.set(0, -34.9, 8.46);
    knee.position.set(12, -26.4, -8.4);
    scene.updateMatrixWorld(true);

    const exportScene = prepareSceneForAnimationExport(scene);

    const foundBones = new Map<string, Bone>();
    exportScene.traverse((object) => {
      if (object instanceof Bone) {
        foundBones.set(object.name, object);
      }
    });

    const clonedPelvis = foundBones.get("Pelvis");
    const clonedKnee = foundBones.get("RightKnee");

    expect(clonedPelvis).toBeDefined();
    expect(clonedKnee).toBeDefined();
    if (!clonedPelvis || !clonedKnee) return;
    expect(clonedPelvis.position.y).toBeCloseTo(-44.4, 5);
    expect(clonedPelvis.position.z).toBeCloseTo(8.4, 5);
    expect(clonedKnee.position.y).toBeCloseTo(-36, 5);
    expect(clonedKnee.position.z).toBeCloseTo(-9.6, 5);

    expect(pelvis.position.y).toBeCloseTo(-34.9, 5);
    expect(knee.position.y).toBeCloseTo(-26.4, 5);
  });
});
