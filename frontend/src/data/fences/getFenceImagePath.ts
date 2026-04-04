import { Game, GlobalsInterface } from "../globals/globals";
import { FenceType as Nanosaur2FenceType } from "./nanosaur2FenceType";

function withBaseUrl(path: string): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
  return `${base}${path.replace(/^\/+/, "")}`;
}

/**
 * Gets the asset path for a fence image based on game type and fence type
 */
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

    case Game.BUGDOM_2: {
      // Bugdom 2 fence thumbnails come from the ported sprite series in the
      // Bugdom 2 data tree, not from Bugdom 1's fence JPGs.
      const bugdom2FenceImages = [
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/012.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level1_Garden/004.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/002.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/013.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/003.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/004.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/002.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/003.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level9_Balsa/001.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/001.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/002.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/003.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/004.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level10_Park/000.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/000.tga",
        "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/001.tga",
      ];
      return withBaseUrl(bugdom2FenceImages[fenceType] ?? bugdom2FenceImages[0]!);
    }

    case Game.BILLY_FRONTIER: {
      // Map fence types to the actual sprite filenames from the Billy Frontier source.
      // Based on games/billyfrontier/Source/Terrain/Fences.c and Source/Headers/sobjtypes.h:
      // FENCE_TYPE_WOOD     -> GLOBAL_SObjType_Fence_Wood      (global003.png)
      // FENCE_TYPE_WHITE    -> GLOBAL_SObjType_Fence_White     (global004.png)
      // FENCE_TYPE_CANYON   -> STAMPEDE_SObjType_Fence_Canyon (stampede000.png)
      // FENCE_TYPE_TALLGRASS-> GLOBAL_SObjType_Fence_TallGrass(global005.png)
      // FENCE_TYPE_SMALLGRASS->GLOBAL_SObjType_Fence_SmallGrass(global006.png)
      // FENCE_TYPE_SWAMPTREE-> GLOBAL_SObjType_Fence_SwampTree (global007.png)
      // FENCE_TYPE_PICKETFENCE-> GLOBAL_SObjType_Fence_PicketFence (global002.png)
      const billyFiles = [
        "global003.png", // WOOD
        "global004.png", // WHITE
        "stampede000.png", // CANYON (stampede group)
        "global005.png", // TALLGRASS
        "global006.png", // SMALLGRASS
        "global007.png", // SWAMPTREE
        "global002.png", // PICKETFENCE
      ];
      return withBaseUrl(
        `assets/billyFrontier/fences/${billyFiles[fenceType] || "global003.png"}`,
      );
    }

    case Game.CRO_MAG: {
      // CroMag has specific file names for each fence type
      const croMagFiles = [
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
      return withBaseUrl(
        fenceType < croMagFiles.length
          ? `assets/croMag/fences/${croMagFiles[fenceType]}`
          : `assets/croMag/fences/desertskin.png`,
      ); // fallback
    }

    case Game.NANOSAUR_2: {
      switch (fenceType) {
        case Nanosaur2FenceType.LEVEL_1_PINETREE:
          return withBaseUrl("assets/nanosaur2/fences/pinefence.jpg");
        case Nanosaur2FenceType.LEVEL_2_DUSTDEVIL:
          return withBaseUrl("assets/nanosaur2/fences/dustdevil.jpg");
        case Nanosaur2FenceType.LEVEL_1_BLOCKENEMY:
        case Nanosaur2FenceType.LEVEL_2_BLOCKENEMY:
        case Nanosaur2FenceType.LEVEL_3_BLOCKENEMY:
        default:
          return withBaseUrl("assets/nanosaur2/fences/blockenemy.png");
      }
    }

    case Game.NANOSAUR:
      // Nanosaur typically doesn't have fences
      return "";

    default:
      return "";
  }
}
