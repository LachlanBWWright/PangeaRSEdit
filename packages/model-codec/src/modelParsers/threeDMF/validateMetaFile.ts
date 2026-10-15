import { err, ok, type Result } from "neverthrow";
import { PixelType, type TQ3MetaFile, type TQ3TriMeshData } from "./types";

function validateMesh(mesh: TQ3TriMeshData, textureCount: number): Result<void, string> {
  if (mesh.numPoints !== mesh.points.length || mesh.numTriangles !== mesh.triangles.length) {
    return err("3DMF mesh counts do not match their arrays");
  }
  for (const attributes of [mesh.vertexNormals, mesh.vertexUVs, mesh.vertexColors]) {
    if (attributes !== null && attributes.length !== mesh.numPoints) return err("3DMF vertex attribute count does not match points");
  }
  for (const triangle of mesh.triangles) {
    if (triangle.pointIndices.some(index => !Number.isInteger(index) || index < 0 || index >= mesh.numPoints)) {
      return err("3DMF triangle references an invalid point");
    }
  }
  const coordinates = [...mesh.points, mesh.bBox.min, mesh.bBox.max];
  if (coordinates.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z))) {
    return err("3DMF points and bounds must be finite");
  }
  if (!Number.isInteger(mesh.internalTextureID) || mesh.internalTextureID < -1 || mesh.internalTextureID >= textureCount) {
    return err("3DMF mesh references an invalid texture");
  }
  return ok(undefined);
}

export function validateMetaFile(metaFile: TQ3MetaFile): Result<void, string> {
  if (metaFile.numMeshes !== metaFile.meshes.length || metaFile.numTextures !== metaFile.textures.length
    || metaFile.numTopLevelGroups !== metaFile.topLevelGroups.length) return err("3DMF file counts do not match their arrays");
  if (metaFile.topLevelGroups.length > 0
    && metaFile.topLevelGroups.reduce((total, group) => total + group.numMeshes, 0) !== metaFile.numMeshes) {
    return err("3DMF group membership does not account for all meshes");
  }
  for (const group of metaFile.topLevelGroups) {
    if (group.numMeshes !== group.meshes.length) return err("3DMF group count does not match its meshes");
    for (const mesh of group.meshes) {
      const validated = validateMesh(mesh, metaFile.numTextures);
      if (validated.isErr()) return validated;
    }
  }
  for (const mesh of metaFile.meshes) {
    const validated = validateMesh(mesh, metaFile.numTextures);
    if (validated.isErr()) return validated;
  }
  for (const shader of metaFile.textures) {
    const pixmap = shader.pixmap;
    if (pixmap === null) continue;
    const bytesPerPixel = pixmap.pixelType === PixelType.RGB16 || pixmap.pixelType === PixelType.ARGB16 ? 2
      : pixmap.pixelType === PixelType.RGB32 || pixmap.pixelType === PixelType.ARGB32 ? 4 : 0;
    if (bytesPerPixel === 0) return err("Unsupported 3DMF texture pixel type");
    if (![pixmap.width, pixmap.height, pixmap.rowBytes].every(value => Number.isSafeInteger(value) && value >= 0)
      || pixmap.rowBytes < pixmap.width * bytesPerPixel || pixmap.rowBytes * pixmap.height !== pixmap.image.length) {
      return err("3DMF texture dimensions do not match image data");
    }
  }
  return ok(undefined);
}
