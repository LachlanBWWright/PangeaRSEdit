import { Game, type GlobalsInterface } from "@/data/globals/globals";
import { gameAssetUrl } from "@/assets/gameAssetUrls";
import { useAssetState } from "@/assets/useAssetState";
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
import type { ImageAssetSource as LiquidTextureSource } from "@/assets/imageAssets";
import { useImageAsset } from "@/assets/useImageAsset";
export type { ImageAssetSource as LiquidTextureSource } from "@/assets/imageAssets";
export { useImageAsset as useTextureCanvas } from "@/assets/useImageAsset";

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
            url: gameAssetUrl(game, `Sprites/global/global${String(liquidType + 2).padStart(3, "0")}.tga`, filename),
            format: "tga",
          }
        : null;
    }
    case Game.BUGDOM_2: {
      const filename = BUGDOM_2_TEXTURES[liquidType];
      return filename
        ? {
            url: gameAssetUrl(game, `Sprites/Global/${String(liquidType + 6).padStart(3, "0")}.tga`, filename),
            format: "tga",
          }
        : null;
    }
    case Game.NANOSAUR_2: {
      const filename = NANOSAUR_2_TEXTURES[Math.min(liquidType, 2)];
      return filename
        ? {
            url: gameAssetUrl(game, `Sprites/global/global${String(Math.min(liquidType, 2) + 5).padStart(3, "0")}.${liquidType >= 2 ? "jpg" : "png"}`, filename),
            format: "image",
          }
        : null;
    }
    case Game.BILLY_FRONTIER: {
      const filename = BILLY_TEXTURES[liquidType];
      return filename ? { url: gameAssetUrl(game, `Sprites/global/global${String(liquidType + 1).padStart(3, "0")}.png`, filename), format: "image" } : null;
    }
    case Game.CRO_MAG:
      return {
        url: gameAssetUrl(game, "Models/global.bg3d", croMagGlobalModelUrl),
        format: "model",
        materialIndex: 13,
      };
    default:
      return null;
  }
}

export function useGameLiquidTexture(
  globals: GlobalsInterface,
  liquidType: number,
): HTMLCanvasElement | null {
  useAssetState();
  const source = getLiquidTextureSource(globals.GAME_TYPE, liquidType);
  return useImageAsset(source);
}
