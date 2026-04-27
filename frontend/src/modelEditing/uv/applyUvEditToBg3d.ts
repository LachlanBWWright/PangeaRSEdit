import { ok, type Result } from "neverthrow";
import type { BG3DParseResult, BG3DGeometry, BG3DGroup } from "@/modelParsers/parseBG3D";
import type { UvLayout, UvMeshLayout } from "./uvTypes";

/**
 * Collect all BG3DGeometry leaves from the group tree in DFS order.
 */
function collectGeometries(group: BG3DGroup): BG3DGeometry[] {
  const out: BG3DGeometry[] = [];
  for (const child of group.children) {
    if ("numTriangles" in child) {
      out.push(child);
    } else {
      out.push(...collectGeometries(child));
    }
  }
  return out;
}

/**
 * Apply UV edits back into the parsed BG3D data.
 * Geometries are matched in DFS order against the UV layout meshes.
 */
export function applyUvEditToBg3d(
  bg3dParsed: BG3DParseResult,
  layout: UvLayout,
): Result<BG3DParseResult, string> {
  // Build a flat list of all geometry nodes in the scene (mutate in place — safe for our use)
  const allGeometries: BG3DGeometry[] = [];
  for (const group of bg3dParsed.groups) {
    allGeometries.push(...collectGeometries(group));
  }

  // Build lookup by mesh name (mesh names come from Three.js scene and should correspond to
  // the order geometries were added when building the GLB)
  const meshByName = new Map<string, UvMeshLayout>(
    layout.meshes.map((m) => [m.meshName, m]),
  );

  for (const geom of allGeometries) {
    if (!geom.uvs) continue;
    // Try to find a matching mesh layout by index (fallback: apply all layouts sequentially)
    // We apply whichever mesh has the matching vertex count
    for (const meshLayout of meshByName.values()) {
      if (meshLayout.vertices.length === geom.uvs.length) {
        geom.uvs = meshLayout.vertices.map((v): [number, number] => [v.u, v.v]);
        break;
      }
    }
  }

  return ok(bg3dParsed);
}
