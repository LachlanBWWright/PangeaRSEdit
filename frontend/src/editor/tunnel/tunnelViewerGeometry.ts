import * as THREE from "three";
import type {
  TunnelData,
  TunnelSectionMesh,
  TriangleIndices,
} from "@/data/tunnelParser/types";

function setMeshPositions(
  geometry: THREE.BufferGeometry,
  mesh: TunnelSectionMesh,
): void {
  const positions = new Float32Array(mesh.numPoints * 3);
  for (let index = 0; index < mesh.numPoints; index += 1) {
    const point = mesh.points[index];
    if (!point) {
      continue;
    }
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
}

function setMeshUvs(
  geometry: THREE.BufferGeometry,
  mesh: TunnelSectionMesh,
): void {
  const uvs = new Float32Array(mesh.numPoints * 2);
  for (let index = 0; index < mesh.numPoints; index += 1) {
    const uv = mesh.uvs[index];
    if (!uv) {
      continue;
    }
    uvs[index * 2] = uv.u;
    uvs[index * 2 + 1] = uv.v;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function setMeshNormals(
  geometry: THREE.BufferGeometry,
  mesh: TunnelSectionMesh,
): void {
  if (!mesh.normals) {
    return;
  }

  const normals = new Float32Array(mesh.numPoints * 3);
  for (let index = 0; index < mesh.numPoints; index += 1) {
    const normal = mesh.normals[index];
    if (!normal) {
      continue;
    }
    normals[index * 3] = normal.x;
    normals[index * 3 + 1] = normal.y;
    normals[index * 3 + 2] = normal.z;
  }
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
}

function setMeshIndices(
  geometry: THREE.BufferGeometry,
  triangles: TriangleIndices[],
): void {
  const indices = new Uint32Array(triangles.length * 3);
  for (let index = 0; index < triangles.length; index += 1) {
    const triangle = triangles[index];
    if (!triangle) {
      continue;
    }
    indices[index * 3] = triangle.a;
    indices[index * 3 + 1] = triangle.b;
    indices[index * 3 + 2] = triangle.c;
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
}

export function createTunnelMeshGeometry(
  mesh: TunnelSectionMesh,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  setMeshPositions(geometry, mesh);
  setMeshNormals(geometry, mesh);
  setMeshUvs(geometry, mesh);
  setMeshIndices(geometry, mesh.triangles);
  geometry.computeBoundingSphere();
  return geometry;
}

export function createWaterMeshGeometry(
  mesh: TunnelSectionMesh,
  showWater: boolean,
): THREE.BufferGeometry | null {
  if (!showWater || mesh.numPoints === 0) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  setMeshPositions(geometry, mesh);
  setMeshUvs(geometry, mesh);
  setMeshIndices(geometry, mesh.triangles);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function getTunnelCenterFromSpline(
  tunnelData: TunnelData,
): THREE.Vector3 {
  if (tunnelData.splinePoints.length === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  const midPoint =
    tunnelData.splinePoints[Math.floor(tunnelData.splinePoints.length / 2)];
  if (!midPoint) {
    return new THREE.Vector3(0, 0, 0);
  }

  return new THREE.Vector3(
    midPoint.point.x,
    midPoint.point.y,
    midPoint.point.z,
  );
}

export function getTunnelItemPosition(
  tunnelData: TunnelData,
  splineIndex: number,
  offset: { x: number; y: number; z: number },
): THREE.Vector3 | null {
  const splinePoint = tunnelData.splinePoints[splineIndex];
  if (!splinePoint) {
    return null;
  }

  return new THREE.Vector3(
    splinePoint.point.x + offset.x,
    splinePoint.point.y + offset.y,
    splinePoint.point.z + offset.z,
  );
}
