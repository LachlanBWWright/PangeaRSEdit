import {
  StandardHeader,
  LevelData,
} from "@/python/structSpecs/LevelTypes";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { useMemo } from "react";

const elevationToRGBA = (elevation: number, header: StandardHeader) => {
  return [
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
    255,
  ];
};

export function useHeightImg(headerData: HeaderData, terrainData: TerrainData) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);

  const yCrdData = terrainData.YCrd?.[1000]?.obj;
  
  const coordColours = useMemo(() => {
    if (!yCrdData || !header) return [];
    return yCrdData.flatMap((e) => elevationToRGBA(e, header));
  }, [yCrdData, header]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
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
  }, [header, coordColours]);
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

export function useUnscaledHeightImg(headerData: HeaderData, terrainData: TerrainData) {
  const header = useMemo(() => headerData.Hedr?.[1000]?.obj, [headerData.Hedr]);

  const yCrdData = terrainData.YCrd?.[1000]?.obj;
  
  const coordColours = useMemo(() => {
    if (!yCrdData || !header) return [];
    return yCrdData.flatMap((e) => elevationToRGBAUnscaled(e, header));
  }, [yCrdData, header]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
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
  }, [header, coordColours]);
  return { heightImg: imgCanvas };
}
