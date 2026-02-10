import { LevelData } from "../../python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "../../data/processors/classicProprocessor";
import { Result, ok } from "../../types/result";
import { isRawNanosaurAttribute, isRawNanosaurItem } from "./typeGuards";

/**
 * Compile a Nanosaur 1 level from LevelData back to binary format.
 *
 * Reads editable fields (items, texture layer) from levelData so that
 * editor changes are reflected. Non-editable binary sections (heightmap tiles,
 * path layer, tile anim data) come from rawLevelData.
 */
export function compileNanosaur1Level(
  levelData: LevelData,
  rawLevelData: Nanosaur1LevelData,
): Result<ArrayBuffer, Error> {
  const header = rawLevelData.header;
    const mapWidth = header.width;
    const mapHeight = header.depth;
    const layerSizeInTiles = mapWidth * mapHeight;

    // Use original header offsets to preserve exact layout
    const textureLayerOffset = header.textureLayerOffset;
    const heightmapLayerOffset = header.heightmapLayerOffset;
    const pathLayerOffset = header.pathLayerOffset;
    const objectListOffset = header.objectListOffset;
    const heightmapTilesOffset = header.heightmapTilesOffset;
    const textureAttribOffset = header.textureAttribOffset;
    const tileAnimDataOffset = header.tileAnimDataOffset;

    // Calculate total file size from the last section end
    const tileAnimData = rawLevelData.tileAnimData ?? new Uint8Array(0);
    const totalSize = tileAnimDataOffset + tileAnimData.length;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // -- Header (40 bytes) --
    view.setInt32(0, textureLayerOffset, false);
    view.setInt32(4, heightmapLayerOffset, false);
    view.setInt32(8, pathLayerOffset, false);
    view.setInt32(12, objectListOffset, false);
    view.setInt32(16, header.unknown1, false);
    view.setInt32(20, heightmapTilesOffset, false);
    view.setInt32(24, header.unknown2, false);
    view.setUint16(28, mapWidth, false);
    view.setUint16(30, mapHeight, false);
    view.setInt32(32, textureAttribOffset, false);
    view.setInt32(36, tileAnimDataOffset, false);

    // -- Texture Layer: prefer LevelData Layr, fall back to rawLevelData --
    if (textureLayerOffset > 0) {
      const editorLayer = levelData.Layr?.[1000]?.obj;
      const textureLayer =
        Array.isArray(editorLayer) && editorLayer.length === layerSizeInTiles
          ? editorLayer
          : rawLevelData.textureLayer;
      for (let i = 0; i < layerSizeInTiles; i++) {
        view.setUint16(textureLayerOffset + i * 2, textureLayer[i] ?? 0, false);
      }
    }

    // -- Heightmap Layer (not editable in editor) --
    if (heightmapLayerOffset > 0 && rawLevelData.heightmapLayer) {
      for (let i = 0; i < rawLevelData.heightmapLayer.length; i++) {
        view.setUint16(
          heightmapLayerOffset + i * 2,
          rawLevelData.heightmapLayer[i] ?? 0,
          false,
        );
      }
    }

    // -- Path Layer (not editable in editor) --
    if (pathLayerOffset > 0 && rawLevelData.pathLayer) {
      for (let i = 0; i < rawLevelData.pathLayer.length; i++) {
        view.setUint16(
          pathLayerOffset + i * 2,
          rawLevelData.pathLayer[i] ?? 0,
          false,
        );
      }
    }

    // -- Object List: prefer LevelData Itms, fall back to rawLevelData --
    if (objectListOffset > 0) {
      const editorItems = levelData.Itms?.[1000]?.obj;
      if (Array.isArray(editorItems) && editorItems.length > 0) {
        // Use editor items - convert back to binary format
        view.setInt32(objectListOffset, editorItems.length, false);
        let writePtr = objectListOffset + 4;
        for (const item of editorItems) {
          if (!isRawNanosaurItem(item)) continue;
          view.setUint16(writePtr, item.x ?? 0, false);
          view.setUint16(writePtr + 2, item.y ?? item.z ?? 0, false);
          view.setUint16(writePtr + 4, item.type ?? 0, false);
          if (item.parm) {
            view.setUint8(writePtr + 6, item.parm[0] ?? 0);
            view.setUint8(writePtr + 7, item.parm[1] ?? 0);
            view.setUint8(writePtr + 8, item.parm[2] ?? 0);
            view.setUint8(writePtr + 9, item.parm[3] ?? 0);
          } else {
            view.setUint8(writePtr + 6, 0);
            view.setUint8(writePtr + 7, 0);
            view.setUint8(writePtr + 8, 0);
            view.setUint8(writePtr + 9, 0);
          }
          view.setUint16(writePtr + 10, item.flags ?? 0, false);
          view.setInt32(writePtr + 12, item.prevItemIdx ?? 0, false);
          view.setInt32(writePtr + 16, item.nextItemIdx ?? 0, false);
          writePtr += 20;
        }
      } else {
        // Fall back to raw items
        const items = rawLevelData.objectList;
        view.setInt32(objectListOffset, items.length, false);
        let writePtr = objectListOffset + 4;
        for (const item of items) {
          view.setUint16(writePtr, item.x, false);
          view.setUint16(writePtr + 2, item.y, false);
          view.setUint16(writePtr + 4, item.type, false);
          if (item.parm) {
            view.setUint8(writePtr + 6, item.parm[0]);
            view.setUint8(writePtr + 7, item.parm[1]);
            view.setUint8(writePtr + 8, item.parm[2]);
            view.setUint8(writePtr + 9, item.parm[3]);
          } else {
            view.setUint8(writePtr + 6, 0);
            view.setUint8(writePtr + 7, 0);
            view.setUint8(writePtr + 8, 0);
            view.setUint8(writePtr + 9, 0);
          }
          view.setUint16(writePtr + 10, item.flags, false);
          view.setInt32(writePtr + 12, item.prevItemIdx, false);
          view.setInt32(writePtr + 16, item.nextItemIdx, false);
          writePtr += 20;
        }
      }
    }

    // -- Heightmap Tiles (not editable in editor) --
    if (heightmapTilesOffset > 0 && rawLevelData.heightmapTiles) {
      let writePtr = heightmapTilesOffset;
      for (const tile of rawLevelData.heightmapTiles) {
        for (const byte of tile) {
          view.setUint8(writePtr, byte);
          writePtr++;
        }
      }

      // Write preserved heightmap padding
      if (rawLevelData.heightmapPadding) {
        for (const byte of rawLevelData.heightmapPadding) {
          view.setUint8(writePtr, byte);
          writePtr++;
        }
      }
    }

    // -- Texture Attributes: prefer LevelData Atrb, fall back to rawLevelData --
    if (textureAttribOffset > 0) {
      const editorAttribs = levelData.Atrb?.[1000]?.obj;
      const textureAttribs =
        Array.isArray(editorAttribs) &&
        editorAttribs.length === rawLevelData.textureAttributes.length
          ? editorAttribs
          : rawLevelData.textureAttributes;
      let writePtr = textureAttribOffset;
      for (const attr of textureAttribs) {
        if (isRawNanosaurAttribute(attr)) {
          view.setUint16(writePtr, attr.bits ?? 0, false);
          view.setInt16(writePtr + 2, attr.parm0 ?? 0, false);
          view.setUint8(writePtr + 4, attr.parm1 ?? 0);
          view.setUint8(writePtr + 5, attr.parm2 ?? 0);
          view.setInt16(writePtr + 6, attr.undefined ?? 0, false);
        }
        writePtr += 8;
      }
    }

    // -- Tile Anim Data (not editable in editor) --
    if (tileAnimData.length > 0) {
      for (let i = 0; i < tileAnimData.length; i++) {
        view.setUint8(tileAnimDataOffset + i, tileAnimData[i] ?? 0);
      }
    }

  return ok(buffer);
}
