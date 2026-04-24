import type { TQ3MetaFile } from "./types";
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

export const testFiles = [
  { path: BUGDOM_SKELETONS_PATH, name: "Ant.3dmf" },
  { path: BUGDOM_SKELETONS_PATH, name: "Spider.3dmf" },
  { path: BUGDOM_SKELETONS_PATH, name: "Slug.3dmf" },
  { path: NANOSAUR_SKELETONS_PATH, name: "Deinon.3dmf" },
  { path: NANOSAUR_SKELETONS_PATH, name: "Rex.3dmf" },
] as const;

export const skeletonTestFiles = [
  {
    modelPath: BUGDOM_SKELETONS_PATH,
    modelName: "Ant.3dmf",
    skeletonPath: BUGDOM_SKELETONS_PATH,
    skeletonName: "Ant.skeleton.rsrc",
  },
  {
    modelPath: BUGDOM_SKELETONS_PATH,
    modelName: "Spider.3dmf",
    skeletonPath: BUGDOM_SKELETONS_PATH,
    skeletonName: "Spider.skeleton.rsrc",
  },
  {
    modelPath: NANOSAUR_SKELETONS_PATH,
    modelName: "Deinon.3dmf",
    skeletonPath: NANOSAUR_SKELETONS_PATH,
    skeletonName: "Deinon.skeleton.rsrc",
  },
] as const;

export const modelFiles = [
  { path: BUGDOM_MODELS_PATH, name: "MainMenu.3dmf" },
  { path: NANOSAUR_MODELS_PATH, name: "Global_Models.3dmf" },
] as const;

function floatsNearlyEqual(a: number, b: number, tolerance = 1e-5): boolean {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  const maxMag = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / maxMag < tolerance;
}

export function compareMetaFiles(
  original: TQ3MetaFile,
  roundtrip: TQ3MetaFile,
  label: string,
): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  if (original.numMeshes !== roundtrip.numMeshes) {
    differences.push(
      `${label}: Mesh count mismatch - original: ${original.numMeshes}, roundtrip: ${roundtrip.numMeshes}`,
    );
  }

  const minMeshes = Math.min(original.numMeshes, roundtrip.numMeshes);
  for (let m = 0; m < minMeshes; m++) {
    const origMesh = original.meshes[m];
    const rtMesh = roundtrip.meshes[m];
    if (!origMesh || !rtMesh) continue;

    if (origMesh.numPoints !== rtMesh.numPoints) {
      differences.push(
        `${label}: Mesh ${m} vertex count - orig: ${origMesh.numPoints}, rt: ${rtMesh.numPoints}`,
      );
      continue;
    }

    if (origMesh.numTriangles !== rtMesh.numTriangles) {
      differences.push(
        `${label}: Mesh ${m} triangle count - orig: ${origMesh.numTriangles}, rt: ${rtMesh.numTriangles}`,
      );
      continue;
    }

    for (let v = 0; v < origMesh.numPoints; v++) {
      const origPt = origMesh.points[v];
      const rtPt = rtMesh.points[v];
      if (!origPt || !rtPt) continue;
      if (
        !floatsNearlyEqual(origPt.x, rtPt.x) ||
        !floatsNearlyEqual(origPt.y, rtPt.y) ||
        !floatsNearlyEqual(origPt.z, rtPt.z)
      ) {
        differences.push(`${label}: Mesh ${m} vertex ${v} position mismatch`);
        break;
      }
    }

    for (let t = 0; t < origMesh.numTriangles; t++) {
      const origTri = origMesh.triangles[t];
      const rtTri = rtMesh.triangles[t];
      if (!origTri || !rtTri) continue;
      if (
        origTri.pointIndices[0] !== rtTri.pointIndices[0] ||
        origTri.pointIndices[1] !== rtTri.pointIndices[1] ||
        origTri.pointIndices[2] !== rtTri.pointIndices[2]
      ) {
        differences.push(`${label}: Mesh ${m} triangle ${t} indices mismatch`);
        break;
      }
    }

    if (origMesh.vertexNormals) {
      if (!rtMesh.vertexNormals) {
        differences.push(`${label}: Mesh ${m} missing normals in roundtrip`);
      } else {
        for (let n = 0; n < origMesh.vertexNormals.length; n++) {
          const origN = origMesh.vertexNormals[n];
          const rtN = rtMesh.vertexNormals[n];
          if (!origN || !rtN) continue;
          if (
            !floatsNearlyEqual(origN.x, rtN.x) ||
            !floatsNearlyEqual(origN.y, rtN.y) ||
            !floatsNearlyEqual(origN.z, rtN.z)
          ) {
            differences.push(`${label}: Mesh ${m} normal ${n} mismatch`);
            break;
          }
        }
      }
    }

    if (origMesh.vertexUVs) {
      if (!rtMesh.vertexUVs) {
        differences.push(`${label}: Mesh ${m} missing UVs in roundtrip`);
      } else {
        for (let u = 0; u < origMesh.vertexUVs.length; u++) {
          const origUV = origMesh.vertexUVs[u];
          const rtUV = rtMesh.vertexUVs[u];
          if (!origUV || !rtUV) continue;
          if (
            !floatsNearlyEqual(origUV.u, rtUV.u) ||
            !floatsNearlyEqual(origUV.v, rtUV.v)
          ) {
            differences.push(`${label}: Mesh ${m} UV ${u} mismatch`);
            break;
          }
        }
      }
    }

    const origBB = origMesh.bBox;
    const rtBB = rtMesh.bBox;
    if (
      !floatsNearlyEqual(origBB.min.x, rtBB.min.x) ||
      !floatsNearlyEqual(origBB.min.y, rtBB.min.y) ||
      !floatsNearlyEqual(origBB.min.z, rtBB.min.z) ||
      !floatsNearlyEqual(origBB.max.x, rtBB.max.x) ||
      !floatsNearlyEqual(origBB.max.y, rtBB.max.y) ||
      !floatsNearlyEqual(origBB.max.z, rtBB.max.z)
    ) {
      differences.push(`${label}: Mesh ${m} bounding box mismatch`);
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}
