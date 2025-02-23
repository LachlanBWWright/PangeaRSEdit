import { Game, GlobalsInterface } from "../globals/globals";
import { ItemType as BillyItemType } from "./billyFrontierItemType";
//Bugdom 1
import { ItemType as BugdomItemType } from "./bugdomItemType";
//Bugdom 2
import { ItemType as Bugdom2ItemType } from "./bugdom2ItemType";
//Cro Mag
import { ItemType as CroMagItemType } from "./croMagItemType";
//Nanosaur 1
import { ItemType as NanosaurItemType } from "./nanosaurItemType";
//Nanosaur 2
import { ItemType as Nanosaur2ItemType } from "./nanosaur2ItemType";
import { ItemType as OttoItemType } from "./ottoItemType";

export function getItemTypes(globals: GlobalsInterface) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return Object.keys(BillyItemType);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return Object.keys(BugdomItemType);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return Object.keys(Bugdom2ItemType);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return Object.keys(CroMagItemType);
  } else if (globals.GAME_TYPE === Game.NANOSAUR) {
    return Object.keys(NanosaurItemType);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return Object.keys(Nanosaur2ItemType);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return Object.keys(OttoItemType);
  }

  throw new Error("Invalid game type!");
}
