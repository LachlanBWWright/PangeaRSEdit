import type { Document } from "@gltf-transform/core";
import { err, Result } from "neverthrow";
import { z } from "zod";
import { boundaryMessage } from "./boundaries";

const transformSchema = z.object({
  scale: z.number().finite().positive(),
  rotationDegrees: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
});
export type ModelImportTransform = z.infer<typeof transformSchema>;

export function applyImportTransform(document: Document, transform: ModelImportTransform) {
  const parsed = transformSchema.safeParse(transform);
  if (!parsed.success) return err("Import scale must be positive and rotations must be finite numbers.");
  if (document.getRoot().listSkins().length > 0 || document.getRoot().listAnimations().length > 0)
    return err("Scale and orientation adjustments for animated models must be applied in the authoring tool before import.");
  const [x, y, z] = parsed.data.rotationDegrees.map((angle) => angle * Math.PI / 360);
  if (x === undefined || y === undefined || z === undefined) return err("Import rotation requires three axes.");
  const c1 = Math.cos(x), c2 = Math.cos(y), c3 = Math.cos(z);
  const s1 = Math.sin(x), s2 = Math.sin(y), s3 = Math.sin(z);
  return Result.fromThrowable(() => {
    for (const scene of document.getRoot().listScenes()) {
      const nodes = scene.listChildren();
      const wrapper = document.createNode("Import orientation")
        .setScale([parsed.data.scale, parsed.data.scale, parsed.data.scale])
        .setRotation([s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3,
          c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3]);
      for (const node of nodes) { scene.removeChild(node); wrapper.addChild(node); }
      scene.addChild(wrapper);
    }
  }, boundaryMessage)();
}
