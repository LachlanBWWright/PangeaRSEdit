import { parseEvntData } from "../parseHelpers";
import type { EvntRaw } from "../parseSkeletonRsrcTS";

export function handleEvnt(
  resourceName: string,
  resourceData: EvntRaw[] | { obj?: EvntRaw[] } | undefined,
  _resourceId: string,
  hexData: string,
) {
  const castedData = resourceData;
  if (
    resourceData &&
    castedData &&
    castedData.obj &&
    Array.isArray(castedData.obj) &&
    castedData.obj.length > 0 &&
    castedData.obj[0].time !== undefined
  ) {
    const obj = castedData.obj;
    console.log(
      `[DEBUG] Using rsrcdump-parsed Evnt data from 'obj' field for ${resourceName}: ${obj.length} events`,
    );
    return obj;
  } else if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    resourceData[0].time !== undefined
  ) {
    console.log(
      `[DEBUG] Using rsrcdump-parsed Evnt data (array format) for ${resourceName}: ${resourceData.length} events`,
    );
    return resourceData;
  } else {
    console.log(
      `[DEBUG] Fallback: parsing Evnt ${resourceName} from hexData (${
        hexData?.length || 0
      } bytes)`,
    );
    return parseEvntData(hexData);
  }
}
