import { Game, GlobalsInterface } from "../globals/globals";
import {
  WaterBodyType as BillyWaterBodyType,
  waterBodyNames as billyWaterBodyTypeNames,
} from "./billyFrontierWaterBodyType";
//Bugdom 1
import {
  WaterBodyType as BugdomWaterBodyType,
  waterBodyNames as bugdomWaterBodyTypeNames,
} from "./bugdomWaterBodyType";
//Bugdom 2
import {
  WaterBodyType as Bugdom2WaterBodyType,
  waterBodyNames as bugdom2WaterBodyTypeNames,
} from "./bugdom2WaterBodyType";
//Cro Mag
import {
  WaterBodyType as CroMagWaterBodyType,
  waterBodyNames as croMagWaterBodyTypeNames,
} from "./croMagWaterBodyType";
//Nanosaur 1 has water as an item
//Nanosaur 2
import {
  WaterBodyType as Nanosaur2WaterBodyType,
  waterBodyNames as nanosaur2WaterBodyTypeNames,
} from "./nanosaur2WaterBodyType";
import {
  WaterBodyType as OttoWaterBodyType,
  waterBodyNames as ottoWaterBodyTypeNames,
} from "./ottoWaterBodyType";

export function getItemName(globals: GlobalsInterface, itemNumber: number) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return getBillyItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return getBugdomItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return getBugdom2ItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return getCroMagItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return getNanosaur2ItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return getOttoItemName(itemNumber);
  } else return "Unknown Item.";
}

function getBillyItemName(number: number) {
  if (number in billyWaterBodyTypeNames)
    return billyWaterBodyTypeNames[number as BillyWaterBodyType];

  return "Unknown Billy Item.";
}

function getBugdomItemName(number: number) {
  if (number in bugdomWaterBodyTypeNames)
    return bugdomWaterBodyTypeNames[number as BugdomWaterBodyType];

  return "Unknown Bugdom Item.";
}

function getBugdom2ItemName(number: number) {
  if (number in bugdom2WaterBodyTypeNames)
    return bugdom2WaterBodyTypeNames[number as Bugdom2WaterBodyType];

  return "Unknown Bugdom 2 Item.";
}

function getCroMagItemName(number: number) {
  if (number in croMagWaterBodyTypeNames)
    return croMagWaterBodyTypeNames[number as CroMagWaterBodyType];

  return "Unknown Cro Mag Item.";
}

function getNanosaur2ItemName(number: number) {
  if (number in nanosaur2WaterBodyTypeNames)
    return nanosaur2WaterBodyTypeNames[number as Nanosaur2WaterBodyType];

  return "Unknown Nanosaur 2 Item.";
}

function getOttoItemName(number: number) {
  if (number in ottoWaterBodyTypeNames)
    return ottoWaterBodyTypeNames[number as OttoWaterBodyType];

  return "Unknown Otto Item.";
}
