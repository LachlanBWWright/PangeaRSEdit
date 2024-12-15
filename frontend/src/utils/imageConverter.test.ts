import { expect, test } from "vitest";
import { sixteenBitToImageData, imageDataToSixteenBit } from "./imageConverter";

test("convert", () => {
  //Create a DataView
  const data = new DataView(new ArrayBuffer(200));

  for (let i = 0; i < 100; i++) {
    //set to have random value
    data.setUint16(i * 2, i);
  }

  //Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = 10;
  canvas.height = 10;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) throw new Error("Could not get canvas context");

  const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
  sixteenBitToImageData(data, imageData);

  console.log("imagedata", imageData);

  const output = imageDataToSixteenBit(imageData.data);
  console.log(output);

  //Expect output to equal data
  for (let i = 0; i < data.byteLength; i++) {
    console.log(i, data, output);
    expect(data.getUint8(i)).toEqual(output.getUint8(i));
  }
});
