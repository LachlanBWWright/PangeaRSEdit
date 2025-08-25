import {
  ottoHeader,
  ottoMaticLevel,
} from "@/python/structSpecs/ottoMaticInterface";
import { useMemo } from "react";

const elevationToRGBA = (elevation: number, header: ottoHeader) => {
  return [
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    255,
  ];
};

export function useHeightImg(data: ottoMaticLevel) {
  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const coordColours = useMemo(
    () => data.YCrd[1000].obj.flatMap((e) => elevationToRGBA(e, header)),
    [data.YCrd[1000].obj],
  );

  const imgCanvas = useMemo(() => {
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth + 1;
    imgCanvas.height = header.mapHeight + 1;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth + 1,
        header.mapHeight + 1,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header, data.YCrd[1000].obj]);
  return { heightImg: imgCanvas };
}

const elevationToRGBAUnscaled = (elevation: number, header: ottoHeader) => {
  return [
    (elevation / header.maxY) * 255,
    (elevation / header.maxY) * 255,
    (elevation / header.maxY) * 255,
    255,
  ];
};

export function useUnscaledHeightImg(data: ottoMaticLevel) {
  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const coordColours = useMemo(
    () =>
      data.YCrd[1000].obj.flatMap((e) => elevationToRGBAUnscaled(e, header)),
    [data.YCrd[1000].obj],
  );

  const imgCanvas = useMemo(() => {
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth + 1;
    imgCanvas.height = header.mapHeight + 1;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth + 1,
        header.mapHeight + 1,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header, data.YCrd[1000].obj]);
  return { heightImg: imgCanvas };
}
