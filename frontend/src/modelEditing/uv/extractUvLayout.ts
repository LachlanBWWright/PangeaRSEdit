import { Group, Mesh, BufferGeometry } from "three";
import { ok, err, type Result } from "neverthrow";
import type { UvFace, UvLayout, UvMeshLayout, UvVertex } from "./uvTypes";

function extractUvMeshLayout(
  mesh: Mesh,
  textureNameHint: string,
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
    meshName: mesh.name || textureNameHint,
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
  textureName: string,
): Result<UvLayout, string> {
  const meshes: UvMeshLayout[] = [];

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    const usesTexture = materials.some(
      (mat) =>
        mat && (mat.name === textureName || mat.name.includes(textureName)),
    );

    if (!usesTexture && meshes.length === 0) {
      // Fallback: include all meshes with UV data if no material name match
      const layout = extractUvMeshLayout(object, textureName);
      if (layout && layout.vertices.length > 0) {
        // Don't add yet — we prefer material-matched meshes
      }
      return;
    }

    if (usesTexture) {
      const layout = extractUvMeshLayout(object, textureName);
      if (layout && layout.vertices.length > 0) {
        meshes.push(layout);
      }
    }
  });

  // If no material-matched meshes, gather all meshes with UVs as fallback
  if (meshes.length === 0) {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const layout = extractUvMeshLayout(object, textureName);
      if (layout && layout.vertices.length > 0) {
        meshes.push(layout);
      }
    });
  }

  if (meshes.length === 0) {
    return err(`No UV data found for texture: ${textureName}`);
  }

  return ok({ textureName, meshes });
}
