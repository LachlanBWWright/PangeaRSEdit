import { toast } from "sonner";
import { fetchAsset } from "@/assets/fetchAsset";
import { getAssetState } from "@/assets/assetState";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import type { TunnelData, TunnelLevelKind } from "@/data/tunnelParser/types";

interface Bugdom2TunnelLoaderArgs {
  readonly onTunnelLoad?: (
    data: TunnelData,
    fileName: string,
    levelKind: TunnelLevelKind,
  ) => void;
}

export function createBugdom2TunnelLoader({
  onTunnelLoad,
}: Bugdom2TunnelLoaderArgs): (
  tunnelPath: string,
  fileName: string,
  levelKind: TunnelLevelKind,
) => Promise<void> {
  let latest = 0;
  return async (
    tunnelPath: string,
    fileName: string,
    levelKind: TunnelLevelKind,
  ) => {
    if (!onTunnelLoad) {
      return;
    }

    const request = ++latest;
    const revision = getAssetState().revision;
    const bufferResult = await fetchAsset(tunnelPath);
    if (bufferResult.isErr()) {
      toast.error(`Failed to fetch ${fileName}`, {
        description: bufferResult.error.message,
      });
      return;
    }

    const result = parseTunnelFile(bufferResult.value);
    if (result.isErr()) {
      toast.error("Failed to parse tunnel file", { description: result.error });
      return;
    }

    if (request === latest && revision === getAssetState().revision) onTunnelLoad(result.value, fileName, levelKind);
  };
}
