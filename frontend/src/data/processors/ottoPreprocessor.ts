import { Updater } from "use-immer";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { SPLINE_KEY_BASE } from "../../editor/subviews/splines/splineUtils";
import { Game, GlobalsInterface } from "../globals/globals";
import { Result, ok, err } from "../../types/result";

/**
 * Check if the game uses Layr as direct tile indices with flip/rotate bits
 * (as opposed to Otto Matic/CroMag which use Layr to index into Atrb)
 */
function usesLayrAsTileIndices(globals: GlobalsInterface): boolean {
  // All games EXCEPT Otto Matic and CroMag use Layr as tile indices
  return globals.GAME_TYPE !== Game.OTTO_MATIC && globals.GAME_TYPE !== Game.CRO_MAG;
}

// we intentionally accept a free-form JSON object here — linting for explicit any is suppressed

export function preprocessJson(
  json: Record<string, unknown>,
  globals: GlobalsInterface,
): Result<void, Error> {
  const anyJson = json as Record<string, unknown>;

  // For games that use Layr as tile indices with flip/rotate bits - DO NOT MODIFY!
  // The Layr preprocessing below is only for Otto Matic and CroMag where Layr contains Atrb indices.
  if (usesLayrAsTileIndices(globals)) {
    // Skip preprocessing for games that use Layr as direct tile indices
  } else if (
    anyJson.Layr &&
    anyJson.Atrb &&
    typeof anyJson.Layr === 'object' &&
    typeof anyJson.Atrb === 'object' &&
    1000 in anyJson.Layr &&
    1000 in anyJson.Atrb
  ) {
    // Otto Matic and other games: Ensure Layr points to unique Atrb values
    const layrRecord = anyJson.Layr as Record<number, { obj: unknown }>;
    const atrbRecord = anyJson.Atrb as Record<number, { obj: unknown }>;
    const layr1000 = layrRecord[1000];
    const atrb1000 = atrbRecord[1000];
    if (!layr1000 || !atrb1000) {
      return err(new Error("Layr[1000] or Atrb[1000] is undefined"));
    }
    const layrArr = layr1000.obj;
    const atrbArr = atrb1000.obj;

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

    atrb1000.obj = newAtrbArr;
    layr1000.obj = newLayrArr;
  }

  if (anyJson.Liqd && typeof anyJson.Liqd === 'object' && 1000 in anyJson.Liqd) {
    const liqd = anyJson.Liqd as Record<number, { obj: unknown }>;
    const liquidObj = liqd[1000]?.obj;
    if (!Array.isArray(liquidObj)) {
      return err(new Error("Liqd[1000].obj is not an array"));
    }
    for (const waterItem of liquidObj) {
      const item = waterItem as Record<string, number | { x: number; y: number }[] | [number, number][] | undefined>;
      
      // HANDLE NEW RSRCDUMP-TS v1.0.6 FORMAT WITH BACKTICK MACRO
      // rsrcdump-ts outputs x`y[100] as an array of {x, y} objects
      if (item['x`y'] && Array.isArray(item['x`y'])) {
        const xyArray = item['x`y'] as { x: number; y: number }[];
        // Convert from [{x, y}, ...] to [[x, y], ...]
        const nubs: [number, number][] = [];
        for (let i = 0; i < globals.LIQD_NUBS; i++) {
          if (i < xyArray.length && xyArray[i]) {
            const coord = xyArray[i];
            if (coord) {  // Type guard
              nubs.push([coord.x ?? 0, coord.y ?? 0]);
            } else {
              nubs.push([0, 0]);
            }
          } else {
            nubs.push([0, 0]);
          }
        }
        item.nubs = nubs;
        // Remove the x`y field to avoid confusion
        delete item['x`y'];
        continue;
      }
      
      // Check if nubs array already exists (should be rare now with v1.0.6)
      if (item.nubs && Array.isArray(item.nubs)) {
        // Already in new format - validate and ensure proper structure
        const existingNubs = item.nubs as ([number, number] | { x: number; y: number })[];
        
        // Validate each nub is a proper [number, number] tuple
        const validatedNubs: [number, number][] = [];
        for (let i = 0; i < globals.LIQD_NUBS; i++) {
          if (i < existingNubs.length && existingNubs[i]) {
            const nub = existingNubs[i];
            // Handle both array tuple and object format
            if (Array.isArray(nub) && nub.length >= 2 && typeof nub[0] === 'number' && typeof nub[1] === 'number') {
              validatedNubs.push([nub[0], nub[1]]);
            } else if (typeof nub === 'object' && 'x' in nub && 'y' in nub) {
              // Handle {x, y} object format
              validatedNubs.push([nub.x ?? 0, nub.y ?? 0]);
            } else {
              validatedNubs.push([0, 0]);
            }
          } else {
            validatedNubs.push([0, 0]);
          }
        }
        item.nubs = validatedNubs;
        continue; // Already processed
      }
      
      // Build nubs array from x_0, y_0, x_1, y_1, etc. fields (old format - should be very rare)
      const nubs: [number, number][] = [];
      let hasAnyNubFields = false;
      
      for (let i = 0; i < globals.LIQD_NUBS; i++) {
        const xKey = `x_${i}`;
        const yKey = `y_${i}`;
        const xVal = item[xKey];
        const yVal = item[yKey];
        
        if (xVal !== undefined && yVal !== undefined) {
          hasAnyNubFields = true;
          nubs.push([xVal as number, yVal as number]);
        } else {
          // Missing individual fields, use 0,0 as fallback
          nubs.push([0, 0]);
        }
      }
      
      // Set nubs - prefer found fields, otherwise initialize empty
      if (hasAnyNubFields) {
        item.nubs = nubs;
      } else {
        // No nubs data at all - initialize empty with unique arrays for each element
        item.nubs = Array.from({ length: globals.LIQD_NUBS }, () => [0, 0]);
      }
    }
  }

  return ok(undefined);
}

export function ottoPreprocessor(
  setData: Updater<LevelData>,
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

    // Cast for backwards compatibility transformation
    // We're accessing Liqd as any since we're doing a transformation
    if (data.Liqd !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liqd = (data as any).Liqd;
      for (const waterItem of liqd?.[1000]?.obj ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = waterItem as Record<string, any>;
        for (let i = 0; i < globals.LIQD_NUBS; i++) {
          const nub = item.nubs?.[i];
          if (nub) {
            item[`x_${i}`] = nub[0];
            item[`y_${i}`] = nub[1];
          }
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
