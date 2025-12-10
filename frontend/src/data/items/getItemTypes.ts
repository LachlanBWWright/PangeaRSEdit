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
import { ItemType as OttoItemType } from "./TerrainItemType";
import { Result, ok, err } from "../../types/result";

export function getItemTypes(globals: GlobalsInterface): Result<string[], Error> {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return ok(Object.keys(BillyItemType));
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return ok(Object.keys(BugdomItemType));
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return ok(Object.keys(Bugdom2ItemType));
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return ok(Object.keys(CroMagItemType));
  } else if (globals.GAME_TYPE === Game.NANOSAUR) {
    return ok(Object.keys(NanosaurItemType));
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return ok(Object.keys(Nanosaur2ItemType));
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return ok(Object.keys(OttoItemType));
  }

  return err(new Error("Invalid game type!"));
}
