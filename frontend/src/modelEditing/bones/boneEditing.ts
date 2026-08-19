import { Bone, Group, Skeleton, SkinnedMesh } from "three";
import { err, ok, type Result } from "neverthrow";
import type { SkinWeightsData } from "@/modelEditing/weights/weightTypes";

export interface BoneMutation {
  skinData: SkinWeightsData | null;
  parentName: string | null;
}

export function collectSceneBoneNames(scene: Group): string[] {
  const names = new Set<string>();
  scene.traverse((object) => {
    if (object instanceof Bone && object.name) names.add(object.name);
  });
  return [...names];
}

function findBone(scene: Group, name: string): Bone | null {
  let match: Bone | null = null;
  scene.traverse((object) => {
    if (object instanceof Bone && object.name === name) match = object;
  });
  return match;
}

function rebuildSkeletons(
  scene: Group,
  addedBone: Bone | null,
  removedBone: Bone | null,
): void {
  scene.traverse((object) => {
    if (!(object instanceof SkinnedMesh)) return;
    const retainedBones = object.skeleton.bones.filter(
      (bone) => bone !== removedBone,
    );
    const bones = addedBone ? [...retainedBones, addedBone] : retainedBones;
    const nextSkeleton = new Skeleton(bones);
    object.bind(nextSkeleton, object.bindMatrix);
  });
}

export function createBone(
  scene: Group,
  name: string,
  parentName: string | null,
  skinData: SkinWeightsData | null,
): Result<BoneMutation, string> {
  const trimmedName = name.trim();
  if (!trimmedName) return err("Bone name cannot be empty");
  if (collectSceneBoneNames(scene).includes(trimmedName)) {
    return err(`A bone named '${trimmedName}' already exists`);
  }

  const parent = parentName ? findBone(scene, parentName) : null;
  if (parentName && !parent) return err("The selected parent bone was not found");

  const bone = new Bone();
  bone.name = trimmedName;
  (parent ?? scene).add(bone);
  rebuildSkeletons(scene, bone, null);

  return ok({
    parentName,
    skinData: skinData
      ? { ...skinData, boneNames: [...skinData.boneNames, trimmedName] }
      : null,
  });
}

function removeBoneInfluences(
  data: SkinWeightsData,
  boneName: string,
  parentName: string | null,
): SkinWeightsData {
  return {
    boneNames: data.boneNames.filter((name) => name !== boneName),
    vertices: data.vertices.map((vertex) => ({
      ...vertex,
      influences: vertex.influences
        .map((influence) =>
          influence.boneName === boneName && parentName
            ? { ...influence, boneName: parentName }
            : influence,
        )
        .filter((influence) => influence.boneName !== boneName),
    })),
  };
}

export function removeBone(
  scene: Group,
  name: string,
  skinData: SkinWeightsData | null,
): Result<BoneMutation, string> {
  const bone = findBone(scene, name);
  if (!bone) return err("The selected bone was not found");
  const parentBone = bone.parent instanceof Bone ? bone.parent : null;
  const parentName = parentBone?.name || null;
  const nextParent = bone.parent ?? scene;
  for (const child of [...bone.children]) nextParent.add(child);
  bone.removeFromParent();
  rebuildSkeletons(scene, null, bone);

  return ok({
    parentName,
    skinData: skinData ? removeBoneInfluences(skinData, name, parentName) : null,
  });
}
