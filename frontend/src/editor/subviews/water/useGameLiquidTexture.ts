import { Game, type GlobalsInterface } from "@/data/globals/globals";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { useEffect, useMemo, useState } from "react";
import ottoWaterUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global002.tga?url";
import ottoSoapUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global003.tga?url";
import ottoGreenUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global004.tga?url";
import ottoOilUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global005.tga?url";
import ottoJungleUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global006.tga?url";
import ottoMudUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global007.tga?url";
import ottoRadioactiveUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global008.tga?url";
import ottoLavaUrl from "../../../../../games/pangea-ports/games/OttoMatic-Android/Data/Sprites/global/global009.tga?url";
import bugdom2WaterUrl from "../../../../../games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/006.tga?url";
import bugdom2PoolUrl from "../../../../../games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/007.tga?url";
import bugdom2GarbageUrl from "../../../../../games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/008.tga?url";
import nanosaur2GreenUrl from "../../../../../games/pangea-ports/games/Nanosaur2-Android/Data/Sprites/global/global005.png?url";
import nanosaur2BlueUrl from "../../../../../games/pangea-ports/games/Nanosaur2-Android/Data/Sprites/global/global006.png?url";
import nanosaur2LavaUrl from "../../../../../games/pangea-ports/games/Nanosaur2-Android/Data/Sprites/global/global007.jpg?url";
import billySwampUrl from "../../../../../games/pangea-ports/games/BillyFrontier-Android/Data/Sprites/global/global001.png?url";
import billyPoolUrl from "../../../../../games/pangea-ports/games/BillyFrontier-Android/Data/Sprites/global/global002.png?url";
import billyGarbageUrl from "../../../../../games/pangea-ports/games/BillyFrontier-Android/Data/Sprites/global/global003.png?url";
import croMagGlobalModelUrl from "../../../../../games/pangea-ports/games/CroMagRally-Android/Data/Models/global.bg3d?url";
import { loadBg3dMaterialTexture } from "./embeddedLiquidTexture";

export interface LiquidTextureSource {
  url: string;
  format: "bg3d" | "image" | "tga";
  materialIndex?: number;
}

const OTTO_TEXTURES = [
  ottoWaterUrl,
  ottoSoapUrl,
  ottoGreenUrl,
  ottoOilUrl,
  ottoJungleUrl,
  ottoMudUrl,
  ottoRadioactiveUrl,
  ottoLavaUrl,
] as const;

const BUGDOM_2_TEXTURES = [
  bugdom2WaterUrl,
  bugdom2PoolUrl,
  bugdom2GarbageUrl,
] as const;
const NANOSAUR_2_TEXTURES = [
  nanosaur2GreenUrl,
  nanosaur2BlueUrl,
  nanosaur2LavaUrl,
] as const;
const BILLY_TEXTURES = [billySwampUrl, billyPoolUrl, billyGarbageUrl] as const;

export function getLiquidTextureSource(
  game: Game,
  liquidType: number,
): LiquidTextureSource | null {
  switch (game) {
    case Game.OTTO_MATIC: {
      const filename = OTTO_TEXTURES[liquidType];
      return filename
        ? {
            url: filename,
            format: "tga",
          }
        : null;
    }
    case Game.BUGDOM_2: {
      const filename = BUGDOM_2_TEXTURES[liquidType];
      return filename
        ? {
            url: filename,
            format: "tga",
          }
        : null;
    }
    case Game.NANOSAUR_2: {
      const filename = NANOSAUR_2_TEXTURES[Math.min(liquidType, 2)];
      return filename
        ? {
            url: filename,
            format: "image",
          }
        : null;
    }
    case Game.BILLY_FRONTIER: {
      const filename = BILLY_TEXTURES[liquidType];
      return filename ? { url: filename, format: "image" } : null;
    }
    case Game.CRO_MAG:
      return {
        url: croMagGlobalModelUrl,
        format: "bg3d",
        materialIndex: 13,
      };
    default:
      return null;
  }
}

function loadBrowserImage(url: string): ResultAsync<HTMLCanvasElement, string> {
  return ResultAsync.fromPromise(
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${url}`));
      image.src = url;
    }),
    (error) => String(error),
  ).andThen((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return errAsync("Canvas unavailable");
    context.drawImage(image, 0, 0);
    return okAsync(canvas);
  });
}

function loadTga(url: string): ResultAsync<HTMLCanvasElement, string> {
  return ResultAsync.fromPromise(fetch(url), (error) => String(error))
    .andThen((response) =>
      response.ok
        ? ResultAsync.fromPromise(response.arrayBuffer(), (error) => String(error))
        : errAsync(`Could not load ${url}`),
    )
    .andThen((buffer) => parseTGAToCanvas(buffer));
}

export function useGameLiquidTexture(
  globals: GlobalsInterface,
  liquidType: number,
): HTMLCanvasElement | null {
  const source = useMemo(
    () => getLiquidTextureSource(globals.GAME_TYPE, liquidType),
    [globals, liquidType],
  );
  return useTextureCanvas(source);
}

export function useTextureCanvas(
  source: LiquidTextureSource | null,
): HTMLCanvasElement | null {
  const [loaded, setLoaded] = useState<{
    url: string;
    canvas: HTMLCanvasElement;
  } | null>(null);

  useEffect(() => {
    if (!source) return;
    let active = true;
    const load =
      source.format === "tga"
        ? loadTga(source.url)
        : source.format === "bg3d"
          ? loadBg3dMaterialTexture(source.url, source.materialIndex ?? -1)
          : loadBrowserImage(source.url);
    void load.match(
      (canvas) => {
        if (active) setLoaded({ url: source.url, canvas });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [source]);

  return source && loaded?.url === source.url ? loaded.canvas : null;
}
