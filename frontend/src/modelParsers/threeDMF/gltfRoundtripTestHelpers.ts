import { BG3DParseResult } from "../parseBG3D";
import { join } from "path";

export const BUGDOM_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/bugdom1/skeletons",
);

export const BUGDOM_MODELS_PATH = join(
  __dirname,
  "../../../public/games/bugdom1/models",
);

export const NANOSAUR_SKELETONS_PATH = join(
  __dirname,
  "../../../public/games/nanosaur1/skeletons",
);

export const NANOSAUR_MODELS_PATH = join(
  __dirname,
  "../../../public/games/nanosaur1/models",
);

/**
 * Compare two floats with tolerance for precision issues
 */
function floatsNearlyEqual(a: number, b: number, tolerance = 1e-4): boolean {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  const maxMag = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / maxMag < tolerance;
}

function hasVertexMismatch(
  origVerts: [number, number, number][],
  rtVerts: [number, number, number][],
): number | null {
  const minVerts = Math.min(origVerts.length, rtVerts.length);
  for (let v = 0; v < minVerts; v++) {
    const origV = origVerts[v];
    const rtV = rtVerts[v];
    if (!origV || !rtV) continue;
    const [origX, origY, origZ] = origV;
    const [rtX, rtY, rtZ] = rtV;
    if (
      !floatsNearlyEqual(origX, rtX) ||
      !floatsNearlyEqual(origY, rtY) ||
      !floatsNearlyEqual(origZ, rtZ)
    )
      return v;
  }
  return null;
}

function hasTriangleMismatch(
  origTris: [number, number, number][],
  rtTris: [number, number, number][],
): number | null {
  const minTris = Math.min(origTris.length, rtTris.length);
  for (let t = 0; t < minTris; t++) {
    const origT = origTris[t];
    const rtT = rtTris[t];
    if (!origT || !rtT) continue;
    const [origI0, origI1, origI2] = origT;
    const [rtI0, rtI1, rtI2] = rtT;
    if (origI0 !== rtI0 || origI1 !== rtI1 || origI2 !== rtI2) return t;
  }
  return null;
}

/**
 * Compare two BG3DParseResult structures for semantic equality
 */
export function compareBG3DResults(
  original: BG3DParseResult,
  roundtrip: BG3DParseResult,
  label: string,
): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  if (original.materials.length !== roundtrip.materials.length) {
    differences.push(
      `${label}: Material count mismatch - original: ${original.materials.length}, roundtrip: ${roundtrip.materials.length}`,
    );
  }

  if (original.groups.length !== roundtrip.groups.length) {
    differences.push(
      `${label}: Group count mismatch - original: ${original.groups.length}, roundtrip: ${roundtrip.groups.length}`,
    );
  }

  function flattenGeometries(
    groups: BG3DParseResult["groups"],
  ): BG3DParseResult["groups"][0]["children"] {
    const result: BG3DParseResult["groups"][0]["children"] = [];
    for (const group of groups)
      if (group.children)
        for (const child of group.children)
          if ("vertices" in child || "numPoints" in child) result.push(child);
    return result;
  }

  const origGeometries = flattenGeometries(original.groups);
  const rtGeometries = flattenGeometries(roundtrip.groups);

  if (origGeometries.length !== rtGeometries.length) {
    differences.push(
      `${label}: Total geometry count mismatch - original: ${origGeometries.length}, roundtrip: ${rtGeometries.length}`,
    );
    return { match: false, differences };
  }

  for (let i = 0; i < origGeometries.length; i++) {
    const origGeom = origGeometries[i];
    const rtGeom = rtGeometries[i];
    if (
      !origGeom ||
      !rtGeom ||
      !("numPoints" in origGeom) ||
      !("numPoints" in rtGeom)
    ) {
      differences.push(`${label}: Geometry ${i} is missing or not a geometry`);
      continue;
    }
    if (origGeom.numPoints !== rtGeom.numPoints) {
      differences.push(
        `${label}: Geom ${i} vertex count mismatch - original: ${origGeom.numPoints}, roundtrip: ${rtGeom.numPoints}`,
      );
      continue;
    }
    if (origGeom.numTriangles !== rtGeom.numTriangles) {
      differences.push(
        `${label}: Geom ${i} triangle count mismatch - original: ${origGeom.numTriangles}, roundtrip: ${rtGeom.numTriangles}`,
      );
      continue;
    }

    const origVerts = origGeom.vertices;
    const rtVerts = rtGeom.vertices;
    const vertexMismatch =
      origVerts && rtVerts ? hasVertexMismatch(origVerts, rtVerts) : null;
    if (vertexMismatch !== null)
      differences.push(
        `${label}: Geom ${i}, Vertex ${vertexMismatch} position mismatch`,
      );

    const origTris = origGeom.triangles;
    const rtTris = rtGeom.triangles;
    const triangleMismatch =
      origTris && rtTris ? hasTriangleMismatch(origTris, rtTris) : null;
    if (triangleMismatch !== null)
      differences.push(
        `${label}: Geom ${i}, Triangle ${triangleMismatch} index mismatch`,
      );
  }

  return {
    match: differences.length === 0,
    differences,
  };
}
