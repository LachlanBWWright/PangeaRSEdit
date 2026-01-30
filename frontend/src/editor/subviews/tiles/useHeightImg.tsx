import {
<<<<<<< HEAD
  StandardHeader,
  LevelData,
} from "@/python/structSpecs/LevelTypes";
import { HeaderData } from "@/python/structSpecs/LevelTypes";
=======
  ottoHeader,
  ottoMaticLevel,
} from "@/python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
import { useMemo } from "react";

const elevationToRGBA = (elevation: number, header: StandardHeader) => {
  return [
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    255,
  ];
};

<<<<<<< HEAD
export function useHeightImg(headerData: HeaderData, otherData: Partial<LevelData>) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);
=======
export function useHeightImg(data: ottoMaticLevel) {
  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);
>>>>>>> origin/main

  const coordColours = useMemo(
    () => data.YCrd[1000].obj.flatMap((e) => elevationToRGBA(e, header)),
    [data.YCrd[1000].obj],
  );

  const imgCanvas = useMemo(() => {
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth + 1;
    imgCanvas.height = header.mapHeight + 1;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) {
      console.error("Could not get canvas context for height image");
      return null;
    }

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

const elevationToRGBAUnscaled = (elevation: number, header: StandardHeader) => {
  return [
    (elevation / header.maxY) * 255,
    (elevation / header.maxY) * 255,
    (elevation / header.maxY) * 255,
    255,
  ];
};

<<<<<<< HEAD
export function useUnscaledHeightImg(headerData: HeaderData, otherData: Partial<LevelData>) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);
=======
export function useUnscaledHeightImg(data: ottoMaticLevel) {
  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);
>>>>>>> origin/main

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
    if (!imgCtx) {
      console.error("Could not get canvas context for unscaled height image");
      return null;
    }

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
