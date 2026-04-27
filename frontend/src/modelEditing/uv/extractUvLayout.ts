import { Group, Mesh, BufferGeometry } from "three";
import { ok, err, type Result } from "neverthrow";
import type { UvFace, UvLayout, UvMeshLayout, UvVertex } from "./uvTypes";

interface UvTextureTarget {
  readonly name: string;
  readonly material?: string;
}

function normalizeMaterialToken(token: string): string {
  const materialMatch = /material[_\s-]*(\d+)/i.exec(token);
  if (materialMatch?.[1]) {
    return `material-${Number(materialMatch[1])}`;
  }

  return token.trim().toLowerCase();
}

function getSearchMaterialKey(target: UvTextureTarget): string {
  if (target.material) {
    return normalizeMaterialToken(target.material);
  }

  return normalizeMaterialToken(target.name);
}

function extractUvMeshLayout(
  mesh: Mesh,
  geometryIndex: number,
): UvMeshLayout | null {
  const geometry = mesh.geometry;
  if (!(geometry instanceof BufferGeometry)) {
    return null;
  }

  const uvAttr =
    geometry.getAttribute("uv") ?? geometry.getAttribute("TEXCOORD_0");
  const indexAttr = geometry.getIndex();

  if (!uvAttr) {
    return null;
  }

  const vertices: UvVertex[] = [];
  for (let i = 0; i < uvAttr.count; i++) {
    vertices.push({ u: uvAttr.getX(i), v: uvAttr.getY(i) });
  }

  const faces: UvFace[] = [];
  if (indexAttr) {
    for (let i = 0; i + 2 < indexAttr.count; i += 3) {
      faces.push({
        vertexIndices: [
          indexAttr.getX(i),
          indexAttr.getX(i + 1),
          indexAttr.getX(i + 2),
        ],
      });
    }
  } else {
    for (let i = 0; i + 2 < uvAttr.count; i += 3) {
      faces.push({ vertexIndices: [i, i + 1, i + 2] });
    }
  }

  return {
    meshId: `mesh-${geometryIndex}`,
    meshName: mesh.name || `Mesh ${geometryIndex + 1}`,
    geometryIndex,
    vertices,
    faces,
  };
}

/**
 * Extract UV layout for a specific texture from the Three.js scene.
 * Collects UV data from all meshes whose material name matches the texture name.
 */
export function extractUvLayout(
  scene: Group,
  target: UvTextureTarget,
): Result<UvLayout, string> {
  const meshes: UvMeshLayout[] = [];
  const searchMaterialKey = getSearchMaterialKey(target);
  let geometryIndex = 0;

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const currentGeometryIndex = geometryIndex;
    geometryIndex += 1;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    const usesTexture = materials.some(
      (material) =>
        material !== null &&
        material !== undefined &&
        normalizeMaterialToken(material.name) === searchMaterialKey,
    );

    if (usesTexture) {
      const layout = extractUvMeshLayout(object, currentGeometryIndex);
      if (layout && layout.vertices.length > 0) {
        meshes.push(layout);
      }
    }
  });

  if (meshes.length === 0) {
    return err(
      `No UV data found for ${target.name} using material ${target.material ?? "unknown"}`,
    );
  }

  return ok({
    textureName: target.name,
    materialName: target.material,
    meshes,
  });
}
