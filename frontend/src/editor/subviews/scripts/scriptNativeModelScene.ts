import { Group } from "three";

export function createNativeDefinitionScene(itemScene: Group): Group {
  const scene = new Group();
  const source = itemScene.children[0];
  if (!source) return scene;
  // Item previews may add companion parts and local item transforms; definitions spawn one raw model.
  const model = source.clone(true);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  scene.add(model);
  return scene;
}
