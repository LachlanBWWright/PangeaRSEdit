import type { Document } from "@gltf-transform/core";
import { z } from "zod";
import type { BG3DBone, BG3DGeometry } from "./parseBG3D";
import { nativeNormal, nativePaletteMatch } from "./nativeSkinPalette";

const bindingSchema = z.object({
  joints: z.array(z.string()),
  normals: z.array(z.object({ vector: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]), joint: z.number().int().nonnegative().nullable() })),
});
export type NativeNormalBindings = z.infer<typeof bindingSchema>;

export function captureNativeNormalBindings(geometries: readonly BG3DGeometry[], bones: readonly BG3DBone[], joints: readonly string[]): NativeNormalBindings {
  const normals: NativeNormalBindings["normals"] = [];
  for (const geometry of geometries) {
    for (const normal of geometry.normals ?? []) {
      const vector = nativeNormal(normal);
      if (!normals.some((item) => nativePaletteMatch(item.vector, vector, 0.02))) normals.push({ vector, joint: null });
    }
  }
  for (const [joint, bone] of bones.entries()) {
    for (const index of bone.normalIndices ?? []) {
      const normal = normals[index];
      if (normal) normal.joint = joint;
    }
  }
  return { joints: [...joints], normals };
}

export function readNativeNormalBindings(document: Document): NativeNormalBindings | null {
  const parsed = bindingSchema.safeParse(document.getRoot().getExtras().pangeaNativeNormalBindings);
  if (!parsed.success) return null;
  const joints = document.getRoot().listSkins()[0]?.listJoints() ?? [];
  if (parsed.data.joints.length !== joints.length || parsed.data.joints.some((name, index) => name !== joints[index]?.getName())) return null;
  if (parsed.data.normals.some((normal) => normal.joint !== null && normal.joint >= joints.length)) return null;
  return parsed.data;
}

export function nativeNormalBinding(bindings: NativeNormalBindings | null, normal: readonly number[]) {
  return bindings?.normals.find((item) => nativePaletteMatch(item.vector, normal, 0.02)) ?? null;
}
