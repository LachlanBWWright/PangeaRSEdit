import { useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { desktopGamesOpenAtom } from "@/platform/desktop/assetAvailability";
import { desktopBridge } from "@/platform/desktop/client";
import { resetAssets } from "./assetState";
import { useAssetState } from "./useAssetState";

export function AssetLoadingStatus() {
  const { failures } = useAssetState();
  const openGames = useSetAtom(desktopGamesOpenAtom);
  if (!failures.length) return null;
  return <aside role="alert" className="border-b border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-100">
    <p>Some game assets could not be loaded.</p>
    <ul>{failures.slice(-3).map((failure) => <li key={`${failure.url}:${failure.message}`}>{failure.message}</li>)}</ul>
    <div className="mt-2 flex gap-2">
      <Button size="sm" variant="outline" onClick={resetAssets}>Retry asset loading</Button>
      {desktopBridge() && <Button size="sm" variant="outline" onClick={() => openGames(true)}>Manage game data</Button>}
    </div>
  </aside>;
}
