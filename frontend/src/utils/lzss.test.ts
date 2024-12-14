import { expect, test } from "vitest";
import { lzssCompress, lzssDecompress } from "./lzss";

test("compress and decompress", () => {
  const inputDataView = new DataView(new ArrayBuffer(100));

  for (let i = 0; i < 100; i++) {
    inputDataView.setUint8(i, 255);
  }

  const outputDataView = new DataView(new ArrayBuffer(100));

  let compressedDataView = lzssCompress(inputDataView);
  lzssDecompress(compressedDataView, outputDataView);

  compressedDataView = lzssCompress(inputDataView);
  lzssDecompress(compressedDataView, outputDataView);

  console.log(inputDataView);
  console.log(outputDataView);

  for (let i = 0; i < inputDataView.byteLength; i++) {
    expect(inputDataView.getUint8(i)).toEqual(outputDataView.getUint8(i));
  }
});
