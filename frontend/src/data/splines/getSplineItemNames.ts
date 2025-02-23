import { Game, GlobalsInterface } from "../globals/globals";
import {
  SplineItemType as BillySplineItemType,
  splineItemTypeNames as billySplineItemTypeNames,
} from "./billyFrontierSplineItemType";
//Bugdom 1
import {
  SplineItemType as BugdomSplineItemType,
  splineItemTypeNames as bugdomSplineItemTypeNames,
} from "./bugdomSplineItemType";
//Bugdom 2
import {
  SplineItemType as Bugdom2SplineItemType,
  splineItemTypeNames as bugdom2SplineItemTypeNames,
} from "./bugdom2SplineItemType";
//Cro Mag
import {
  SplineItemType as CroMagSplineItemType,
  splineItemTypeNames as croMagSplineItemTypeNames,
} from "./croMagSplineItemType";

//Nanosaur 2
import {
  SplineItemType as Nanosaur2SplineItemType,
  splineItemTypeNames as nanosaur2SplineItemTypeNames,
} from "./nanosaur2SplineItemType";
import {
  SplineItemType as OttoSplineItemType,
  splineItemTypeNames as ottoSplineItemTypeNames,
} from "./ottoSplineItemType";

export function getSplineItemName(
  globals: GlobalsInterface,
  itemNumber: number,
) {
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
  if (number in billySplineItemTypeNames)
    return billySplineItemTypeNames[number as BillySplineItemType];

  return "Unknown Billy Item.";
}

function getBugdomItemName(number: number) {
  if (number in bugdomSplineItemTypeNames)
    return bugdomSplineItemTypeNames[number as BugdomSplineItemType];

  return "Unknown Bugdom Item.";
}

function getBugdom2ItemName(number: number) {
  if (number in bugdom2SplineItemTypeNames)
    return bugdom2SplineItemTypeNames[number as Bugdom2SplineItemType];

  return "Unknown Bugdom 2 Item.";
}

function getCroMagItemName(number: number) {
  if (number in croMagSplineItemTypeNames)
    return croMagSplineItemTypeNames[number as CroMagSplineItemType];

  return "Unknown Cro Mag Item.";
}

function getNanosaur2ItemName(number: number) {
  if (number in nanosaur2SplineItemTypeNames)
    return nanosaur2SplineItemTypeNames[number as Nanosaur2SplineItemType];

  return "Unknown Nanosaur 2 Item.";
}

function getOttoItemName(number: number) {
  if (number in ottoSplineItemTypeNames)
    return ottoSplineItemTypeNames[number as OttoSplineItemType];

  return "Unknown Otto Item.";
}
