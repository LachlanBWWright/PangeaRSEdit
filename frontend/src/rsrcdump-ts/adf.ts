// AppleDouble format support for extracting resource forks

export class NotADFError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NotADFError';
  }
}

export const ADF_ENTRYNUM_RESOURCEFORK = 2;

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