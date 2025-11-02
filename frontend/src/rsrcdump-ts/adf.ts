// AppleDouble format support for extracting resource forks

export class NotADFError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NotADFError';
  }
}

export const ADF_ENTRYNUM_RESOURCEFORK = 2;

export function packAdf(resourceFork: Uint8Array, finderInfo?: Uint8Array): Uint8Array {
  // Create AppleDouble v2 format file
  // Header: magic(4) + version(4) + filler(16) + num_entries(2) + entries(12 * num_entries)
  
  const entries: Array<{id: number, data: Uint8Array}> = [];
  
  // Add Finder Info if provided (entry ID 9)
  if (finderInfo && finderInfo.length > 0) {
    entries.push({id: 9, data: finderInfo});
  }
  
  // Add Resource Fork (entry ID 2)
  entries.push({id: ADF_ENTRYNUM_RESOURCEFORK, data: resourceFork});
  
  // Calculate sizes
  const headerSize = 4 + 4 + 16 + 2; // magic + version + filler + num_entries = 26 bytes
  const entryDescriptorSize = entries.length * 12; // 12 bytes per entry descriptor
  let dataOffset = headerSize + entryDescriptorSize;
  
  // Calculate total size
  let totalSize = dataOffset;
  entries.forEach(entry => {
    totalSize += entry.data.length;
  });
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // Write header
  view.setUint32(0, 0x00051607, false); // AppleDouble magic
  view.setUint32(4, 0x00020000, false); // Version 2.0000
  
  // Write filler (16 bytes) - "Mac OS X        "
  const fillerText = "Mac OS X        ";
  const fillerBytes = new TextEncoder().encode(fillerText);
  uint8View.set(fillerBytes.slice(0, 16), 8);
  
  // Write number of entries
  view.setUint16(24, entries.length, false);
  
  // Write entry descriptors and data
  let entryDescPos = 26;
  let currentDataOffset = dataOffset;
  
  entries.forEach(entry => {
    // Write entry descriptor (12 bytes)
    view.setUint32(entryDescPos, entry.id, false);
    view.setUint32(entryDescPos + 4, currentDataOffset, false);
    view.setUint32(entryDescPos + 8, entry.data.length, false);
    entryDescPos += 12;
    
    // Write entry data
    uint8View.set(entry.data, currentDataOffset);
    currentDataOffset += entry.data.length;
  });
  
  return new Uint8Array(buffer);
}

export function unpackAdf(data: Uint8Array): Map<number, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset);
  
  // Check ADF magic
  const magic = view.getUint32(0, false);
  if (magic !== 0x00051607) {
    throw new NotADFError('Not an AppleDouble file');
  }
  
  const version = view.getUint32(4, false);
  if (version !== 0x00020000) {
    throw new NotADFError('Unsupported AppleDouble version');
  }
  
  // Skip filler (16 bytes)
  const numEntries = view.getUint16(24, false);
  
  const entries = new Map<number, Uint8Array>();
  let entryPos = 26;
  
  for (let i = 0; i < numEntries; i++) {
    const entryId = view.getUint32(entryPos, false);
    const offset = view.getUint32(entryPos + 4, false);
    const length = view.getUint32(entryPos + 8, false);
    
    entryPos += 12;
    
    entries.set(entryId, new Uint8Array(data.buffer, data.byteOffset + offset, length));
  }
  
  return entries;
}