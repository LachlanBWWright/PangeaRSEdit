import { parseKeyFData } from "../parseHelpers";
import type { KeyFRaw } from "../parseSkeletonRsrcTS";

export function handleKeyF(
  resourceName: string,
  resourceData: KeyFRaw[] | { obj?: KeyFRaw[] } | undefined,
  resourceId: string,
  hexData: string,
) {
  console.log(resourceId, hexData);
  const castedData = resourceData as { obj?: KeyFRaw[] };
  if (
    resourceData &&
    castedData.obj &&
    Array.isArray(castedData.obj) &&
    castedData.obj.length > 0 &&
    (castedData.obj[0] as Record<string, unknown>)["tick"] !== undefined
  ) {
    const obj = castedData.obj;
    console.log(
      `KeyF ${resourceName} data from rsrcdump:`,
      obj.length,
      "keyframes",
    );
    return obj;
  } else if (
    resourceData &&
    (resourceData as { obj?: KeyFRaw[] }).obj &&
    Array.isArray((resourceData as { obj?: KeyFRaw[] }).obj)
  ) {
    const obj = (resourceData as { obj?: KeyFRaw[] }).obj!;
    console.log(
      `KeyF ${resourceName} empty/malformed from rsrcdump:`,
      obj.length,
      "keyframes",
    );
    return obj;
  } else {
    console.log(`KeyF ${resourceName} raw resourceData:`, resourceData);
    console.log(`KeyF ${resourceName} resourceData type:`, typeof resourceData);
    const resourceRecord = resourceData as Record<string, unknown> | null | undefined;
    console.log(
      `KeyF ${resourceName} resourceData.keys:`,
      Object.keys(resourceRecord || {}),
    );
    const hex = (resourceRecord as { data?: string } | undefined)?.data || "";
    console.log(`KeyF ${resourceName} hex data length:`, hex.length);
    const obj = parseKeyFData(hex);
    console.log(
      `KeyF ${resourceName} parsed from hex:`,
      obj.length,
      "keyframes",
    );
    return obj;
  }
}
