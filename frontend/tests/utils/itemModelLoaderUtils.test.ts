import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshBasicMaterial, BoxGeometry } from "three";
import { extractSubgroupFromScene } from "@/editor/threejs/hooks/itemModelLoaderUtils";

function createMesh(name: string): Mesh {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  mesh.name = name;
  return mesh;
}

describe("itemModelLoaderUtils", () => {
  it("extracts non-skeletal subgroup roots from Group_* containers", () => {
    const scene = new Group();
    const groupRoot = new Group();
    groupRoot.name = "Group_0000";
    const subgroup0 = new Group();
    subgroup0.name = "Subgroup_0";
    subgroup0.add(createMesh("Mesh_0000"));
    const subgroup1 = new Group();
    subgroup1.name = "Subgroup_1";
    subgroup1.add(createMesh("Mesh_0001"));
    groupRoot.add(subgroup0, subgroup1);
    scene.add(groupRoot);

    const extracted = extractSubgroupFromScene(scene, 1);

    expect(extracted).not.toBeNull();
    expect(extracted?.children.map((child) => child.name)).toEqual(["Subgroup_1"]);
  });

  it("extracts skeletal meshes without indexing into the Skeleton root", () => {
    const scene = new Group();
    const skeletonRoot = new Group();
    skeletonRoot.name = "Skeleton";
    const armature = new Group();
    armature.name = "Armature";
    skeletonRoot.add(armature);
    scene.add(skeletonRoot);
    scene.add(createMesh("Mesh_0000"));
    scene.add(createMesh("Mesh_0001"));

    const extracted = extractSubgroupFromScene(scene, 1);

    expect(extracted).not.toBeNull();
    expect(extracted?.children.map((child) => child.name)).toEqual([
      "Skeleton",
      "Mesh_0001",
    ]);
  });

  it("extracts skeletal meshes when the meshes live under the Skeleton wrapper", () => {
    const scene = new Group();
    const skeletonRoot = new Group();
    skeletonRoot.name = "Skeleton";
    const armature = new Group();
    armature.name = "Armature";
    skeletonRoot.add(armature);
    skeletonRoot.add(createMesh("Mesh_0000"));
    skeletonRoot.add(createMesh("Mesh_0001"));
    scene.add(skeletonRoot);

    const extracted = extractSubgroupFromScene(scene, 0);

    expect(extracted).not.toBeNull();
    expect(extracted?.children.map((child) => child.name)).toEqual(["Skeleton"]);
    expect(extracted?.children[0]?.children.map((child) => child.name)).toEqual([
      "Armature",
      "Mesh_0000",
    ]);
  });
});
