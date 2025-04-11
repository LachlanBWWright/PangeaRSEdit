import { expect, test } from "vitest";
import { sixteenBitToImageData, imageDataToSixteenBit } from "./imageConverter";

test("convert", () => {
  //Create a DataView
  const data = new DataView(new ArrayBuffer(20_000));

  for (let i = 0; i < 10_000; i++) {
    //set to have random value
    const randVal = Math.floor(Math.random() * 65535);
    data.setUint16(i * 2, randVal);
  }

  //Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
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
