import { parseKeyFData } from "../parseHelpers";
import type { KeyFRaw } from "../parseSkeletonRsrcTS";

export function handleKeyF(
  resourceName: string,
  resourceData: KeyFRaw[] | { obj?: KeyFRaw[] } | undefined,
  _resourceId: string,
  _hexData: string,
) {
  // Keep args referenced to avoid linter unused variable warnings
  void _resourceId;
  void _hexData;
  if (
    resourceData &&
    (resourceData as { obj?: KeyFRaw[] }).obj &&
    Array.isArray((resourceData as { obj?: KeyFRaw[] }).obj) &&
    (resourceData as { obj?: KeyFRaw[] }).obj!.length > 0 &&
    ((resourceData as { obj?: KeyFRaw[] }).obj![0] as Record<string, unknown>)[
      "tick"
    ] !== undefined
  ) {
    const obj = (resourceData as { obj?: KeyFRaw[] }).obj!;
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
    console.log(
      `KeyF ${resourceName} resourceData.keys:`,
      Object.keys((resourceData as unknown as Record<string, unknown>) || {}),
    );
    const hex = (resourceData as unknown as { data?: string })?.data || "";
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
