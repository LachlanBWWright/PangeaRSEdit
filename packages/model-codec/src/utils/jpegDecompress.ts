import Jpeg from "jpeg-js";
import { Result } from "neverthrow";
import { mapCodecError } from "../schemas/common";

export interface DecodedJpegImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export function decodeJpegNodeResult(jpegData: ArrayBuffer): Result<DecodedJpegImage, string> {
  return Result.fromThrowable(() => Jpeg.decode(new Uint8Array(jpegData), { useTArray: true }), mapCodecError)().map((image) => ({ width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) }));
}
