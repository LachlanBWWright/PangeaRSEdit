import { describe, expect, it } from "vitest";
import {
  Bone,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
} from "three";
import { prepareSceneForAnimationExport } from "@/pages/ModelViewer/utils/prepareSceneForAnimationExport";

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

  it("resets wireframe to false on all materials in the exported scene", () => {
    const material = new MeshStandardMaterial();
    material.wireframe = true;

    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    const scene = new Group();
    scene.add(mesh);

    const exportScene = prepareSceneForAnimationExport(scene);

    let foundMesh = false;
    exportScene.traverse((object) => {
      if (object instanceof Mesh && object.material) {
        const mat = Array.isArray(object.material)
          ? object.material[0]
          : object.material;
        expect(mat.wireframe).toBe(false);
        foundMesh = true;
      }
    });
    expect(foundMesh).toBe(true);

    // Original scene materials should still be wireframed
    expect(material.wireframe).toBe(true);
  });

  it("resets wireframe on multi-material meshes", () => {
    const mat1 = new MeshStandardMaterial();
    mat1.wireframe = true;
    const mat2 = new MeshBasicMaterial();
    mat2.wireframe = true;

    const mesh = new Mesh(new BoxGeometry(1, 1, 1), [mat1, mat2]);
    const scene = new Group();
    scene.add(mesh);

    const exportScene = prepareSceneForAnimationExport(scene);

    exportScene.traverse((object) => {
      if (object instanceof Mesh && Array.isArray(object.material)) {
        for (const mat of object.material) {
          expect(mat.wireframe).toBe(false);
        }
      }
    });
  });

  it("removes skeleton helper meshes (bone joint spheres) from exported scene", () => {
    const pelvis = new Bone();
    pelvis.name = "Pelvis";
    pelvis.position.set(0, 5, 0);

    const knee = new Bone();
    knee.name = "Knee";
    knee.position.set(0, -10, 0);
    pelvis.add(knee);

    const skinnedMesh = new SkinnedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial(),
    );
    skinnedMesh.add(pelvis);
    skinnedMesh.bind(new Skeleton([pelvis, knee]));

    // Simulate EnhancedModelMesh skeleton visualization: add sphere to bone
    const boneJointSphere = new Mesh(
      new SphereGeometry(0.5, 8, 8),
      new MeshBasicMaterial({ color: 0x00ff00 }),
    );
    boneJointSphere.userData.boneName = "Pelvis";
    pelvis.add(boneJointSphere);

    // Simulate connection tube
    const tube = new Mesh(
      new CylinderGeometry(0.08, 0.08, 5, 4),
      new MeshBasicMaterial({ color: 0xffff00 }),
    );
    pelvis.add(tube);

    const scene = new Group();
    scene.add(skinnedMesh);
    scene.updateMatrixWorld(true);

    const exportScene = prepareSceneForAnimationExport(scene);

    // Verify helper meshes were removed
    let sphereCount = 0;
    let tubeCount = 0;
    exportScene.traverse((object) => {
      if (object instanceof Mesh && !(object instanceof SkinnedMesh)) {
        if (object.userData.boneName) {
          sphereCount++;
        }
        if (object.parent && object.parent.type === "Bone") {
          tubeCount++;
        }
      }
    });

    expect(sphereCount).toBe(0);
    expect(tubeCount).toBe(0);
  });
});
