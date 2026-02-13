import { Game, GlobalsInterface } from "../globals/globals";
import { FenceType as Nanosaur2FenceType } from "./nanosaur2FenceType";

/**
 * Gets the height of a fence type based on the game.
 * Heights are in world units and come directly from the source game code (gFenceHeight arrays).
 */
export function getFenceHeight(
  globals: GlobalsInterface,
  fenceType: number,
): number {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC: {
      const ottoHeights = [
        430, // wood fence
        1100, // corn stalk
        440, // chickenwire
        440, // metal fence
        1100, // PINK crystal
        550, // mech
        1100, // slime tree
        1100, // BLUE crystal
        550, // mech 2
        1500, // jungle wooden
        1300, // jungle fern
        900, // lamp
        1000, // rubble
        900, // CRUNCH
        500, // FENCE_TYPE_FUN
        1100, // FENCE_TYPE_HEDGE
        800, // FENCE_TYPE_LINE
        600, // FENCE_TYPE_TENT
        800, // FENCE_TYPE_LAVA
        800, // FENCE_TYPE_ICE
        150, // FENCE_TYPE_SAUCER
        600, // FENCE_TYPE_NEURON
      ];
      return ottoHeights[fenceType] || 300;
    }

    case Game.BUGDOM: {
      const bugdomHeights = [
        600, // thorn
        1000, // wheat
        1000, // grass
        500, // ????
        1000, // night
        2000, // pond
        200, // moss
        6000, // wood
        1200, // hive
      ];
      return bugdomHeights[fenceType] || 1000;
    }

    case Game.BUGDOM_2: {
      const bugdom2Heights = [
        1100, // FENCE_TYPE_GRASS
        300, // FENCE_TYPE_LAWNEDGING
        600, // FENCE_TYPE_DOGHAIR
        1300, // FENCE_TYPE_BRICKWALL
        600, // FENCE_TYPE_DOGCOLLAR
        700, // FENCE_TYPE_DOGHAIRDENSE
        550, // FENCE_TYPE_CARD
        800, // FENCE_TYPE_BLOCK
        3800, // FENCE_TYPE_BALSA
        1800, // FENCE_TYPE_CLOTH
        1100, // FENCE_TYPE_BOOKS
        800, // FENCE_TYPE_COMPUTER
        1000, // FENCE_TYPE_SHOEBOX
        1100, // FENCE_TYPE_WATERGRASS
        1000, // FENCE_TYPE_GARBAGECAN
        1100, // FENCE_TYPE_BOXFENCE
      ];
      return bugdom2Heights[fenceType] || 1000;
    }

    case Game.NANOSAUR_2: {
      switch (fenceType) {
        case Nanosaur2FenceType.LEVEL_1_PINETREE:
          return 1000;
        case Nanosaur2FenceType.LEVEL_2_DUSTDEVIL:
          return 300;
        case Nanosaur2FenceType.LEVEL_1_BLOCKENEMY:
        case Nanosaur2FenceType.LEVEL_2_BLOCKENEMY:
        case Nanosaur2FenceType.LEVEL_3_BLOCKENEMY:
        default:
          return 300;
      }
    }

    case Game.CRO_MAG: {
      const croMagHeights = [
        2000, // desert skin
        3200, // INVISIBLE
        1400, // China - Multicolored
        1400, // China - Red
        1400, // China - White
        1400, // China - Yellow
        1800, // Hieroglyphs
        1000, // Camel xing
        700, // farm
        1500, // Aztec
        1000, // Rock Wall
        5000, // Tall Rock Wall
        1500, // Rock Pile
        1300, // Tribal
        1300, // horns
        1300, // crete
        1300, // rock pile 2
        1300, // orange rock
        7000, // 18: Sea Weed 1
        7000, // Sea Weed 2
        7000, // Sea Weed 3
        7000, // Sea Weed 4
        7000, // Sea Weed 5
        7000, // Sea Weed 6
        1800, // China - Concrete
        1900, // China -Design
        2000, // Viking
      ];
      return croMagHeights[fenceType] || 1500;
    }

    case Game.BILLY_FRONTIER: {
      const billyHeights = [
        200, // wood
        200, // white
        900, // canyon
        250, // tall grass
        100, // small grass
        450, // swamp tree
        200, // picket
      ];
      return billyHeights[fenceType] || 200;
    }

    case Game.NANOSAUR:
    default:
      return 1000; // Default fallback
  }
}
