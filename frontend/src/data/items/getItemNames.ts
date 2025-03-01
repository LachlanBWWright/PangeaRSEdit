import { Game, GlobalsInterface } from "../globals/globals";
import {
  ItemType as BillyItemType,
  itemTypeNames as billyItemTypeNames,
} from "./billyFrontierItemType";
//Bugdom 1
import {
  ItemType as BugdomItemType,
  itemTypeNames as bugdomItemTypeNames,
} from "./bugdomItemType";
//Bugdom 2
import {
  ItemType as Bugdom2ItemType,
  itemTypeNames as bugdom2ItemTypeNames,
} from "./bugdom2ItemType";
//Cro Mag
import {
  ItemType as CroMagItemType,
  itemTypeNames as croMagItemTypeNames,
} from "./croMagItemType";
//Nanosaur 1
import {
  ItemType as NanosaurItemType,
  itemTypeNames as nanosaurItemTypeNames,
} from "./nanosaurItemType";
//Nanosaur 2
import {
  ItemType as Nanosaur2ItemType,
  itemTypeNames as nanosaur2ItemTypeNames,
} from "./nanosaur2ItemType";
import {
  ItemType as OttoItemType,
  itemTypeNames as ottoItemTypeNames,
} from "./ottoItemType";

export function getItemName(globals: GlobalsInterface, itemNumber: number) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return getBillyItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return getBugdomItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return getBugdom2ItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return getCroMagItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.NANOSAUR) {
    return getNanosaurItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return getNanosaur2ItemName(itemNumber);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return getOttoItemName(itemNumber);
  } else return "Unknown Item.";
}

function getBillyItemName(number: number) {
  if (number in billyItemTypeNames)
    return billyItemTypeNames[number as BillyItemType];

  return "Unknown Billy Item.";
}

function getBugdomItemName(number: number) {
  if (number in bugdomItemTypeNames)
    return bugdomItemTypeNames[number as BugdomItemType];

  return "Unknown Bugdom Item.";
}

function getBugdom2ItemName(number: number) {
  if (number in bugdom2ItemTypeNames)
    return bugdom2ItemTypeNames[number as Bugdom2ItemType];

  return "Unknown Bugdom 2 Item.";
}

function getCroMagItemName(number: number) {
  if (number in croMagItemTypeNames)
    return croMagItemTypeNames[number as CroMagItemType];

  return "Unknown Cro Mag Item.";
}

function getNanosaurItemName(number: number) {
  if (number in nanosaurItemTypeNames)
    return nanosaurItemTypeNames[number as NanosaurItemType];

  return "Unknown Nanosaur Item.";
}

function getNanosaur2ItemName(number: number) {
  if (number in nanosaur2ItemTypeNames)
    return nanosaur2ItemTypeNames[number as Nanosaur2ItemType];

  return "Unknown Nanosaur 2 Item.";
}

function getOttoItemName(number: number) {
  if (number in ottoItemTypeNames)
    return ottoItemTypeNames[number as OttoItemType];

  return "Unknown Otto Item.";
}
