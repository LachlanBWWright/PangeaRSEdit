import { Game, GlobalsInterface } from "../globals/globals";

const OTTO_FENCE_COLORS = [
  "#C0C0C0", // silver
  "#4169E1", // royal blue
  "#FF4500", // orange red
  "#32CD32", // lime green
  "#FF69B4", // hot pink
  "#8A2BE2", // blue violet
  "#DC143C", // crimson
  "#00CED1", // dark turquoise
];

const BUGDOM_FENCE_COLORS = [
  "#228B22", // forest green
  "#DAA520", // goldenrod
  "#9ACD32", // yellow green
  "#8FBC8F", // dark sea green
  "#2F4F4F", // dark slate gray
  "#6B8E23", // olive drab
  "#8B4513", // saddle brown
  "#556B2F", // dark olive green
  "#A0522D", // sienna
];

const BUGDOM2_FENCE_COLORS = [
  "#90EE90", // light green
  "#D2691E", // chocolate
  "#F0E68C", // khaki
  "#CD853F", // peru
  "#DDA0DD", // plum
  "#20B2AA", // light sea green
  "#87CEEB", // sky blue
  "#F4A460", // sandy brown
  "#98FB98", // pale green
  "#FFB6C1", // light pink
  "#F5DEB3", // wheat
  "#DEB887", // burlywood
  "#B0E0E6", // powder blue
  "#FFEFD5", // papaya whip
  "#E6E6FA", // lavender
  "#FFF8DC", // cornsilk
  "#F0FFFF", // azure
];

const CRO_MAG_FENCE_COLORS = [
  "#D2691E", // chocolate (desert)
  "#FF0000", // red (invisible - use red for visibility)
  "#8B4513", // saddle brown (stone)
  "#A0522D", // sienna (stone)
  "#CD853F", // peru (stone)
  "#DEB887", // burlywood (stone)
  "#F4A460", // sandy brown (hieroglyphs)
  "#D2B48C", // tan (camel)
  "#8FBC8F", // dark sea green (farm)
  "#DAA520", // goldenrod (aztec)
  "#696969", // dim gray (rock wall)
  "#2F4F4F", // dark slate gray (tall rock wall)
  "#708090", // slate gray (rock pile)
  "#8B4513", // saddle brown (tribal)
  "#F5DEB3", // wheat (horns)
  "#BC8F8F", // rosy brown (crete)
  "#A0522D", // sienna (rock pile 2)
  "#FF8C00", // dark orange (orange rock)
  "#2E8B57", // sea green (seaweed variants)
  "#3CB371", // medium sea green
  "#20B2AA", // light sea green
  "#48D1CC", // medium turquoise
  "#00CED1", // dark turquoise
  "#5F9EA0", // cadet blue
  "#708090", // slate gray (china concrete)
  "#B0C4DE", // light steel blue (china design)
  "#4682B4", // steel blue (viking)
];

const BILLY_FRONTIER_FENCE_COLORS = [
  "#D2691E", // chocolate
  "#8B4513", // saddle brown
  "#CD853F", // peru
  "#DEB887", // burlywood
  "#F4A460", // sandy brown
  "#BC8F8F", // rosy brown
];

const NANOSAUR2_FENCE_COLORS = [
  "#228B22", // forest green (pine)
  "#DEB887", // burlywood (dust)
  "#696969", // dim gray (block)
];

const FALLBACK_COLORS = ["#339933", "#3399ff", "#993399", "#ff9933", "#ff3399"];

function getDefaultFallbackColor(index: number): string {
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? "#339933";
}

export function getFenceColor(
  globals: GlobalsInterface,
  fenceType: number,
  fallbackIndex: number,
): string {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return (
        OTTO_FENCE_COLORS[fenceType % OTTO_FENCE_COLORS.length] ?? "#C0C0C0"
      );
    case Game.BUGDOM:
      return (
        BUGDOM_FENCE_COLORS[fenceType % BUGDOM_FENCE_COLORS.length] ?? "#228B22"
      );
    case Game.BUGDOM_2:
      return (
        BUGDOM2_FENCE_COLORS[fenceType % BUGDOM2_FENCE_COLORS.length] ??
        "#90EE90"
      );
    case Game.CRO_MAG:
      return (
        CRO_MAG_FENCE_COLORS[fenceType % CRO_MAG_FENCE_COLORS.length] ??
        "#D2691E"
      );
    case Game.BILLY_FRONTIER:
      return (
        BILLY_FRONTIER_FENCE_COLORS[
          fenceType % BILLY_FRONTIER_FENCE_COLORS.length
        ] ?? "#D2691E"
      );
    case Game.NANOSAUR_2:
      return (
        NANOSAUR2_FENCE_COLORS[fenceType % NANOSAUR2_FENCE_COLORS.length] ??
        "#228B22"
      );
    default:
      return getDefaultFallbackColor(fallbackIndex);
  }
}
