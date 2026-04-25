import { ok, type Result } from "neverthrow";
import {
  ShaderUVBoundary,
  TQ3MetaFile,
  TQ3TextureShader,
  TQ3TriMeshData,
  TQ3TriMeshFlatGroup,
} from "./types";
import {
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterial,
  BG3DMaterialFlags,
  BG3DParseResult,
} from "../parseBG3D";
import {
  bg3dGeometryToTriMesh,
  bg3dTextureToPixmap,
  extractGeometriesFromNode,
  textureShaderToBG3DMaterial,
  triMeshToBG3DGeometry,
} from "./convertHelpers";

export function metaFileToBG3DParseResult(
  metaFile: TQ3MetaFile,
): Result<BG3DParseResult, string> {
  const materials: BG3DMaterial[] = [
    {
      flags: 0,
      diffuseColor: [1, 1, 1, 1],
      textures: [],
    },
  ];
  const textureToMaterialMap = new Map<number, number>();

  for (let i = 0; i < metaFile.numTextures; i++) {
    const shader = metaFile.textures[i];
    if (!shader) continue;

    let meshWithTexture: TQ3TriMeshData | null = null;
    for (const mesh of metaFile.meshes) {
      if (mesh && mesh.internalTextureID === i) {
        meshWithTexture = mesh;
        break;
      }
    }

    textureToMaterialMap.set(i, materials.length);
    materials.push(textureShaderToBG3DMaterial(shader, meshWithTexture));
  }

  const rootGroup: BG3DGroup = { children: [] };
  const groups: BG3DGroup[] = [rootGroup];

  for (let groupIdx = 0; groupIdx < metaFile.numTopLevelGroups; groupIdx++) {
    const group = metaFile.topLevelGroups[groupIdx];
    if (!group) continue;

    const bg3dGroup: BG3DGroup = { children: [] };
    for (let meshIdx = 0; meshIdx < group.numMeshes; meshIdx++) {
      const mesh = group.meshes[meshIdx];
      if (!mesh) continue;

      const geometry = triMeshToBG3DGeometry(mesh);
      if (mesh.internalTextureID >= 0) {
        const materialIdx = textureToMaterialMap.get(mesh.internalTextureID);
        if (materialIdx !== undefined)
          geometry.layerMaterialNum[0] = materialIdx;
      }
      bg3dGroup.children.push(geometry);
    }

    rootGroup.children.push(bg3dGroup);
  }

  if (metaFile.numTopLevelGroups === 0 && metaFile.numMeshes > 0) {
    for (const mesh of metaFile.meshes) {
      if (!mesh) continue;
      const geometry = triMeshToBG3DGeometry(mesh);
      if (mesh.internalTextureID >= 0) {
        const materialIdx = textureToMaterialMap.get(mesh.internalTextureID);
        if (materialIdx !== undefined)
          geometry.layerMaterialNum[0] = materialIdx;
      }
      rootGroup.children.push(geometry);
    }
  }

  return ok({ materials, groups });
}

export function bg3dParseResultToMetaFile(
  parsed: BG3DParseResult,
): Result<TQ3MetaFile, string> {
  const metaFile: TQ3MetaFile = {
    numTextures: 0,
    textures: [],
    numMeshes: 0,
    meshes: [],
    numTopLevelGroups: 0,
    topLevelGroups: [],
  };

  const materialToTextureMap = new Map<number, number>();

  for (let i = 0; i < parsed.materials.length; i++) {
    const material = parsed.materials[i];
    if (!material || material.textures.length === 0) continue;

    const texture = material.textures[0];
    if (!texture) continue;

    const shader: TQ3TextureShader = {
      pixmap: bg3dTextureToPixmap(texture),
      boundaryU:
        material.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_U
          ? ShaderUVBoundary.Clamp
          : ShaderUVBoundary.Wrap,
      boundaryV:
        material.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_V
          ? ShaderUVBoundary.Clamp
          : ShaderUVBoundary.Wrap,
    };

    materialToTextureMap.set(i, metaFile.numTextures);
    metaFile.textures.push(shader);
    metaFile.numTextures++;
  }

  for (const group of parsed.groups) {
    if (!group) continue;

    const flatGroup: TQ3TriMeshFlatGroup = {
      numMeshes: 0,
      meshes: [],
    };

    const geometries: BG3DGeometry[] = extractGeometriesFromNode(group);

    for (const geometry of geometries) {
      const materialIdx = geometry.layerMaterialNum?.[0] ?? 0;
      const textureIdx = materialToTextureMap.get(materialIdx) ?? -1;
      const mesh = bg3dGeometryToTriMesh(geometry, textureIdx);

      const material = parsed.materials[materialIdx];
      if (material) {
        mesh.diffuseColor = {
          r: material.diffuseColor[0],
          g: material.diffuseColor[1],
          b: material.diffuseColor[2],
          a: material.diffuseColor[3],
        };
      }

      flatGroup.meshes.push(mesh);
      flatGroup.numMeshes++;
      metaFile.meshes.push(mesh);
      metaFile.numMeshes++;
    }

    if (flatGroup.numMeshes > 0) {
      metaFile.topLevelGroups.push(flatGroup);
      metaFile.numTopLevelGroups++;
    }
  }

  return ok(metaFile);
}
