/** Shared TGA parsing utilities. */

export interface TGAHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapOrigin: number;
  colorMapLength: number;
  colorMapDepth: number;
  imageXOrigin: number;
  imageYOrigin: number;
  imageWidth: number;
  imageHeight: number;
  pixelDepth: number;
  imageDescriptor: number;
}

/** Parses the fixed 18-byte TGA file header into a typed structure. */
export function parseTGAHeader(data: DataView): TGAHeader {
  return {
    idLength: data.getUint8(0),
    colorMapType: data.getUint8(1),
    imageType: data.getUint8(2),
    colorMapOrigin: data.getUint16(3, true),
    colorMapLength: data.getUint16(5, true),
    colorMapDepth: data.getUint8(7),
    imageXOrigin: data.getUint16(8, true),
    imageYOrigin: data.getUint16(10, true),
    imageWidth: data.getUint16(12, true),
    imageHeight: data.getUint16(14, true),
    pixelDepth: data.getUint8(16),
    imageDescriptor: data.getUint8(17),
  };
}
