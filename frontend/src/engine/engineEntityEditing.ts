import type { EngineAxis } from "./engineSceneEditing";
import type { EngineEntity, EngineScene } from "./engineSchemas";
import { engineHeightAt } from "./engineTerrainEditing";

export function newEngineEntity(scene: EngineScene): EngineEntity {
  let number = 1;
  while (scene.entities.some((entity) => entity.id === `actor${number}`)) number++;
  const x = scene.terrain.sizeX / 2, z = scene.terrain.sizeZ / 2;
  return { id: `actor${number}`, model: "box", position: { x, y: engineHeightAt(scene, x, z) + 25, z }, rotation: { x: 0, y: 0, z: 0 }, scale: 50, color: { r: .95, g: .65, b: .2, a: 1 } };
}
export function changeEngineEntity(scene: EngineScene, id: string, update: Partial<EngineEntity>): EngineScene {
  return { ...scene, entities: scene.entities.map((entity) => entity.id === id ? { ...entity, ...update } : entity) };
}
export function moveEngineEntity(scene: EngineScene, id: string, axis: EngineAxis, value: number): EngineScene {
  const entity = scene.entities.find((entry) => entry.id === id);
  if (!entity || !Number.isFinite(value) || value === entity.position[axis]) return scene;
  return changeEngineEntity(scene, id, { position: { ...entity.position, [axis]: value } });
}
export function dropEngineEntity(scene: EngineScene, id: string): EngineScene {
  const entity = scene.entities.find((entry) => entry.id === id);
  if (!entity) return scene;
  if (entity.model !== "box" && !entity.body) return scene;
  const half = entity.body?.halfExtents ?? { x: .5, y: .5, z: .5 };
  const { x, y, z } = entity.rotation;
  const halfHeight = entity.scale * (Math.abs(Math.cos(y) * Math.sin(z)) * half.x + Math.abs(Math.cos(x) * Math.cos(z) + Math.sin(x) * Math.sin(y) * Math.sin(z)) * half.y + Math.abs(-Math.sin(x) * Math.cos(z) + Math.cos(x) * Math.sin(y) * Math.sin(z)) * half.z);
  return moveEngineEntity(scene, id, "y", engineHeightAt(scene, entity.position.x, entity.position.z) + halfHeight);
}
