import { Updater } from "use-immer";
import {
  OTTO_LIQD_NUBS,
  ottoMaticLevel,
} from "../../python/structSpecs/ottoMaticInterface";

export function newJsonProcess(json: any) {
  if (!json.Liqd) return;

  for (const waterItem of json.Liqd[1000].obj) {
    const nubs: [number, number][] = [];

    for (let i = 0; i < OTTO_LIQD_NUBS; i++) {
      nubs.push([waterItem[`x_${i}`], waterItem[`y_${i}`]]);
    }
    waterItem.nubs = nubs;
  }
}

export default function ottoPreprocessor(setData: Updater<ottoMaticLevel>) {
  setData((data) => {
    data.Hedr[1000].obj.numFences = data.Fenc[1000].obj.length;
    data.Hedr[1000].obj.numItems = data.Itms[1000].obj.length;
    data.Hedr[1000].obj.numWaterPatches = data.Liqd[1000].obj.length;
    data.Hedr[1000].obj.numSplines = data.Spln[1000].obj.length;

    data.Itms[1000].obj.sort((a, b) => {
      if (a.x > b.x) return 1;
      else if (a.x < b.x) return -1;
      else {
        if (a.z > b.z) return 1;
        else if (a.z < b.z) return -1;
        else return 0;
      }
    });

    let anyData: any = data;
    for (let waterItem of anyData.Liqd[1000].obj) {
      for (let i = 0; i < OTTO_LIQD_NUBS; i++) {
        waterItem[`x_${i}`] = waterItem.nubs[i][0];
        waterItem[`y_${i}`] = waterItem.nubs[i][1];
      }
    }
    //TODO: Fence Bounding Boxes

    //TODO: Water Bounding Boxes

    //TODO: Setting Order

    //HEDR (0) => alis (1-39) => ATrb(40) => Layr (41) => YCrd (42) => STgd (43)
    //=> Itms(44) => ItCo(45) => Spln(46) => SpNB(47 - 64) => SpPt(65 - 82) => SpIt(83 - 100)
    //Fenc (101) => FnNb (102-150) => Liqd (151) =>
  });
}
