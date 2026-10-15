import type { Mesh } from "@gltf-transform/core";
import { z } from "zod";
import type { BG3DGeometry, BG3DGroup } from "./parseBG3D";

interface NativeGroup { kind: "group"; children: NativeChild[] }
type NativeChild = NativeGroup | { kind: "geometry"; id: number };
const geometrySchema = z.object({ kind: z.literal("geometry"), id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
const childSchema: z.ZodType<NativeChild> = z.lazy(() => z.union([
  geometrySchema, z.object({ kind: z.literal("group"), children: z.array(childSchema) }),
]));
const hierarchySchema = z.object({ version: z.literal(1), groups: z.array(z.object({ kind: z.literal("group"), children: z.array(childSchema) })) });
const shallowGroupSchema = z.object({ kind: z.literal("group"), children: z.array(z.unknown()) });
const geometryIdSchema = z.object({ pangeaNativeGeometryId: z.number().int().nonnegative() });

export function captureNativeGroups(groups: readonly BG3DGroup[]) {
  const geometries: BG3DGeometry[] = [];
  function capture(group: BG3DGroup): NativeGroup {
    return { kind: "group", children: group.children.map((child): NativeChild => {
      if ("children" in child) return capture(child);
      const id = geometries.length;
      geometries.push(child);
      return { kind: "geometry", id };
    }) };
  }
  return { hierarchy: { version: 1, groups: groups.map(capture) }, geometries };
}

function withinHierarchyLimits(value: unknown): boolean {
  const root = z.object({ groups: z.array(z.unknown()) }).safeParse(value);
  if (!root.success || root.data.groups.length > 100000) return false;
  const pending = root.data.groups.map((node) => ({ node, depth: 0 }));
  let count = 0;
  while (pending.length > 0) {
    const item = pending.pop();
    if (!item || item.depth > 64 || ++count > 100000) return false;
    const group = shallowGroupSchema.safeParse(item.node);
    if (group.success) {
      if (pending.length + group.data.children.length > 100000) return false;
      for (const node of group.data.children) pending.push({ node, depth: item.depth + 1 });
    }
  }
  return true;
}

export function restoreNativeGroups(
  value: unknown, meshes: readonly Mesh[], processMesh: (mesh: Mesh) => BG3DGeometry[],
): BG3DGroup[] | null {
  if (!withinHierarchyLimits(value)) return null;
  const parsed = hierarchySchema.safeParse(value);
  if (!parsed.success) return null;
  const byId = new Map<number, Mesh>();
  const additions: Mesh[] = [];
  for (const mesh of meshes) {
    const id = geometryIdSchema.safeParse(mesh.getExtras());
    if (!id.success) { additions.push(mesh); continue; }
    if (byId.has(id.data.pangeaNativeGeometryId)) return null;
    byId.set(id.data.pangeaNativeGeometryId, mesh);
  }
  const usedIds = new Set<number>();
  let duplicatedReference = false;
  function restore(group: NativeGroup): BG3DGroup {
    const children: (BG3DGeometry | BG3DGroup)[] = [];
    for (const child of group.children) {
      if (child.kind === "group") { children.push(restore(child)); continue; }
      if (usedIds.has(child.id)) duplicatedReference = true;
      usedIds.add(child.id);
      const mesh = byId.get(child.id);
      if (mesh) children.push(...processMesh(mesh));
    }
    return { children };
  }
  const groups = parsed.data.groups.map(restore);
  if (duplicatedReference) return null;
  for (const [id, mesh] of byId) if (!usedIds.has(id)) additions.push(mesh);
  if (additions.length > 0) {
    const newModel = { children: additions.flatMap(processMesh) };
    const root = groups[0];
    if (root) root.children.push(newModel);
    else groups.push({ children: [newModel] });
  }
  return groups;
}
