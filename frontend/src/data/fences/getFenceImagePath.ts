import { Game, GlobalsInterface } from "../globals/globals";
import { FenceType as Nanosaur2FenceType } from "./nanosaur2FenceType";
import { getBugdom2FenceImageDefinition } from "./bugdom2FenceImages";

function withBaseUrl(path: string): string {
  const base = import.meta.env?.BASE_URL ?? "/";
  return `${base}${path.replace(/^\/+/, "")}`;
}

// Billy Frontier fence sprite files, mapped by fence type index.
const BILLY_FRONTIER_FENCE_FILES = [
  "global003.png", // WOOD
  "global004.png", // WHITE
  "stampede000.png", // CANYON
  "global005.png", // TALLGRASS
  "global006.png", // SMALLGRASS
  "global007.png", // SWAMPTREE
  "global002.png", // PICKETFENCE
];

const CRO_MAG_FENCE_FILES = [
  "desertskin.png",
  "invisible.png",
  "china1.png",
  "china2.png",
  "china3.png",
  "china4.png",
  "hieroglyphs.png",
  "camel.png",
  "farm.png",
  "aztec.png",
  "rockwall.png",
  "tallrockwall.png",
  "rockpile.png",
  "tribal.png",
  "horns.png",
  "crete.png",
  "rockpile2.png",
  "orangerock.png",
  "seaweed1.png",
  "seaweed2.png",
  "seaweed3.png",
  "seaweed4.png",
  "seaweed5.png",
  "seaweed6.png",
  "chinaconcrete.png",
  "chinadesign.png",
  "viking.png",
];

function getNanosaur2FenceImagePath(fenceType: number): string {
  if (fenceType === Nanosaur2FenceType.LEVEL_1_PINETREE)
    return withBaseUrl("assets/nanosaur2/fences/pinefence.jpg");
  if (fenceType === Nanosaur2FenceType.LEVEL_2_DUSTDEVIL)
    return withBaseUrl("assets/nanosaur2/fences/dustdevil.jpg");
  return withBaseUrl("assets/nanosaur2/fences/blockenemy.png");
}

function getCroMagFenceImagePath(fenceType: number): string {
  const file = CRO_MAG_FENCE_FILES[fenceType] ?? "desertskin.png";
  return withBaseUrl(`assets/croMag/fences/${file}`);
}

/** Returns the fence image path for the active game and fence type. */
export function getFenceImagePath(
  globals: GlobalsInterface,
  fenceType: number,
): string {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return withBaseUrl(
        `assets/ottoMatic/fences/fence${String(fenceType).padStart(3, "0")}.png`,
      );
    case Game.BUGDOM:
      return withBaseUrl(`assets/bugdom/fences/${2000 + fenceType}.jpg`);
    case Game.BUGDOM_2:
      return withBaseUrl(getBugdom2FenceImageDefinition(fenceType).publicPath);
    case Game.BILLY_FRONTIER:
      return withBaseUrl(
        `assets/billyFrontier/fences/${BILLY_FRONTIER_FENCE_FILES[fenceType] ?? "global003.png"}`,
      );
    case Game.CRO_MAG:
      return getCroMagFenceImagePath(fenceType);
    case Game.NANOSAUR_2:
      return getNanosaur2FenceImagePath(fenceType);
    default:
      return "";
  }
}
