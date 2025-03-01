export function sixteenBitToImageData(data: DataView, imageData: ImageData) {
  if (imageData.data.length !== data.byteLength * 2) {
    throw new Error("Data length does not match image data length");
  }

  for (let i = 0; i < data.byteLength; i += 2) {
    const short = data.getUint16(i);
    const r = ((short & 0x7c00) >> 10) * 8;
    const g = ((short & 0x03e0) >> 5) * 8;
    const b = (short & 0x001f) * 8;

    imageData.data[i * 2] = r;
    imageData.data[i * 2 + 1] = g;
    imageData.data[i * 2 + 2] = b;
    imageData.data[i * 2 + 3] = short & 0x8000 ? 0 : 255;
  }
}

export function canvasDataToSixteenBit(canvas: HTMLCanvasElement): DataView {
  const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
  if (!canvasCtx) throw new Error("Could not get canvas context");
  const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
  return imageDataToSixteenBit(imageData.data);
}

export function imageDataToSixteenBit(data: Uint8ClampedArray): DataView {
  const output = new DataView(new ArrayBuffer(data.length / 2));
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    output.setUint16(
      i / 2,
      ((r / 8) << 10) | ((g / 8) << 5) | (b / 8) | (a ? 0x0 : 0x8000),
    );
  }
  return output;
}
