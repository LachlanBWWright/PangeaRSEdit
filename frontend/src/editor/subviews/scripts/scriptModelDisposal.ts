import { Mesh, Texture, type Object3D } from "three";
import { z } from "zod";

const meshSchema = z.instanceof(Mesh);
const textureSchema = z.instanceof(Texture);

export function disposeScriptModel(scene: Object3D): void {
  const disposed = new Set<object>();
  scene.traverse((node) => {
    const mesh = meshSchema.safeParse(node);
    if (!mesh.success) return;
    if (!disposed.has(mesh.data.geometry)) {
      mesh.data.geometry.dispose();
      disposed.add(mesh.data.geometry);
    }
    const materials = Array.isArray(mesh.data.material) ? mesh.data.material : [mesh.data.material];
    for (const material of materials) {
      if (disposed.has(material)) continue;
      for (const value of Object.values(material)) {
        const texture = textureSchema.safeParse(value);
        if (!texture.success || disposed.has(texture.data)) continue;
        texture.data.dispose();
        disposed.add(texture.data);
      }
      material.dispose();
      disposed.add(material);
    }
  });
}
