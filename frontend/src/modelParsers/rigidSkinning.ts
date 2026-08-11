import type { Accessor } from "@gltf-transform/core";

export interface RigidInfluence {
  readonly jointIndex: number;
  readonly weight: number;
  readonly discardedWeight: number;
  readonly positiveInfluenceCount: number;
}

export function getRigidInfluence(
  joints: Accessor,
  weights: Accessor,
  vertexIndex: number,
  jointCount: number,
): RigidInfluence | undefined {
  if (joints.getElementSize() < 1 || weights.getElementSize() < 1) {
    return undefined;
  }

  const jointValues = joints.getElement(vertexIndex, []);
  const weightValues = weights.getElement(vertexIndex, []);
  const influenceCount = Math.min(jointValues.length, weightValues.length);
  const weightByJoint = new Map<number, number>();
  let bestJointIndex = -1;
  let bestWeight = 0;
  let totalWeight = 0;

  for (let index = 0; index < influenceCount; index++) {
    const jointIndex = jointValues[index];
    const weight = weightValues[index];
    if (
      jointIndex === undefined ||
      weight === undefined ||
      !Number.isInteger(jointIndex) ||
      jointIndex < 0 ||
      jointIndex >= jointCount ||
      weight <= 0
    ) {
      continue;
    }

    totalWeight += weight;
    weightByJoint.set(jointIndex, (weightByJoint.get(jointIndex) ?? 0) + weight);
  }

  weightByJoint.forEach((weight, jointIndex) => {
    if (
      weight > bestWeight ||
      (weight === bestWeight && (bestJointIndex < 0 || jointIndex < bestJointIndex))
    ) {
      bestJointIndex = jointIndex;
      bestWeight = weight;
    }
  });

  if (bestJointIndex < 0) {
    return undefined;
  }

  return {
    jointIndex: bestJointIndex,
    weight: bestWeight,
    discardedWeight: Math.max(0, totalWeight - bestWeight),
    positiveInfluenceCount: weightByJoint.size,
  };
}

export function shouldReplaceRigidInfluence(
  current: RigidInfluence | undefined,
  candidate: RigidInfluence,
): boolean {
  return (
    current === undefined ||
    candidate.weight > current.weight ||
    (candidate.weight === current.weight && candidate.jointIndex < current.jointIndex)
  );
}
