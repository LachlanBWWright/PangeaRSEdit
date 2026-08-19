import { Game, type GlobalsInterface } from "@/data/globals/globals";
import { useMemo } from "react";
import {
  useTextureCanvas,
  type LiquidTextureSource,
} from "@/editor/subviews/water/useGameLiquidTexture";
import bugdomWaterUrl from "../../../../../games/pangea-ports/games/Bugdom-android/Data/Images/Textures/128.tga?url";
import bugdomPondWaterUrl from "../../../../../games/pangea-ports/games/Bugdom-android/Data/Images/Textures/129.tga?url";
import bugdomHoneyUrl from "../../../../../games/pangea-ports/games/Bugdom-android/Data/Images/Textures/200.tga?url";
import bugdomSlimeUrl from "../../../../../games/pangea-ports/games/Bugdom-android/Data/Images/Textures/201.tga?url";
import bugdomLavaUrl from "../../../../../games/pangea-ports/games/Bugdom-android/Data/Images/Textures/202.tga?url";

const NANOSAUR_LAVA_URL = `${import.meta.env.BASE_URL}assets/liquids/nanosaur1/lava.png`;
const NANOSAUR_WATER_URL = `${import.meta.env.BASE_URL}assets/liquids/nanosaur1/water.png`;

export function getItemLiquidTextureSource(
  game: Game,
  itemType: number,
  levelNumber?: number,
): LiquidTextureSource | null {
  if (game === Game.NANOSAUR) {
    if (itemType === 4) return { url: NANOSAUR_LAVA_URL, format: "image" };
    if (itemType === 14) return { url: NANOSAUR_WATER_URL, format: "image" };
    return null;
  }
  if (game !== Game.BUGDOM) return null;

  switch (itemType) {
    case 14:
      return {
        url: levelNumber === 2 ? bugdomPondWaterUrl : bugdomWaterUrl,
        format: "tga",
      };
    case 27:
      return { url: bugdomHoneyUrl, format: "tga" };
    case 55:
      return { url: bugdomSlimeUrl, format: "tga" };
    case 56:
      return { url: bugdomLavaUrl, format: "tga" };
    default:
      return null;
  }
}

export function useItemLiquidTexture(
  globals: GlobalsInterface,
  itemType: number,
  levelNumber?: number,
): HTMLCanvasElement | null {
  const source = useMemo(
    () => getItemLiquidTextureSource(globals.GAME_TYPE, itemType, levelNumber),
    [globals.GAME_TYPE, itemType, levelNumber],
  );
  return useTextureCanvas(source);
}
