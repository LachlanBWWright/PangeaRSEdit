import type { EngineScene } from "./engineSchemas";

export type EngineAxis = "x" | "y" | "z";
export function moveEngineBox(scene: EngineScene, index: number, axis: EngineAxis, position: number): EngineScene {
  if (!Number.isFinite(position)) return scene;
  return { ...scene, colliders: scene.colliders.map((box, i) => {
    if (i !== index) return box;
    const delta = position - box.min[axis];
    return { ...box, min: { ...box.min, [axis]: position }, max: { ...box.max, [axis]: box.max[axis] + delta } };
  }) };
}
export function resizeEngineBox(scene: EngineScene, index: number, axis: EngineAxis, size: number): EngineScene {
  if (!Number.isFinite(size) || size <= 0) return scene;
  return { ...scene, colliders: scene.colliders.map((box, i) => i === index ? { ...box, max: { ...box.max, [axis]: box.min[axis] + size } } : box) };
}
export function addEngineAsset(scene: EngineScene, file: string): EngineScene {
  let suffix = 1;
  while (scene.assets.some((asset) => asset.id === `model${suffix}`)) suffix++;
  return { ...scene, assets: [...scene.assets, { id: `model${suffix}`, file }] };
}
