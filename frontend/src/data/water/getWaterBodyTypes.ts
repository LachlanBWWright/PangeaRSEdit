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
import { Result, ok, err } from "../../types/result";

export function getWaterBodyTypes(globals: GlobalsInterface): Result<string[], Error> {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return ok(Object.keys(BillyWaterBodyType));
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return ok(Object.keys(BugdomWaterBodyType));
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return ok(Object.keys(Bugdom2WaterBodyType));
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return ok(Object.keys(CroMagWaterBodyType));
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return ok(Object.keys(Nanosaur2WaterBodyType));
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return ok(Object.keys(OttoWaterBodyType));
  }

  return err(new Error("Invalid water body type!"));
}
