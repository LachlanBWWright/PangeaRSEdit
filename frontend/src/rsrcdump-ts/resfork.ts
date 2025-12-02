// Resource fork parsing

import type { Resource, ResourceFork } from "./types";
import { sanitizeTypeName } from "./textio";

export class ResourceForkParser {
  static fromBytes(data: Uint8Array): ResourceFork {
    if (data.length === 0) {
      return {
        resources: new Map(),
        fileAttributes: 0,
        junkNextresmap: 0,
        junkFilerefnum: 0,
      };
    }

    if (data.length < 16) {
      throw new Error(
        "data is too small to contain a valid resource fork header",
      );
    }

    const view = new DataView(data.buffer, data.byteOffset);

    // Read resource header
    const dataOffset = view.getUint32(0, false);
    const mapOffset = view.getUint32(4, false);
    const dataLength = view.getUint32(8, false);
    const mapLength = view.getUint32(12, false);

    if (
      dataOffset + dataLength > data.length ||
      mapOffset + mapLength > data.length
    ) {
      throw new Error(
        "Invalid resource fork: offsets/lengths in header are nonsense",
      );
    }

    // Create views for data and map sections
    const mapData = new Uint8Array(
      data.buffer,
      data.byteOffset + mapOffset,
      mapLength,
    );
    const mapView = new DataView(mapData.buffer, mapData.byteOffset);

    // Read map header - skip copy of resource header (16 bytes)
    let pos = 16;
    const junkNextresmap = mapView.getUint32(pos, false);
    pos += 4;
    const junkFilerefnum = mapView.getUint16(pos, false);
    pos += 2;
    const fileAttributes = mapView.getUint16(pos, false);
    pos += 2;
    const typeListOffsetInMap = mapView.getUint16(pos, false);
    pos += 2;
    const nameListOffsetInMap = mapView.getUint16(pos, false);
    pos += 2;
    let numTypes = mapView.getUint16(pos, false) + 1;
    pos += 2;

    const resources = new Map<string, Map<number, Resource>>();

    // Read type list - positioned after the map header
    pos = typeListOffsetInMap + 2; // skip the count we already read

    for (let i = 0; i < numTypes; i++) {
      // Read type entry from main map: 4-byte type, 2-byte count, 2-byte offset
      const typeBytes = new Uint8Array(
        mapData.buffer,
        mapData.byteOffset + pos,
        4,
      );
      const typeName = sanitizeTypeName(typeBytes);
      const resourceCount = mapView.getUint16(pos + 4, false) + 1;
      const resourceListOffset = mapView.getUint16(pos + 6, false);

      pos += 8;

      const typeResources = new Map<number, Resource>();

      // Read resources for this type from the resource list
      let resPos = typeListOffsetInMap + resourceListOffset;

      for (let j = 0; j < resourceCount; j++) {
        // Each resource entry is 12 bytes: id(2), nameOffset(2), packedAttr(4), junk(4)
        const id = mapView.getInt16(resPos, false);
        const nameOffset = mapView.getUint16(resPos + 2, false);
        const packedAttr = mapView.getUint32(resPos + 4, false);
        const junk = mapView.getUint32(resPos + 8, false);

        resPos += 12;

        // Unpack attributes
        const flags = (packedAttr & 0xff000000) >>> 24;
        const resourceDataOffset = packedAttr & 0x00ffffff;

        // Read resource data from data section
        const actualDataOffset = dataOffset + resourceDataOffset;

        if (actualDataOffset + 4 > data.length) {
          console.warn(
            `Skipping resource ${typeName}:${id} - data offset out of bounds`,
          );
          continue;
        }

        const resourceDataLength = view.getUint32(actualDataOffset, false);

        if (actualDataOffset + 4 + resourceDataLength > data.length) {
          console.warn(
            `Skipping resource ${typeName}:${id} - data length out of bounds`,
          );
          continue;
        }

        const resourceData = new Uint8Array(
          data.buffer,
          data.byteOffset + actualDataOffset + 4,
          resourceDataLength,
        );

        // Read resource name if present
        let name: string | undefined;
        if (nameOffset !== 0xffff) {
          const namePos = nameListOffsetInMap + nameOffset;
          if (namePos < mapLength) {
            const nameLength = mapData[namePos];
            if (namePos + 1 + nameLength <= mapLength) {
              name = new TextDecoder("latin1").decode(
                mapData.slice(namePos + 1, namePos + 1 + nameLength),
              );
            }
          }
        }

        const resource: Resource = {
          type: typeName,
          id,
          data: resourceData,
          name,
          flags,
          junk,
          order: 0xffffffff,
        };

        typeResources.set(id, resource);
      }

      if (typeResources.size > 0) {
        resources.set(typeName, typeResources);
      }
    }

    return {
      resources,
      fileAttributes,
      junkNextresmap,
      junkFilerefnum,
    };
  }

  /**
   * Convert a ResourceFork back to binary data
   */
  static toBytes(fork: ResourceFork): Uint8Array {
    // Calculate sizes and build the resource fork binary data

    // First pass: calculate required space
    let dataSize = 0;
    let nameSize = 0;
    let resourceCount = 0;

    for (const [, typeResources] of fork.resources) {
      resourceCount += typeResources.size;
      for (const [, resource] of typeResources) {
        dataSize += 4 + resource.data.length; // 4 bytes for length + data
        if (resource.name) {
          nameSize += 1 + resource.name.length; // 1 byte for length + name
        }
      }
    }

    // Calculate offsets and sizes
    const typeCount = fork.resources.size;
    const resourceListSize = resourceCount * 12; // 12 bytes per resource entry
    const typeListSize = 2 + typeCount * 8; // 2 bytes count + 8 bytes per type
    const mapHeaderSize = 30; // Fixed map header size

    const dataOffset = 16; // After resource header
    const mapOffset = dataOffset + dataSize;
    const mapSize = mapHeaderSize + typeListSize + resourceListSize + nameSize;

    const totalSize = dataOffset + dataSize + mapSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Write resource header (16 bytes)
    view.setUint32(0, dataOffset, false); // data offset
    view.setUint32(4, mapOffset, false); // map offset
    view.setUint32(8, dataSize, false); // data length
    view.setUint32(12, mapSize, false); // map length

    // Write resource data section
    let dataPos = dataOffset;
    const resourceOffsets = new Map<string, Map<number, number>>();

    for (const [typeName, typeResources] of fork.resources) {
      const typeOffsets = new Map<number, number>();
      for (const [id, resource] of typeResources) {
        const offset = dataPos - dataOffset; // Relative to data section start
        typeOffsets.set(id, offset);

        view.setUint32(dataPos, resource.data.length, false);
        dataPos += 4;
        bytes.set(resource.data, dataPos);
        dataPos += resource.data.length;
      }
      resourceOffsets.set(typeName, typeOffsets);
    }

    // Write map header (30 bytes)
    let mapPos = mapOffset;

    // Copy of resource header (16 bytes)
    view.setUint32(mapPos, dataOffset, false);
    mapPos += 4;
    view.setUint32(mapPos, mapOffset, false);
    mapPos += 4;
    view.setUint32(mapPos, dataSize, false);
    mapPos += 4;
    view.setUint32(mapPos, mapSize, false);
    mapPos += 4;

    // Map-specific header (14 bytes)
    view.setUint32(mapPos, fork.junkNextresmap || 0, false);
    mapPos += 4;
    view.setUint16(mapPos, fork.junkFilerefnum || 0, false);
    mapPos += 2;
    view.setUint16(mapPos, fork.fileAttributes || 0, false);
    mapPos += 2;

    const typeListOffsetInMap = 30; // Fixed: type list starts after 30-byte map header
    view.setUint16(mapPos, typeListOffsetInMap, false);
    mapPos += 2;

    const nameListOffsetInMap =
      typeListOffsetInMap + typeListSize + resourceListSize;
    view.setUint16(mapPos, nameListOffsetInMap, false);
    mapPos += 2;

    // Write type list - starts at mapOffset + typeListOffsetInMap
    const typeListStart = mapOffset + typeListOffsetInMap;
    view.setUint16(typeListStart, typeCount - 1, false); // count - 1

    let currentResourceListOffset = typeListSize; // Relative to typeListOffsetInMap
    let typePos = typeListStart + 2; // Skip the count we just wrote

    for (const [typeName, typeResources] of fork.resources) {
      // Write type entry (8 bytes)
      const typeBytes = new TextEncoder().encode(
        typeName.padEnd(4, "\0").substring(0, 4),
      );
      bytes.set(typeBytes, typePos);
      typePos += 4;

      view.setUint16(typePos, typeResources.size - 1, false);
      typePos += 2; // count - 1
      view.setUint16(typePos, currentResourceListOffset, false);
      typePos += 2;

      currentResourceListOffset += typeResources.size * 12;
    }

    // Write resource lists and collect names
    const nameData: { offset: number; name: string }[] = [];
    let nameOffset = 0;

    // Calculate where resource list starts (after type list)
    const resourceListStart = mapOffset + typeListOffsetInMap + typeListSize;
    let resourceListPos = 0;

    for (const [typeName, typeResources] of fork.resources) {
      const typeOffsets = resourceOffsets.get(typeName)!;

      for (const [id, resource] of typeResources) {
        const dataOffsetValue = typeOffsets.get(id)!;

        // Write resource entry (12 bytes) at absolute position
        const entryPos = resourceListStart + resourceListPos;

        view.setInt16(entryPos, id, false);

        let nameOffsetInList = 0xffff;
        if (resource.name) {
          nameOffsetInList = nameOffset;
          nameData.push({ offset: nameOffset, name: resource.name });
          nameOffset += 1 + resource.name.length;
        }
        view.setUint16(entryPos + 2, nameOffsetInList, false);

        const packedAttr =
          ((resource.flags || 0) << 24) | (dataOffsetValue & 0x00ffffff);
        view.setUint32(entryPos + 4, packedAttr, false);
        view.setUint32(entryPos + 8, resource.junk || 0, false);

        resourceListPos += 12;
      }
    }

    // Write name list
    let namePos = mapOffset + nameListOffsetInMap;
    for (const { name } of nameData) {
      bytes[namePos] = name.length;
      namePos += 1;
      const nameBytes = new TextEncoder().encode(name);
      bytes.set(nameBytes, namePos);
      namePos += nameBytes.length;
    }

    return bytes;
  }
}
