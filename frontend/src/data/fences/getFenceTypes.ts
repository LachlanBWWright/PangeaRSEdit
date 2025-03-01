import { Game, GlobalsInterface } from "../globals/globals";

import { FenceType as BillyFenceType } from "./billyFrontierFenceType";
//Bugdom 1
import { FenceType as BugdomFenceType } from "./bugdomFenceType";
//Bugdom 2
import { FenceType as Bugdom2FenceType } from "./bugdom2FenceType";
//Cro Mag
import { FenceType as CroMagFenceType } from "./croMagFenceType";
//Nanosaur 2
import { FenceType as Nanosaur2FenceType } from "./nanosaur2FenceType";
//Otto Matic
import { FenceType as OttoFenceType } from "./ottoFenceType";

export function getFenceTypes(globals: GlobalsInterface) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return Object.keys(BillyFenceType);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return Object.keys(BugdomFenceType);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return Object.keys(Bugdom2FenceType);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return Object.keys(CroMagFenceType);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return Object.keys(Nanosaur2FenceType);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return Object.keys(OttoFenceType);
  }

  throw new Error("Invalid Game Type");
}
