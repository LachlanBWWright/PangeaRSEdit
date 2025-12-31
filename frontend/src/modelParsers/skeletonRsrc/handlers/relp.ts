import { parseRelPData } from "../parseHelpers";
import type { RelPRaw } from "../parseSkeletonRsrcTS";

export function handleRelP(
  resourceName: string,
  resourceData: RelPRaw[] | { obj?: RelPRaw[] } | undefined,
  resourceId: string,
  hexData: string,
) {
  console.log(
    `[DEBUG] Parsing RelP resource ${resourceName} (${resourceId}):`,
    {
      hasResourceData: Array.isArray(resourceData) && resourceData.length > 0,
      resourceDataLength: Array.isArray(resourceData) ? resourceData.length : 0,
      hexDataLength: hexData?.length || 0,
      resourceKeys: Object.keys(resourceData || {}),
      hasData:
        resourceData &&
        Object.prototype.hasOwnProperty.call(resourceData, "data"),
      hasObj:
        resourceData &&
        Object.prototype.hasOwnProperty.call(resourceData, "obj"),
      hasConversionError:
        resourceData &&
        Object.prototype.hasOwnProperty.call(resourceData, "conversionError"),
    },
  );
  const castedData = resourceData;
  if (
    resourceData &&
    castedData.obj &&
    Array.isArray(castedData.obj) &&
    castedData.obj.length > 0 &&
    castedData.obj[0].relOffsetX !== undefined
  ) {
    const obj = castedData.obj;
    console.log(
      `[DEBUG] Using rsrcdump-parsed RelP data from 'obj' field for ${resourceName}: ${obj.length} points`,
    );
    return obj;
  } else if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    resourceData[0].relOffsetX !== undefined
  ) {
    console.log(
      `[DEBUG] Using rsrcdump-parsed RelP data (array format) for ${resourceName}: ${resourceData.length} points`,
    );
    return resourceData;
  } else {
    console.log(
      `[DEBUG] Fallback: parsing RelP ${resourceName} from hexData (${
        hexData?.length || 0
      } bytes)`,
    );
    const obj = parseRelPData(hexData);
    console.log(`[DEBUG] Parsed ${obj.length} RelP points from hex data`);
    return obj;
  }
}
