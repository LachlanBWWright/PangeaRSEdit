import { Game, GlobalsInterface } from "../globals/globals";
import { SplineItemType as BillySplineItemType } from "./billyFrontierSplineItemType";
//Bugdom 1
import { SplineItemType as BugdomSplineItemType } from "./bugdomSplineItemType";
//Bugdom 2
import { SplineItemType as Bugdom2SplineItemType } from "./bugdom2SplineItemType";
//Cro Mag
import { SplineItemType as CroMagSplineItemType } from "./croMagSplineItemType";

//Nanosaur 2
import { SplineItemType as Nanosaur2SplineItemType } from "./nanosaur2SplineItemType";
import { SplineItemType as OttoSplineItemType } from "./SplineItemType";
import { Result, ok, err } from "../../types/result";

export function getSplineItemTypes(globals: GlobalsInterface): Result<string[], Error> {
  if (globals.GAME_TYPE === Game.BILLY_FRONTIER) {
    return ok(Object.keys(BillySplineItemType));
  } else if (globals.GAME_TYPE === Game.BUGDOM) {
    return ok(Object.keys(BugdomSplineItemType));
  } else if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return ok(Object.keys(Bugdom2SplineItemType));
  } else if (globals.GAME_TYPE === Game.CRO_MAG) {
    return ok(Object.keys(CroMagSplineItemType));
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    return ok(Object.keys(Nanosaur2SplineItemType));
  } else if (globals.GAME_TYPE === Game.OTTO_MATIC) {
    return ok(Object.keys(OttoSplineItemType));
  }
  return err(new Error("Invalid Game!"));
}
