import { Updater } from "use-immer";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { useEffect } from "react";

export function OttoDataDeps({
  children,
  data,
  setData,
}: {
  children: React.ReactNode;
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  //Update Fence Counts

  console.log("DATA", data);
  useEffect(() => {
    console.log("data", data);
    setData((data) => {
      data.Hedr[1000].obj.numFences = data.Fenc[1000].obj.length;
    });
  }, [data.Fenc]);

  useEffect(() => {
    setData((data) => {
      data.Hedr[1000].obj.numItems = data.Itms[1000].obj.length;
    });
  }, [data.Itms]);

  return <>{children}</>;
}
