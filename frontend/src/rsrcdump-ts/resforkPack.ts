/**
 * Resource fork packing - converts ResourceFork structure to binary format
 * This implementation matches the Python rsrcdump byte-for-byte
 */

import type { Resource, ResourceFork } from "./types";

/**
 * Pack a ResourceFork into binary format
 * Matches Python rsrcdump.resfork.ResourceFork.pack() exactly
 */
export function packResourceFork(fork: ResourceFork): Uint8Array {
  // Flatten and sort resources by order field
  const orderedResources = flattenAndSortResources(fork);

  // Calculate sizes
  let dataSize = 0;
  for (const res of orderedResources) {
    dataSize += 4 + res.data.length; // 4-byte length prefix + data
  }

  // Count resource types that have resources
  const typeCount = fork.resources.size;

  // Calculate type list size: 2 bytes count + 8 bytes per type
  const typeListSize = 2 + typeCount * 8;

  // Calculate resource list size: 12 bytes per resource
  const resourceListSize = orderedResources.length * 12;

  // Calculate name list size
  let nameListSize = 0;
  const encoder = new TextEncoder();
  for (const res of orderedResources) {
    if (res.name && res.name.length > 0) {
      // Encode name to get actual byte length
      const nameBytes =
        typeof res.name === "string" ? encoder.encode(res.name) : res.name;
      nameListSize += 1 + nameBytes.length; // 1 byte length + name bytes
    }
  }

  // Total map size: 28 bytes header + type list + resource list + name list
  const mapSize = 28 + typeListSize + resourceListSize + nameListSize;

  // Total size: 16 byte header + 240 bytes reserved + data + map
  const totalSize = 16 + 240 + dataSize + mapSize;

  console.log(
    `[resforkPack] Data size: ${dataSize}, Map size: ${mapSize}, Total: ${totalSize}`,
  );
  console.log(
    `[resforkPack] Type list size: ${typeListSize}, Resource list size: ${resourceListSize}, Name list size: ${nameListSize}`,
  );
  console.log(
    `[resforkPack] Resources: ${orderedResources.length}, Types: ${typeCount}`,
  );
  console.log(
    `[resforkPack] Type list: ${typeListSize}, Resource list: ${resourceListSize}, Name list: ${nameListSize}`,
  );

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  let pos = 0;

  // ========================================
  // Write resource fork header (16 bytes)
  // ========================================
  const dataOffset = 16 + 240; // After header + reserved space
  const mapOffset = dataOffset + dataSize;

  view.setUint32(pos, dataOffset, false);
  pos += 4;
  view.setUint32(pos, mapOffset, false);
  pos += 4;
  view.setUint32(pos, dataSize, false);
  pos += 4;
  view.setUint32(pos, mapSize, false);
  pos += 4;

  // Write reserved space (240 bytes): 112 bytes system-reserved + 128 bytes app-reserved
  // Fill with zeros
  for (let i = 0; i < 240; i++) {
    uint8View[pos++] = 0;
  }

  // ========================================
  // Write data section
  // ========================================
  const dataStart = pos;
  const resourceDataOffsets = new Map<string, number>();

  for (let i = 0; i < orderedResources.length; i++) {
    const res = orderedResources[i];
    if (!res) continue;
    const key = `${res.type}:${res.id}`;
    // Store offset relative to data section start
    resourceDataOffsets.set(key, pos - dataStart);

    // Debug first 10 and resource #4
    if (i < 10 || i === 4) {
      console.log(
        `[resforkPack] Resource #${i}: ${res.type}:${res.id}, length=${
          res.data.length
        }, offset=0x${(pos - 256).toString(16)}`,
      );
    }

    // Write data length (4 bytes, big-endian)
    view.setUint32(pos, res.data.length, false);
    pos += 4;

    // Write data
    uint8View.set(res.data, pos);
    pos += res.data.length;
  }

  // ========================================
  // Write map section
  // ========================================
  // pos now points at the start of the map section (unused variable intentionally removed)

  // Map header (28 bytes)
  // First 16 bytes: copy of resource header
  view.setUint32(pos, dataOffset, false);
  pos += 4;
  view.setUint32(pos, mapOffset, false);
  pos += 4;
  view.setUint32(pos, dataSize, false);
  pos += 4;
  view.setUint32(pos, mapSize, false);
  pos += 4;

  // Next 12 bytes: junk fields and offsets
  view.setUint32(
    pos,
    fork.junkNextresmap !== undefined ? fork.junkNextresmap : 0,
    false,
  );
  pos += 4;
  view.setUint16(
    pos,
    fork.junkFilerefnum !== undefined ? fork.junkFilerefnum : 0,
    false,
  );
  pos += 2;
  view.setUint16(
    pos,
    fork.fileAttributes !== undefined ? fork.fileAttributes : 0,
    false,
  );
  pos += 2;

  const typeListOffsetInMap = 28;
  const nameListOffsetInMap = 28 + typeListSize + resourceListSize;

  view.setUint16(pos, typeListOffsetInMap, false);
  pos += 2;
  view.setUint16(pos, nameListOffsetInMap, false);
  pos += 2;

  // ========================================
  // Write type list
  // ========================================
  // Note: resourceListStart and typeListStart are calculated for documentation but not directly used
  // const resourceListStart = mapStart + 28 + typeListSize;

  // Write type count - 1
  view.setUint16(pos, typeCount - 1, false);
  pos += 2;

  // Write type entries (8 bytes each)
  const typeEntries: Array<{
    type: string;
    resources: Resource[];
    listOffset: number;
  }> = [];

  // Resource list offset is relative to TYPE LIST START (not resource list start)
  // const typeListStart = pos - 2;  // Start of type list (after count)
  let currentResourceListOffset = typeListSize; // Start after type list

  for (const [typeName, typeMap] of fork.resources) {
    const typeBytes = new TextEncoder().encode(
      typeName.padEnd(4).substring(0, 4),
    );
    uint8View.set(typeBytes, pos);
    pos += 4;

    const resourcesOfType = Array.from(typeMap.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    // Write count - 1
    view.setUint16(pos, resourcesOfType.length - 1, false);
    pos += 2;

    // Write offset to resource list for this type (relative to TYPE LIST START, not resource list start!)
    view.setUint16(pos, currentResourceListOffset, false);
    pos += 2;

    typeEntries.push({
      type: typeName,
      resources: resourcesOfType,
      listOffset: currentResourceListOffset,
    });

    currentResourceListOffset += resourcesOfType.length * 12;
  }

  // ========================================
  // Write resource list
  // ========================================
  const nameOffsetPlaceholders: Array<{
    pos: number;
    res: Resource;
  }> = [];

  for (const typeEntry of typeEntries) {
    for (const res of typeEntry.resources) {
      const key = `${res.type}:${res.id}`;

      // Write resource ID (2 bytes, signed)
      view.setInt16(pos, res.id, false);
      pos += 2;

      // Placeholder for name offset (2 bytes)
      nameOffsetPlaceholders.push({ pos, res });
      pos += 2;

      // Write flags + data offset (4 bytes packed)
      const dataOffsetRelative = resourceDataOffsets.get(key) || 0;
      const flags = res.flags !== undefined ? res.flags : 0;
      const packedAttr = (flags << 24) | (dataOffsetRelative & 0xffffff);
      view.setUint32(pos, packedAttr, false);
      pos += 4;

      // Write junk (4 bytes)
      const junk = res.junk !== undefined ? res.junk : 0;
      view.setUint32(pos, junk, false);
      pos += 4;
    }
  }

  // ========================================
  // Write name list
  // ========================================
  const nameListStart = pos;

  // Write resource names and fill in name offset placeholders
  for (const placeholder of nameOffsetPlaceholders) {
    if (placeholder.res.name && placeholder.res.name.length > 0) {
      // Calculate offset relative to name list start
      const nameOffset = pos - nameListStart;
      view.setUint16(placeholder.pos, nameOffset, false);

      // Write name (Pascal string: 1 byte length + name bytes)
      // Encode string to UTF-8 bytes
      const nameBytes =
        typeof placeholder.res.name === "string"
          ? encoder.encode(placeholder.res.name)
          : placeholder.res.name;
      uint8View[pos++] = nameBytes.length;
      uint8View.set(nameBytes, pos);
      pos += nameBytes.length;
    } else {
      // No name: write 0xFFFF
      view.setUint16(placeholder.pos, 0xffff, false);
    }
  }

  return uint8View;
}

/**
 * Flatten resources from map structure and sort by order field
 * Matches Python's ordered_flat_list()
 */
function flattenAndSortResources(fork: ResourceFork): Resource[] {
  const flat: Resource[] = [];

  for (const typeMap of fork.resources.values()) {
    for (const res of typeMap.values()) {
      flat.push(res);
    }
  }

  return flat.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
