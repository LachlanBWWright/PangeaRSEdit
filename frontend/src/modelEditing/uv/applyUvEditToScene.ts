import { Group, Mesh, BufferGeometry, BufferAttribute } from "three";
import type { UvLayout } from "./uvTypes";

/**
 * Write transformed UV layout back into Three.js geometry attributes.
 * Matches meshes by name. Does not return a new scene — mutates in place
 * because Three.js attributes must be mutated to trigger GPU upload.
 */
export function applyUvEditToScene(scene: Group, layout: UvLayout): void {
  const meshLayoutByGeometryIndex = new Map(
    layout.meshes.map((mesh) => [mesh.geometryIndex, mesh]),
  );
  let geometryIndex = 0;

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const currentGeometryIndex = geometryIndex;
    geometryIndex += 1;

    const meshLayout = meshLayoutByGeometryIndex.get(currentGeometryIndex);
    if (!meshLayout) return;

    const geometry = object.geometry;
    if (!(geometry instanceof BufferGeometry)) return;

    const uvAttr = geometry.getAttribute("uv");
    if (!uvAttr || !(uvAttr instanceof BufferAttribute)) return;

    const count = Math.min(uvAttr.count, meshLayout.vertices.length);
    for (let i = 0; i < count; i++) {
      const v = meshLayout.vertices[i];
      if (!v) continue;
      uvAttr.setXY(i, v.u, v.v);
    }

    uvAttr.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });
}
