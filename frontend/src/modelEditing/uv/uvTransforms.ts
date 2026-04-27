import type { UvLayout, UvMeshLayout, UvVertex } from "./uvTypes";

function applyTransformToVertex(
  vertex: UvVertex,
  offsetU: number,
  offsetV: number,
  rotationRad: number,
  scaleU: number,
  scaleV: number,
  flipU: boolean,
  flipV: boolean,
  pivotU: number,
  pivotV: number,
): UvVertex {
  let u = vertex.u;
  let v = vertex.v;

  // Flip around pivot
  if (flipU) u = pivotU * 2 - u;
  if (flipV) v = pivotV * 2 - v;

  // Scale around pivot
  u = pivotU + (u - pivotU) * scaleU;
  v = pivotV + (v - pivotV) * scaleV;

  // Rotate around pivot
  if (rotationRad !== 0) {
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const du = u - pivotU;
    const dv = v - pivotV;
    u = pivotU + du * cos - dv * sin;
    v = pivotV + du * sin + dv * cos;
  }

  // Translate
  u += offsetU;
  v += offsetV;

  return { u, v };
}

function computePivot(vertices: readonly UvVertex[]): { u: number; v: number } {
  if (vertices.length === 0) return { u: 0.5, v: 0.5 };
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const v of vertices) {
    if (v.u < minU) minU = v.u;
    if (v.u > maxU) maxU = v.u;
    if (v.v < minV) minV = v.v;
    if (v.v > maxV) maxV = v.v;
  }
  return { u: (minU + maxU) / 2, v: (minV + maxV) / 2 };
}

interface ApplyArgs {
  readonly layout: UvLayout;
  readonly offsetU: number;
  readonly offsetV: number;
  readonly rotationDeg: number;
  readonly scaleU: number;
  readonly scaleV: number;
  readonly flipU: boolean;
  readonly flipV: boolean;
}

/** Returns a new UvLayout with all transforms applied. Does not mutate input. */
export function applyUvTransform({
  layout,
  offsetU,
  offsetV,
  rotationDeg,
  scaleU,
  scaleV,
  flipU,
  flipV,
}: ApplyArgs): UvLayout {
  const rotationRad = (rotationDeg * Math.PI) / 180;

  const transformedMeshes: UvMeshLayout[] = layout.meshes.map((mesh) => {
    const pivot = computePivot(mesh.vertices);
    const transformedVertices: UvVertex[] = mesh.vertices.map((vertex) =>
      applyTransformToVertex(
        vertex,
        offsetU,
        offsetV,
        rotationRad,
        scaleU,
        scaleV,
        flipU,
        flipV,
        pivot.u,
        pivot.v,
      ),
    );
    return { ...mesh, vertices: transformedVertices };
  });

  return { ...layout, meshes: transformedMeshes };
}

/** Fit all UVs so they fill the 0..1 range on both axes. */
export function fitUvToImage(layout: UvLayout): UvLayout {
  const allVertices = layout.meshes.flatMap((m) => m.vertices);
  if (allVertices.length === 0) return layout;

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const v of allVertices) {
    if (v.u < minU) minU = v.u;
    if (v.u > maxU) maxU = v.u;
    if (v.v < minV) minV = v.v;
    if (v.v > maxV) maxV = v.v;
  }

  const rangeU = maxU - minU;
  const rangeV = maxV - minV;
  if (rangeU === 0 || rangeV === 0) return layout;

  const transformedMeshes: UvMeshLayout[] = layout.meshes.map((mesh) => ({
    ...mesh,
    vertices: mesh.vertices.map((vertex) => ({
      u: (vertex.u - minU) / rangeU,
      v: (vertex.v - minV) / rangeV,
    })),
  }));

  return { ...layout, meshes: transformedMeshes };
}

/** Snap all UVs to the nearest pixel on a given texture size. */
export function snapUvToPixelGrid(
  layout: UvLayout,
  textureWidth: number,
  textureHeight: number,
): UvLayout {
  const transformedMeshes: UvMeshLayout[] = layout.meshes.map((mesh) => ({
    ...mesh,
    vertices: mesh.vertices.map((vertex) => ({
      u: Math.round(vertex.u * textureWidth) / textureWidth,
      v: Math.round(vertex.v * textureHeight) / textureHeight,
    })),
  }));

  return { ...layout, meshes: transformedMeshes };
}
