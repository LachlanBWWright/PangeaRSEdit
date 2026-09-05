import { toast } from "sonner";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
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
  return async (
    tunnelPath: string,
    fileName: string,
    levelKind: TunnelLevelKind,
  ) => {
    if (!onTunnelLoad) {
      return;
    }

    const responseResult = await ResultAsync.fromPromise(
      fetch(tunnelPath),
      mapErr,
    );
    if (responseResult.isErr()) {
      toast.error(`Failed to fetch ${fileName}`, {
        description: responseResult.error,
      });
      return;
    }

    const response = responseResult.value;
    if (!response.ok) {
      toast.error(`Failed to fetch ${fileName}`, {
        description: `HTTP ${response.status}: ${response.statusText}`,
      });
      return;
    }

    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr()) {
      toast.error("Failed to read response", {
        description: bufferResult.error,
      });
      return;
    }

    const result = parseTunnelFile(bufferResult.value);
    if (result.isErr()) {
      toast.error("Failed to parse tunnel file", { description: result.error });
      return;
    }

    onTunnelLoad(result.value, fileName, levelKind);
  };
}
