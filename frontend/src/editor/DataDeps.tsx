import React from "react";
import { OttoDataDeps } from "./OttoDataDeps";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";

export function DataDeps({
  children,
  data,
  setData,
}: {
  children: React.ReactNode;
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  console.log("Datadepsdata", data);

  return (
    <OttoDataDeps data={data} setData={setData}>
      {children}
    </OttoDataDeps>
  );
}
