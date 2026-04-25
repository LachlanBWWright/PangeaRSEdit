import { ok } from "neverthrow";
import { Result } from "neverthrow";
import { BigEndianWriter } from "./binaryUtils";
import { CHUNK_3DMF, CHUNK_BGNG, CHUNK_ENDG, TQ3MetaFile } from "./types";
import { writeMeshContainer } from "./write3DMFHelpers";

export function write3DMFFromMetaFile(
  metaFile: TQ3MetaFile,
): Result<ArrayBuffer, string> {
  const writer = new BigEndianWriter(1024 * 1024);
  const textureOffsets = new Map<number, number>();

  writer.writeUint32(CHUNK_3DMF);
  writer.writeUint32(16);
  writer.writeUint16(1);
  writer.writeUint16(5);
  writer.writeUint32(0);
  writer.writeUint64(0);

  for (let groupIdx = 0; groupIdx < metaFile.numTopLevelGroups; groupIdx++) {
    const group = metaFile.topLevelGroups[groupIdx];
    if (!group) continue;

    writer.writeUint32(CHUNK_BGNG);
    const groupSizePos = writer.tell();
    writer.writeUint32(0);

    for (let meshIdx = 0; meshIdx < group.numMeshes; meshIdx++) {
      const mesh = group.meshes[meshIdx];
      if (!mesh) continue;
      writeMeshContainer(writer, mesh, metaFile.textures, textureOffsets);
    }

    writer.writeUint32(CHUNK_ENDG);
    writer.writeUint32(0);

    const savedPos = writer.tell();
    writer.goto(groupSizePos);
    writer.writeUint32(0);
    writer.goto(savedPos);
  }

  if (metaFile.numTopLevelGroups === 0 && metaFile.numMeshes > 0) {
    for (let meshIdx = 0; meshIdx < metaFile.numMeshes; meshIdx++) {
      const mesh = metaFile.meshes[meshIdx];
      if (!mesh) continue;
      writeMeshContainer(writer, mesh, metaFile.textures, textureOffsets);
    }
  }

  return ok(writer.getBuffer());
}
