import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";

export default function ottoPreprocessor(setData: Updater<ottoMaticLevel>) {
  setData((data) => {
    data.Hedr[1000].obj.numFences = data.Fenc[1000].obj.length;
    data.Hedr[1000].obj.numItems = data.Itms[1000].obj.length;

    data.Itms[1000].obj.sort((a, b) => {
      if (a.x > b.x) return 1;
      else if (a.x < b.x) return -1;
      else {
        if (a.z > b.z) return 1;
        else if (a.z < b.z) return -1;
        else return 0;
      }
    });
  });
}
