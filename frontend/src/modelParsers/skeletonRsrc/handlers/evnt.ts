import { parseEvntData } from "../parseHelpers";
import type { EvntRaw } from "../parseSkeletonRsrcTS";

export function handleEvnt(
  resourceName: string,
  resourceData: EvntRaw[] | { obj?: EvntRaw[] } | undefined,
  _resourceId: string,
  hexData: string,
) {
  if (
    resourceData &&
    (resourceData as { obj?: EvntRaw[] }).obj &&
    Array.isArray((resourceData as { obj?: EvntRaw[] }).obj) &&
    (resourceData as { obj?: EvntRaw[] }).obj!.length > 0 &&
    ((resourceData as { obj?: EvntRaw[] }).obj![0] as EvntRaw).time !==
      undefined
  ) {
    const obj = (resourceData as { obj?: EvntRaw[] }).obj!;
    console.log(
      `[DEBUG] Using rsrcdump-parsed Evnt data from 'obj' field for ${resourceName}: ${obj.length} events`,
    );
    return obj;
  } else if (
    Array.isArray(resourceData) &&
    resourceData.length > 0 &&
    (resourceData[0] as EvntRaw).time !== undefined
  ) {
    console.log(
      `[DEBUG] Using rsrcdump-parsed Evnt data (array format) for ${resourceName}: ${resourceData.length} events`,
    );
    return resourceData as EvntRaw[];
  } else {
    console.log(
      `[DEBUG] Fallback: parsing Evnt ${resourceName} from hexData (${
        hexData?.length || 0
      } bytes)`,
    );
    return parseEvntData(hexData);
  }
}
