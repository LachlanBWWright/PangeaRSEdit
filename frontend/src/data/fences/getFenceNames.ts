import { Game, GlobalsInterface } from "../globals/globals";

import {
  FenceType as BillyFenceType,
  fenceTypeNames as billyFenceTypeNames,
} from "./billyFrontierFenceType";
//Bugdom 1
import {
  FenceType as BugdomFenceType,
  fenceTypeNames as bugdomFenceTypeNames,
} from "./bugdomFenceType";
//Bugdom 2
import {
  FenceType as Bugdom2FenceType,
  fenceTypeNames as bugdom2FenceTypeNames,
} from "./bugdom2FenceType";
//Cro Mag
import {
  FenceType as CroMagFenceType,
  fenceTypeNames as croMagFenceTypeNames,
} from "./croMagFenceType";
//Nanosaur 2
import {
  FenceType as Nanosaur2FenceType,
  fenceTypeNames as nanosaur2FenceTypeNames,
} from "./nanosaur2FenceType";
//Otto Matic
import {
  FenceType as OttoFenceType,
  fenceTypeNames as ottoFenceTypeNames,
} from "./ottoFenceType";

export function getFenceName(globals: GlobalsInterface, itemNumber: number) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return getBillyFenceName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return getBugdomFenceName(itemNumber);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return getBugdom2FenceName(itemNumber);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return getCroMagFenceName(itemNumber);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return getNanosaur2FenceName(itemNumber);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return getOttoFenceName(itemNumber);
  } else return "Unknown Fence.";
}

function getBillyFenceName(number: number) {
  if (number in billyFenceTypeNames)
    return billyFenceTypeNames[number as BillyFenceType];

  return "Unknown Billy Fence.";
}

function getBugdomFenceName(number: number) {
  if (number in bugdomFenceTypeNames)
    return bugdomFenceTypeNames[number as BugdomFenceType];

  return "Unknown Bugdom Fence.";
}

function getBugdom2FenceName(number: number) {
  if (number in bugdom2FenceTypeNames)
    return bugdom2FenceTypeNames[number as Bugdom2FenceType];

  return "Unknown Bugdom 2 Fence.";
}

function getCroMagFenceName(number: number) {
  if (number in croMagFenceTypeNames)
    return croMagFenceTypeNames[number as CroMagFenceType];

  return "Unknown Cro Mag Fence.";
}

function getNanosaur2FenceName(number: number) {
  if (number in nanosaur2FenceTypeNames)
    return nanosaur2FenceTypeNames[number as Nanosaur2FenceType];

  return "Unknown Nanosaur 2 Fence.";
}

function getOttoFenceName(number: number) {
  if (number in ottoFenceTypeNames)
    return ottoFenceTypeNames[number as OttoFenceType];

  return "Unknown Otto Fence.";
}
