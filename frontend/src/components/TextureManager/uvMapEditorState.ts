import type {
  UvLayout,
  UvMeshLayout,
  UvVertex,
} from "@/modelEditing/uv/uvTypes";
import { getWheelZoom } from "@/components/editor/editorZoomState";

export const UV_WORKSPACE_SIZE = 1024;
export const UV_OVERLAP_THRESHOLD = 0.7;

const ZOOM_LEVELS: readonly number[] = [
  50, 75, 100, 150, 200, 300, 400, 600, 800,
];
const WHEEL_ZOOM_FACTOR = 1.1;

export interface UvBounds {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
  readonly area: number;
}

export function clampUv(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getSteppedZoomPercent(
  currentZoom: number,
  direction: 1 | -1,
): number {
  const firstLargerLevel = ZOOM_LEVELS.find((level) => level >= currentZoom);
  const currentIndex = ZOOM_LEVELS.indexOf(firstLargerLevel ?? 100);
  const nextIndex = Math.min(
    ZOOM_LEVELS.length - 1,
    Math.max(0, currentIndex + direction),
  );
  return ZOOM_LEVELS[nextIndex] ?? currentZoom;
}

export function getWheelZoomPercent(
  currentZoom: number,
  deltaY: number,
): number {
  return Math.round(
    getWheelZoom(currentZoom, deltaY, WHEEL_ZOOM_FACTOR, {
      min: 50,
      max: 800,
    }),
  );
}

export function getMeshStroke(index: number): string {
  const colors = [
    "rgba(56, 189, 248, 0.95)",
    "rgba(244, 114, 182, 0.95)",
    "rgba(34, 197, 94, 0.95)",
    "rgba(251, 191, 36, 0.95)",
    "rgba(168, 85, 247, 0.95)",
    "rgba(248, 113, 113, 0.95)",
  ];
  return colors[index % colors.length] ?? "rgba(56, 189, 248, 0.95)";
}

export function getMeshBounds(mesh: UvMeshLayout): UvBounds {
  if (mesh.vertices.length === 0) {
    return { minU: 0, maxU: 0, minV: 0, maxV: 0, area: 0 };
  }

  const uValues = mesh.vertices.map((vertex) => vertex.u);
  const vValues = mesh.vertices.map((vertex) => vertex.v);
  const minU = Math.min(...uValues);
  const maxU = Math.max(...uValues);
  const minV = Math.min(...vValues);
  const maxV = Math.max(...vValues);
  return {
    minU,
    maxU,
    minV,
    maxV,
    area: Math.max(0, maxU - minU) * Math.max(0, maxV - minV),
  };
}

export function getOverlapRatio(a: UvBounds, b: UvBounds): number {
  const overlapWidth = Math.max(
    0,
    Math.min(a.maxU, b.maxU) - Math.max(a.minU, b.minU),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a.maxV, b.maxV) - Math.max(a.minV, b.minV),
  );
  const smallerArea = Math.min(a.area, b.area);
  return smallerArea > 0 ? (overlapWidth * overlapHeight) / smallerArea : 0;
}

export function buildMeshPath(mesh: UvMeshLayout): string {
  return mesh.faces
    .map((face) => {
      const [i0, i1, i2] = face.vertexIndices;
      const vertices = [mesh.vertices[i0], mesh.vertices[i1], mesh.vertices[i2]];
      if (vertices.some((vertex) => vertex === undefined)) {
        return "";
      }

      return vertices
        .map((vertex, index) => {
          if (!vertex) {
            return "";
          }
          const command = index === 0 ? "M" : "L";
          return `${command} ${(vertex.u * UV_WORKSPACE_SIZE).toFixed(1)} ${(vertex.v * UV_WORKSPACE_SIZE).toFixed(1)}`;
        })
        .concat("Z")
        .join(" ");
    })
    .filter((segment) => segment.length > 0)
    .join(" ");
}

export function replaceVertex(
  layout: UvLayout,
  meshId: string,
  vertexIndex: number,
  nextVertex: UvVertex,
): UvLayout {
  return {
    ...layout,
    meshes: layout.meshes.map((mesh) =>
      mesh.meshId === meshId
        ? {
            ...mesh,
            vertices: mesh.vertices.map((vertex, index) =>
              index === vertexIndex ? nextVertex : vertex,
            ),
          }
        : mesh,
    ),
  };
}

export function applyScopedLayoutChange(
  layout: UvLayout,
  selectedMeshId: string,
  editSelectedOnly: boolean,
  mapper: (layout: UvLayout) => UvLayout,
): UvLayout {
  if (!editSelectedOnly) {
    return mapper(layout);
  }

  const selectedMesh = layout.meshes.find(
    (mesh) => mesh.meshId === selectedMeshId,
  );
  if (!selectedMesh) {
    return layout;
  }

  const nextSelectedMesh = mapper({ ...layout, meshes: [selectedMesh] }).meshes[0];
  if (!nextSelectedMesh) {
    return layout;
  }

  return {
    ...layout,
    meshes: layout.meshes.map((mesh) =>
      mesh.meshId === selectedMeshId ? nextSelectedMesh : mesh,
    ),
  };
}
