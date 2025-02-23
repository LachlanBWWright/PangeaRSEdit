import { Game, GlobalsInterface } from "../globals/globals";
import { WaterBodyType as BillyWaterBodyType } from "./billyFrontierWaterBodyType";
//Bugdom 1
import { WaterBodyType as BugdomWaterBodyType } from "./bugdomWaterBodyType";
//Bugdom 2
import { WaterBodyType as Bugdom2WaterBodyType } from "./bugdom2WaterBodyType";
//Cro Mag
import { WaterBodyType as CroMagWaterBodyType } from "./croMagWaterBodyType";
//Nanosaur 1 has water as an item
//Nanosaur 2
import { WaterBodyType as Nanosaur2WaterBodyType } from "./nanosaur2WaterBodyType";
import { WaterBodyType as OttoWaterBodyType } from "./ottoWaterBodyType";

export function getWaterBodyTypes(globals: GlobalsInterface) {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return Object.keys(BillyWaterBodyType);
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return Object.keys(BugdomWaterBodyType);
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return Object.keys(Bugdom2WaterBodyType);
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return Object.keys(CroMagWaterBodyType);
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return Object.keys(Nanosaur2WaterBodyType);
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return Object.keys(OttoWaterBodyType);
  }

  throw new Error("Invalid water body type!");
}
