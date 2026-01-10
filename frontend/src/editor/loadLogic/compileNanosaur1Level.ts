import { LevelData } from "../../python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "../../data/processors/classicProprocessor";
import { Result, ok, err } from "../../types/result";
import { RawNanosaurItem } from "./nanosaurInterfaces";
import { isRawNanosaurItem, isRawNanosaurAttribute } from "./typeGuards";

/**
 * Compile a Nanosaur 1 level from LevelData back to binary format
 * 
 * @param levelData - The LevelData structure
 * @param rawLevelData - The original raw level data (for preservation of binary-specific data)
 * @returns Result containing the ArrayBuffer with binary .ter file data, or error
 */
export function compileNanosaur1Level(
  levelData: LevelData,
  rawLevelData: Nanosaur1LevelData
): Result<ArrayBuffer, Error> {
  try {
    // 1. Calculate section sizes
    
    // Header size
    const headerSize = 40; // 10 int32 fields + 2 uint16 fields = 36 bytes?
    // struct Nanosaur1LevelHeader {
    //   int32 textureLayerOffset; (0)
    //   int32 heightmapLayerOffset; (4)
    //   int32 pathLayerOffset; (8)
    //   int32 objectListOffset; (12)
    //   int32 unknown1; (16)
    //   int32 heightmapTilesOffset; (20)
    //   int32 unknown2; (24)
    //   uint16 width; (28)
    //   uint16 depth; (30)
    //   int32 textureAttribOffset; (32)
    //   int32 tileAnimDataOffset; (36)
    // }
    // Total header size = 40 bytes

    const mapWidth = rawLevelData.header.width;
    const mapHeight = rawLevelData.header.depth; // depth is the Z-axis (height in 2D view)
    const layerSizeInTiles = mapWidth * mapHeight;

    // Texture Layer (Uint16)
    const textureLayerSize = layerSizeInTiles * 2;

    // Heightmap Layer (Uint16)
    // Note: Parsing logic treats this as optional, but original files seem to have it
    // If rawLevelData has it, we include it.
    const heightmapLayerSize = rawLevelData.heightmapLayer ? layerSizeInTiles * 2 : 0;

    // Path Layer (Uint16)
    const pathLayerSize = rawLevelData.pathLayer ? layerSizeInTiles * 2 : 0;

    // Object List
    // Starts with int32 count, then items
    const numItems = levelData.Itms?.[1000]?.obj?.length || 0;
    // Struct size from parse logic: 20 bytes
    //  x: uint16
    //  y: uint16
    //  type: uint16
    //  parm: byte[4]
    //  flags: uint16
    //  prevItemIdx: int32
    //  nextItemIdx: int32
    //  Total: 2+2+2+4+2+4+4 = 20 bytes
    const objectListSize = 4 + (numItems * 20);

    // Heightmap Tiles (32x32 bytes each)
    const heightmapTiles = rawLevelData.heightmapTiles || [];
    const heightmapPaddingSize = rawLevelData.heightmapPadding?.length || 0;
    const heightmapTilesSize = (heightmapTiles.length * 32 * 32) + heightmapPaddingSize;

    // Texture Attributes
    // Struct size: 8 bytes
    //  bits: uint16
    //  parm0: int16
    //  parm1: uint8
    //  parm2: uint8
    //  undefined: int16
    //  Total: 2+2+1+1+2 = 8 bytes
    //
    // The parsing logic calculates count from (tileAnimDataOffset - textureAttribOffset) / 8
    // We can assume we preserve the original attributes if not edited
    // For now, let's use the ones from LevelData.Atrb or rawLevelData
    const textureAttribs = levelData.Atrb?.[1000]?.obj || [];
    const textureAttribsSize = textureAttribs.length * 8;

    // Tile Anim Data (Preserved blob)
    const tileAnimData = rawLevelData.tileAnimData || new Uint8Array(0);
    const tileAnimDataSize = tileAnimData.length;

    // Calculate Offsets
    // Order based on standard Nanosaur files seems to vary, but we can enforce a safe order.
    // Usually: Header -> TextureLayer -> HeightmapLayer -> PathLayer -> Objects -> HeightmapTiles -> Attribs
    //
    // Let's inspect the offsets from one of the tests if possible, but for roundtrip,
    // as long as offsets point to valid data, it should be fine.
    
    let currentOffset = headerSize;

    const textureLayerOffset = currentOffset;
    currentOffset += textureLayerSize;

    const heightmapLayerOffset = rawLevelData.heightmapLayer ? currentOffset : 0;
    currentOffset += heightmapLayerSize;

    const pathLayerOffset = rawLevelData.pathLayer ? currentOffset : 0;
    currentOffset += pathLayerSize;

    const objectListOffset = currentOffset;
    currentOffset += objectListSize;

    const heightmapTilesOffset = heightmapTilesSize > 0 ? currentOffset : 0;
    currentOffset += heightmapTilesSize;

    const textureAttribOffset = textureAttribsSize > 0 ? currentOffset : 0;
    currentOffset += textureAttribsSize;

    // tileAnimDataOffset seems to be end of file or start of next section?
    // Parse logic: const itemCount = Math.floor((header.tileAnimDataOffset - header.textureAttribOffset) / 8);
    // So tileAnimDataOffset must mark the END of the attribs section.
    const tileAnimDataOffset = currentOffset;

    currentOffset += tileAnimDataSize;

    // Total size
    const totalSize = currentOffset;

    console.log(`[Compile] Calculated sizes:`);
    console.log(`  Header: ${headerSize}`);
    console.log(`  TextureLayer: ${textureLayerSize}`);
    console.log(`  HeightmapLayer: ${heightmapLayerSize}`);
    console.log(`  PathLayer: ${pathLayerSize}`);
    console.log(`  ObjectList: ${objectListSize}`);
    console.log(`  HeightmapTiles: ${heightmapTilesSize} (Tiles: ${heightmapTiles.length}, Padding: ${heightmapPaddingSize})`);
    console.log(`  TextureAttribs: ${textureAttribsSize}`);
    console.log(`  TileAnimData: ${tileAnimDataSize}`);
    console.log(`  Total: ${totalSize}`);

    // 2. Write Data
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // -- Header --
    view.setInt32(0, textureLayerOffset, false);
    view.setInt32(4, heightmapLayerOffset, false);
    view.setInt32(8, pathLayerOffset, false);
    view.setInt32(12, objectListOffset, false);
    view.setInt32(16, rawLevelData.header.unknown1, false); // Preserve unknown
    view.setInt32(20, heightmapTilesOffset, false);
    view.setInt32(24, rawLevelData.header.unknown2, false); // Preserve unknown
    view.setUint16(28, mapWidth, false);
    view.setUint16(30, mapHeight, false);
    view.setInt32(32, textureAttribOffset, false);
    view.setInt32(36, tileAnimDataOffset, false);

    // -- Texture Layer --
    // We should take this from LevelData.Layr if edited, otherwise fallback to raw
    // LevelData.Layr is number[], raw is number[]
    const textureLayer = levelData.Layr?.[1000]?.obj || rawLevelData.textureLayer;
    if (textureLayer.length !== layerSizeInTiles) {
        return err(new Error(`Texture layer size mismatch. Expected ${layerSizeInTiles}, got ${textureLayer.length}`));
    }

    let writePtr = textureLayerOffset;
    for(let i=0; i<textureLayer.length; i++) {
        view.setUint16(writePtr + (i*2), textureLayer[i], false);
    }

    // -- Heightmap Layer --
    if (heightmapLayerOffset > 0 && rawLevelData.heightmapLayer) {
        writePtr = heightmapLayerOffset;
        for(let i=0; i<rawLevelData.heightmapLayer.length; i++) {
            view.setUint16(writePtr + (i*2), rawLevelData.heightmapLayer[i], false);
        }
    }

    // -- Path Layer --
    if (pathLayerOffset > 0 && rawLevelData.pathLayer) {
        writePtr = pathLayerOffset;
        for(let i=0; i<rawLevelData.pathLayer.length; i++) {
            view.setUint16(writePtr + (i*2), rawLevelData.pathLayer[i], false);
        }
    }

    // -- Object List --
    writePtr = objectListOffset;
    view.setInt32(writePtr, numItems, false);
    writePtr += 4;

    const items = levelData.Itms?.[1000]?.obj || [];
    for (let i = 0; i < numItems; i++) {
      const item = items[i];
      // We stored non-standard fields in nanosaur1LevelToLevelData
      // so we use a type guard to access them safely.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const rawItem = isRawNanosaurItem(item) ? item : (item as unknown as RawNanosaurItem);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any
      const x = isRawNanosaurItem(item) ? item.x : (item as any).x || 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any
      const y = isRawNanosaurItem(item) ? (item.y ?? item.z) : (item as any).z || 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any
      const type = isRawNanosaurItem(item) ? item.type : (item as any).type || 0;
      const parm = isRawNanosaurItem(item) ? item.parm : undefined;
      const flags = isRawNanosaurItem(item) ? item.flags : 0;
      const prev = isRawNanosaurItem(item) ? item.prevItemIdx : -1;
      const next = isRawNanosaurItem(item) ? item.nextItemIdx : -1;


      view.setUint16(writePtr, Math.round(x), false);
      view.setUint16(writePtr + 2, Math.round(y ?? 0), false);
      view.setUint16(writePtr + 4, type, false);
      
      if (parm && Array.isArray(parm)) {
          view.setUint8(writePtr + 6, parm[0]);
          view.setUint8(writePtr + 7, parm[1]);
          view.setUint8(writePtr + 8, parm[2]);
          view.setUint8(writePtr + 9, parm[3]);
      } else {
          view.setUint8(writePtr + 6, 0);
          view.setUint8(writePtr + 7, 0);
          view.setUint8(writePtr + 8, 0);
          view.setUint8(writePtr + 9, 0);
      }

      view.setUint16(writePtr + 10, flags || 0, false);
      view.setInt32(writePtr + 12, prev ?? -1, false);
      view.setInt32(writePtr + 16, next ?? -1, false);
      view.setUint16(writePtr + 2, Math.round(rawItem.y ?? rawItem.z ?? 0), false); // Prefer y if preserved, else z
      view.setUint16(writePtr + 4, rawItem.type, false);

      if (rawItem.parm && Array.isArray(rawItem.parm)) {
          view.setUint8(writePtr + 6, rawItem.parm[0]);
          view.setUint8(writePtr + 7, rawItem.parm[1]);
          view.setUint8(writePtr + 8, rawItem.parm[2]);
          view.setUint8(writePtr + 9, rawItem.parm[3]);
      } else {
          view.setUint8(writePtr + 6, 0);
          view.setUint8(writePtr + 7, 0);
          view.setUint8(writePtr + 8, 0);
          view.setUint8(writePtr + 9, 0);
      }

      view.setUint16(writePtr + 10, rawItem.flags || 0, false);
      view.setInt32(writePtr + 12, rawItem.prevItemIdx ?? -1, false);
      view.setInt32(writePtr + 16, rawItem.nextItemIdx ?? -1, false);

      writePtr += 20;
    }

    // -- Heightmap Tiles --
    if (heightmapTilesOffset > 0) {
        writePtr = heightmapTilesOffset;
        for (const tile of heightmapTiles) {
            for(const byte of tile) {
                view.setUint8(writePtr, byte);
                writePtr++;
            }
        }

        // Write preserved heightmap padding if any
        if (rawLevelData.heightmapPadding && rawLevelData.heightmapPadding.length > 0) {
            for (const byte of rawLevelData.heightmapPadding) {
                view.setUint8(writePtr, byte);
                writePtr++;
            }
        }
    }

    // -- Texture Attributes --
    if (textureAttribOffset > 0) {
        writePtr = textureAttribOffset;
        for (const attr of textureAttribs) {
             let bits = 0;
             let parm0 = 0;
             let parm1 = 0;
             let parm2 = 0;
             let undef = 0;

             if (isRawNanosaurAttribute(attr)) {
                 bits = attr.bits || 0;
                 parm0 = attr.parm0 || 0;
                 parm1 = attr.parm1 || 0;
                 parm2 = attr.parm2 || 0;
                 undef = attr.undefined || 0;
             }

             view.setUint16(writePtr, bits, false);
             view.setInt16(writePtr + 2, parm0, false);
             view.setUint8(writePtr + 4, parm1);
             view.setUint8(writePtr + 5, parm2);
             view.setInt16(writePtr + 6, undef, false);
             writePtr += 8;
        }
    }

    // -- Tile Anim Data --
    if (tileAnimDataSize > 0) {
        writePtr = tileAnimDataOffset;
        for (let i = 0; i < tileAnimDataSize; i++) {
            view.setUint8(writePtr + i, tileAnimData[i]);
        }
    }

    return ok(buffer);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
