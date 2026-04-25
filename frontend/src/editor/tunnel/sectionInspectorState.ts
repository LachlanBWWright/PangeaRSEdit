import type { TunnelData, TunnelSection } from "@/data/tunnelParser/types";

export interface SectionStats {
  readonly tunnelVertices: number;
  readonly tunnelTriangles: number;
  readonly waterVertices: number;
  readonly waterTriangles: number;
  readonly totalVertices: number;
  readonly totalTriangles: number;
  readonly dimensions: {
    readonly width: string;
    readonly height: string;
    readonly depth: string;
  };
}

export function getSectionStats(section: TunnelSection): SectionStats {
  const tunnelVertices = section.tunnelMesh.numPoints;
  const tunnelTriangles = section.tunnelMesh.numTriangles;
  const waterVertices = section.waterMesh.numPoints;
  const waterTriangles = section.waterMesh.numTriangles;

  const tunnelBox = section.tunnelMesh.bBox;
  const tunnelWidth = tunnelBox.max.x - tunnelBox.min.x;
  const tunnelHeight = tunnelBox.max.y - tunnelBox.min.y;
  const tunnelDepth = tunnelBox.max.z - tunnelBox.min.z;

  return {
    tunnelVertices,
    tunnelTriangles,
    waterVertices,
    waterTriangles,
    totalVertices: tunnelVertices + waterVertices,
    totalTriangles: tunnelTriangles + waterTriangles,
    dimensions: {
      width: tunnelWidth.toFixed(1),
      height: tunnelHeight.toFixed(1),
      depth: tunnelDepth.toFixed(1),
    },
  };
}

export function getTotalSectionStats(tunnelData: TunnelData): {
  vertices: number;
  triangles: number;
} {
  return tunnelData.sections.reduce(
    (accumulator, section) => {
      const stats = getSectionStats(section);
      return {
        vertices: accumulator.vertices + stats.totalVertices,
        triangles: accumulator.triangles + stats.totalTriangles,
      };
    },
    { vertices: 0, triangles: 0 },
  );
}

export function toggleSelectedSection(
  selectedSection: number | null,
  index: number,
): number | null {
  return selectedSection === index ? null : index;
}
