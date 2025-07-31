import { Game, GlobalsInterface } from "@/data/globals/globals";

/**
 * Gets a color for a fence based on the game type and fence type
 */
export function getFenceColor(globals: GlobalsInterface, fenceType: number, fallbackIndex: number): string {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      // Otto Matic - sci-fi/mechanical colors
      const ottoColors = [
        "#C0C0C0", // silver
        "#4169E1", // royal blue
        "#FF4500", // orange red
        "#32CD32", // lime green
        "#FF69B4", // hot pink
        "#8A2BE2", // blue violet
        "#DC143C", // crimson
        "#00CED1", // dark turquoise
      ];
      return ottoColors[fenceType % ottoColors.length];

    case Game.BUGDOM:
      // Bugdom - garden/nature colors
      const bugdomColors = [
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
      return bugdomColors[fenceType % bugdomColors.length];

    case Game.BUGDOM_2:
      // Bugdom 2 - more vibrant nature colors
      const bugdom2Colors = [
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
      return bugdom2Colors[fenceType % bugdom2Colors.length];

    case Game.CRO_MAG:
      // Cro-Mag - prehistoric/stone age colors
      const croMagColors = [
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
      return croMagColors[fenceType % croMagColors.length];

    case Game.BILLY_FRONTIER:
      // Billy Frontier - western/frontier colors
      const billyColors = [
        "#D2691E", // chocolate
        "#8B4513", // saddle brown
        "#CD853F", // peru
        "#DEB887", // burlywood
        "#F4A460", // sandy brown
        "#BC8F8F", // rosy brown
      ];
      return billyColors[fenceType % billyColors.length];

    case Game.NANOSAUR_2:
      // Nanosaur 2 - prehistoric jungle colors
      const nanosaur2Colors = [
        "#228B22", // forest green (pine)
        "#DEB887", // burlywood (dust)
        "#696969", // dim gray (block)
      ];
      return nanosaur2Colors[fenceType % nanosaur2Colors.length];

    case Game.NANOSAUR:
      // Nanosaur typically doesn't have fences, fall back to default
      return getDefaultFallbackColor(fallbackIndex);

    default:
      return getDefaultFallbackColor(fallbackIndex);
  }
}

/**
 * Default fallback color system (original implementation)
 */
function getDefaultFallbackColor(index: number): string {
  switch (index % 5) {
    case 0:
      return "#339933";
    case 1:
      return "#3399ff";
    case 2:
      return "#993399";
    case 3:
      return "#ff9933";
    case 4:
    default:
      return "#ff3399";
  }
}