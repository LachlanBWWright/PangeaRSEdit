import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { SPLINE_KEY_BASE } from "../../editor/subviews/splines/Spline";
import { Game, GlobalsInterface } from "../globals/globals";
import { Result, ok, err } from "../../types/result";

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function preprocessJson(json: any, globals: GlobalsInterface): Result<void, Error> {
  console.log(json);

  // For Bugdom 1 and Nanosaur 1, Layr contains tile indices with flip/rotate bits - DO NOT MODIFY!
  // The Layr preprocessing below is only for Otto Matic and other games where Layr contains Atrb indices.
  if (
    globals.GAME_TYPE === Game.BUGDOM ||
    globals.GAME_TYPE === Game.NANOSAUR
  ) {
    console.log(
      `${globals.GAME_NAME}: Skipping Layr/Atrb preprocessing (Layr contains tile indices with flip/rotate bits)`,
    );
  } else if (json.Layr && json.Atrb && json.Layr[1000] && json.Atrb[1000]) {
    // Otto Matic and other games: Ensure Layr points to unique Atrb values
    console.log(json);
    const layrArr = json.Layr[1000].obj;
    const atrbArr = json.Atrb[1000].obj;

    console.log("layrArr", layrArr);
    console.log("atrbArr", atrbArr);
    
    if (!Array.isArray(layrArr)) {
      return err(new Error("Layr[1000].obj is not an array"));
    }
    if (!Array.isArray(atrbArr)) {
      return err(new Error("Atrb[1000].obj is not an array"));
    }
    
    const newAtrbArr = [];
    const newLayrArr = [];

    for (let i = 0; i < layrArr.length; i++) {
      newLayrArr.push(i);
      const layrIndex = layrArr[i];
      if (layrIndex === undefined) {
        return err(new Error(`Layr index ${i} is undefined`));
      }
      const atrbValue = atrbArr[layrIndex];
      if (atrbValue === undefined) {
        return err(new Error(`Atrb index ${layrIndex} is undefined`));
      }
      newAtrbArr.push(atrbValue);
    }

    console.log("newAtrbArr", newAtrbArr);
    console.log("newLayrArr", newLayrArr);
    json.Atrb[1000].obj = newAtrbArr;
    json.Layr[1000].obj = newLayrArr;
  } else {
    console.warn("Layr or Atrb not found in JSON");
  }

  if (json.Liqd) {
    const liquidObj = json.Liqd[1000]?.obj;
    if (!Array.isArray(liquidObj)) {
      return err(new Error("Liqd[1000].obj is not an array"));
    }
    for (const waterItem of liquidObj) {
      const nubs: [number, number][] = [];

      for (let i = 0; i < globals.LIQD_NUBS; i++) {
        nubs.push([waterItem[`x_${i}`], waterItem[`y_${i}`]]);
      }
      waterItem.nubs = nubs;
    }
  }
  
  return ok(undefined);
}

export function ottoPreprocessor(
  setData: Updater<ottoMaticLevel>,
  globals: GlobalsInterface,
) {
  setData((data) => {
    data.Hedr[1000].obj.numFences = data.Fenc?.[1000].obj.length ?? 0;
    data.Hedr[1000].obj.numItems = data.Itms?.[1000].obj.length ?? 0;
    data.Hedr[1000].obj.numWaterPatches = data.Liqd?.[1000].obj.length ?? 0;
    data.Hedr[1000].obj.numSplines = data.Spln?.[1000].obj.length ?? 0;

    data.Itms?.[1000].obj.sort((a, b) => {
      if (a.x > b.x) return 1;
      else if (a.x < b.x) return -1;
      else {
        if (a.z > b.z) return 1;
        else if (a.z < b.z) return -1;
        else return 0;
      }
    });

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const anyData: any = data;
    if (data.Liqd !== undefined)
      for (const waterItem of anyData.Liqd[1000].obj) {
        for (let i = 0; i < globals.LIQD_NUBS; i++) {
          const nub = waterItem.nubs[i];
          if (nub) {
            waterItem[`x_${i}`] = nub[0];
            waterItem[`y_${i}`] = nub[1];
          }
        }
      }

    //Fix spline numnubs
    if (data.Spln !== undefined)
      for (let i = 0; i < data.Spln[1000].obj.length; i++) {
        const splineIdx = SPLINE_KEY_BASE + i;
        const spline = data.Spln[1000].obj[i];
        if (!spline) continue;

        const numPoints = data.SpPt?.[splineIdx]?.obj.length ?? 0;
        spline.numPoints = numPoints;

        const numNubs = data.SpNb?.[splineIdx]?.obj.length ?? 0;
        spline.numNubs = numNubs;

        const numItems = data.SpIt?.[splineIdx]?.obj.length ?? 0;
        spline.numItems = numItems;
      }

    //TODO: Fence Bounding Boxes

    //Update Water Bounding Boxes
    if (data.Liqd !== undefined) {
      for (
        let waterBodyIdx = 0;
        waterBodyIdx < data.Liqd[1000].obj.length;
        waterBodyIdx++
      ) {
        const waterBody = data.Liqd[1000].obj[waterBodyIdx];

        if (!waterBody) return;

        const firstNub = waterBody.nubs[0];
        if (!firstNub) continue;

        let left = firstNub[0];
        let right = firstNub[0];
        let top = firstNub[1];
        let bottom = firstNub[1];

        //Update bounding box
        for (let i = 0; i < waterBody.numNubs; i++) {
          const nub = waterBody.nubs[i];
          if (!nub) continue;
          if (nub[0] < left) left = nub[0];
          if (nub[0] > right) right = nub[0];
          if (nub[1] < top) top = nub[1];
          if (nub[1] > bottom) bottom = nub[1];
        }

        waterBody.bBoxLeft = left;
        waterBody.bBoxRight = right;
        waterBody.bBoxTop = top;
        waterBody.bBoxBottom = bottom;
      }
    }

    // Create a map of unique values in data.Atrb[1000].obj
    //TODO: This is disabled as it breaks tile property editing if you download and continue editing a map
    /*     const atrbArr = data.Atrb?.[1000]?.obj;
    if (Array.isArray(atrbArr)) {
      const newAtrbArr = [];
      const atrbValueToIndex = new Map();
      let newIndex = 0;
      for (let i = 0; i < atrbArr.length; i++) {
        const value = atrbArr[i];
        const stringifiedValue = JSON.stringify(value);
        if (!atrbValueToIndex.has(stringifiedValue)) {
          atrbValueToIndex.set(stringifiedValue, newIndex);
          newAtrbArr.push(value);
          newIndex++;
        }
      }

      for (const layr of data.Layr[1000].obj) {
        //console.log("layr", layr);
        const newIdx = atrbValueToIndex.get(
          JSON.stringify(data.Atrb[1000].obj[layr]),
        );
        if (newIdx === undefined) throw new Error("Invalid Atrb index");
        // Update the Layr index to point to the new Atrb index
        data.Layr[1000].obj[layr] = newIdx;
      }
      data.Atrb[1000].obj = newAtrbArr;
    } */

    //data.Atrb

    //TODO: Setting Order

    //HEDR (0) => alis (1-39) => ATrb(40) => Layr (41) => YCrd (42) => STgd (43)
    //=> Itms(44) => ItCo(45) => Spln(46) => SpNB(47 - 64) => SpPt(65 - 82) => SpIt(83 - 100)
    //Fenc (101) => FnNb (102-150) => Liqd (151) =>
  });
}
