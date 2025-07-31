import {
  ottoHeader,
  ottoMaticLevel,
} from "@/python/structSpecs/ottoMaticInterface";
import { HeaderData } from "@/python/structSpecs/ottoMaticLevelData";
import { useMemo } from "react";

const elevationToRGBA = (elevation: number, header: ottoHeader) => {
  return [
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    255,
  ];
};

export function useHeightImg(headerData: HeaderData, otherData: Partial<ottoMaticLevel>) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);

  const coordColours = useMemo(() => {
    if (!otherData.YCrd?.[1000]?.obj || !header) return [];
    return otherData.YCrd[1000].obj.flatMap((e) => elevationToRGBA(e, header));
  }, [otherData.YCrd, header]);

  const imgCanvas = useMemo(() => {
    if (!header || !otherData.YCrd?.[1000]?.obj) return null;
    
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
  }, [header, otherData.YCrd, coordColours]);
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

export function useUnscaledHeightImg(headerData: HeaderData, otherData: Partial<ottoMaticLevel>) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);

  const coordColours = useMemo(() => {
    if (!otherData.YCrd?.[1000]?.obj || !header) return [];
    return otherData.YCrd[1000].obj.flatMap((e) => elevationToRGBAUnscaled(e, header));
  }, [otherData.YCrd, header]);

  const imgCanvas = useMemo(() => {
    if (!header || !otherData.YCrd?.[1000]?.obj) return null;
    
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
  }, [header, otherData.YCrd, coordColours]);
  return { heightImg: imgCanvas };
}
