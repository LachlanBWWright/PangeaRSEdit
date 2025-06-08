import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { SPLINE_KEY_BASE } from "../../editor/subviews/splines/Spline";
import { GlobalsInterface } from "../globals/globals";

export function preprocessJson(json: any, globals: GlobalsInterface) {
  console.log(json);
  // Ensure Layr points to unique Atrb values, and Atrb values match underlying values
  if (json.Layr && json.Atrb && json.Layr[1000] && json.Atrb[1000]) {
    console.log(json);
    const layrArr = json.Layr[1000].obj;
    const atrbArr = json.Atrb[1000].obj;

    console.log("layrArr", layrArr);
    console.log("atrbArr", atrbArr);
    const newAtrbArr = [];
    const newLayrArr = [];

    for (let i = 0; i < layrArr.length; i++) {
      newLayrArr.push(i);
      newAtrbArr.push(atrbArr[layrArr[i]]);
    }

    console.log("newAtrbArr", newAtrbArr);
    console.log("newLayrArr", newLayrArr);
    json.Atrb[1000].obj = newAtrbArr;
    json.Layr[1000].obj = newLayrArr;
  } else {
    console.warn("Layr or Atrb not found in JSON");
  }

  if (json.Liqd) {
    for (const waterItem of json.Liqd[1000].obj) {
      const nubs: [number, number][] = [];

      for (let i = 0; i < globals.LIQD_NUBS; i++) {
        nubs.push([waterItem[`x_${i}`], waterItem[`y_${i}`]]);
      }
      waterItem.nubs = nubs;
    }
  }
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

    data.Itms[1000].obj.sort((a, b) => {
      if (a.x > b.x) return 1;
      else if (a.x < b.x) return -1;
      else {
        if (a.z > b.z) return 1;
        else if (a.z < b.z) return -1;
        else return 0;
      }
    });

    const anyData: any = data;
    if (data.Liqd !== undefined)
      for (const waterItem of anyData.Liqd[1000].obj) {
        for (let i = 0; i < globals.LIQD_NUBS; i++) {
          waterItem[`x_${i}`] = waterItem.nubs[i][0];
          waterItem[`y_${i}`] = waterItem.nubs[i][1];
        }
      }

    //Fix spline numnubs
    if (data.Spln! !== undefined)
      for (let i = 0; i < data.Spln[1000].obj.length; i++) {
        const splineIdx = SPLINE_KEY_BASE + i;

        const numPoints = data.SpPt[splineIdx].obj.length;
        data.Spln[1000].obj[i].numPoints = numPoints;

        const numNubs = data.SpNb[splineIdx].obj.length;
        data.Spln[1000].obj[i].numNubs = numNubs;

        const numItems = data.SpIt[splineIdx].obj.length;
        data.Spln[1000].obj[i].numItems = numItems;
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

        let left = waterBody.nubs[0][0];
        let right = waterBody.nubs[0][0];
        let top = waterBody.nubs[0][1];
        let bottom = waterBody.nubs[0][1];

        //Update bounding box
        for (let i = 0; i < waterBody.numNubs; i++) {
          if (waterBody.nubs[i][0] < left) left = waterBody.nubs[i][0];
          if (waterBody.nubs[i][0] > right) right = waterBody.nubs[i][0];
          if (waterBody.nubs[i][1] < top) top = waterBody.nubs[i][1];
          if (waterBody.nubs[i][1] > bottom) bottom = waterBody.nubs[i][1];
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
