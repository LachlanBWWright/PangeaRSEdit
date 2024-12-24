import { Game, GlobalsInterface } from "../globals/globals";
import {
  SplineItemType as OttoSplineItemType,
  splineItemTypeNames as ottoSplineItemTypeNames,
} from "./ottoSplineItemType";
import {
  SplineItemType as Bugdom2SplineItemType,
  splineItemTypeNames as bugdom2SplineItemTypeNames,
} from "./bugdom2SplineItemType";

export function NameMaker(globals: GlobalsInterface): (id: number) => string {
  if (globals.GAME_TYPE === Game.BUGDOM_2) {
    return (id: number) =>
      Object.keys(Bugdom2SplineItemType).includes(id.toString())
        ? bugdom2SplineItemTypeNames[id as Bugdom2SplineItemType]
        : "Unknown Name";
  }

  return (id: number) =>
    Object.keys(OttoSplineItemType).includes(id.toString())
      ? ottoSplineItemTypeNames[id as OttoSplineItemType]
      : "Unknown Name";
}
