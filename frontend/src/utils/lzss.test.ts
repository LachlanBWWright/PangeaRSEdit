import { expect, test } from "vitest";
import { lzssCompress, lzssDecompress } from "./lzss";

test("compress and decompress", () => {
  const inputDataView = new DataView(new ArrayBuffer(100));

  for (let i = 0; i < 100; i++) {
    inputDataView.setUint8(i, i);
  }

  const compressedDataView = new DataView(new ArrayBuffer());
  const outputDataView = new DataView(new ArrayBuffer());

  lzssCompress(inputDataView, compressedDataView);
  lzssDecompress(compressedDataView, outputDataView);

  console.log(inputDataView);
  console.log(outputDataView);

  for (let i = 0; i < inputDataView.byteLength; i++) {
    expect(inputDataView.getUint8(i)).toEqual(outputDataView.getUint8(i));
  }
});
