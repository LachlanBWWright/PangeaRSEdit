import { ok, type Result } from "neverthrow";
import type {
  BG3DParseResult,
  BG3DGeometry,
  BG3DGroup,
} from "@/modelParsers/parseBG3D";
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

  const meshByGeometryIndex = new Map<number, UvMeshLayout>(
    layout.meshes.map((mesh) => [mesh.geometryIndex, mesh]),
  );

  for (const [geometryIndex, geom] of allGeometries.entries()) {
    if (!geom.uvs) continue;
    const meshLayout = meshByGeometryIndex.get(geometryIndex);
    if (!meshLayout || meshLayout.vertices.length !== geom.uvs.length) {
      continue;
    }

    geom.uvs = meshLayout.vertices.map((vertex): [number, number] => [
      vertex.u,
      vertex.v,
    ]);
  }

  return ok({
    ...bg3dParsed,
    groups: [...bg3dParsed.groups],
  });
}
