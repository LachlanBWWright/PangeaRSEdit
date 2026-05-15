import type { TunnelData, TunnelSectionMesh } from "@/data/tunnelParser/types";

export interface TunnelValidationIssue {
  readonly id: string;
  readonly message: string;
}

function validateMesh(
  issues: TunnelValidationIssue[],
  sectionIndex: number,
  meshName: "tunnel" | "water",
  mesh: TunnelSectionMesh,
): void {
  if (mesh.points.length !== mesh.numPoints) {
    issues.push({
      id: `${meshName}-${sectionIndex}-point-count`,
      message: `Section ${sectionIndex} ${meshName} mesh point count is ${mesh.points.length}, header says ${mesh.numPoints}.`,
    });
  }

  if (mesh.triangles.length !== mesh.numTriangles) {
    issues.push({
      id: `${meshName}-${sectionIndex}-triangle-count`,
      message: `Section ${sectionIndex} ${meshName} mesh triangle count is ${mesh.triangles.length}, header says ${mesh.numTriangles}.`,
    });
  }

  if (mesh.uvs.length !== mesh.points.length) {
    issues.push({
      id: `${meshName}-${sectionIndex}-uv-count`,
      message: `Section ${sectionIndex} ${meshName} mesh has ${mesh.uvs.length} UVs for ${mesh.points.length} points.`,
    });
  }

  if (mesh.normals && mesh.normals.length !== mesh.points.length) {
    issues.push({
      id: `${meshName}-${sectionIndex}-normal-count`,
      message: `Section ${sectionIndex} ${meshName} mesh has ${mesh.normals.length} normals for ${mesh.points.length} points.`,
    });
  }

  mesh.triangles.forEach((tri, triangleIndex) => {
    const maxIndex = mesh.points.length - 1;
    if (
      tri.a < 0 ||
      tri.b < 0 ||
      tri.c < 0 ||
      tri.a > maxIndex ||
      tri.b > maxIndex ||
      tri.c > maxIndex
    ) {
      issues.push({
        id: `${meshName}-${sectionIndex}-tri-${triangleIndex}`,
        message: `Section ${sectionIndex} ${meshName} triangle ${triangleIndex} references out-of-range vertex indices (${tri.a}, ${tri.b}, ${tri.c}).`,
      });
    }
  });
}

export function getTunnelValidationIssues(
  tunnelData: TunnelData,
): readonly TunnelValidationIssue[] {
  const issues: TunnelValidationIssue[] = [];

  if (tunnelData.sections.length !== tunnelData.header.numSections) {
    issues.push({
      id: "header-section-count",
      message: `Header says ${tunnelData.header.numSections} sections, but data has ${tunnelData.sections.length}.`,
    });
  }

  if (tunnelData.items.length !== tunnelData.header.numItems) {
    issues.push({
      id: "header-item-count",
      message: `Header says ${tunnelData.header.numItems} items, but data has ${tunnelData.items.length}.`,
    });
  }

  if (tunnelData.splinePoints.length !== tunnelData.header.numSplinePoints) {
    issues.push({
      id: "header-spline-count",
      message: `Header says ${tunnelData.header.numSplinePoints} spline points, but data has ${tunnelData.splinePoints.length}.`,
    });
  }

  tunnelData.items.forEach((item, itemIndex) => {
    if (
      item.splineIndex < 0 ||
      item.splineIndex >= tunnelData.splinePoints.length
    ) {
      issues.push({
        id: `item-${itemIndex}-spline-index`,
        message: `Item ${itemIndex} uses spline index ${item.splineIndex}, out of range for ${tunnelData.splinePoints.length} spline points.`,
      });
    }

    if (item.sectionNum >= tunnelData.sections.length) {
      issues.push({
        id: `item-${itemIndex}-section-index`,
        message: `Item ${itemIndex} uses section ${item.sectionNum}, out of range for ${tunnelData.sections.length} sections.`,
      });
    }
  });

  tunnelData.sections.forEach((section, sectionIndex) => {
    validateMesh(issues, sectionIndex, "tunnel", section.tunnelMesh);
    validateMesh(issues, sectionIndex, "water", section.waterMesh);
  });

  return issues;
}
