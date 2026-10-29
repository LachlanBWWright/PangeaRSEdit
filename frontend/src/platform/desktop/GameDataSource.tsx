import { z } from "zod";
import { assetInstallationSchema, type GameId, type UpstreamDataRelease } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";

type AssetInstallation = z.infer<typeof assetInstallationSchema>;

interface Props {
  game: GameId;
  installed: AssetInstallation | undefined;
  localData: boolean;
  upstream: UpstreamDataRelease | undefined;
  busy: boolean;
  onInstall: (game: GameId) => void;
  onRemove: (game: GameId) => void;
}

export function GameDataSource({ game, installed, localData, upstream, busy, onInstall, onRemove }: Props) {
  return <div className="space-y-2 border-t border-slate-700 pt-3">
    <p className="text-sm text-slate-300">{installed?.source === "upstream" ? `Stock data: ${installed.version} (Jorio original distribution)` : installed ? `Existing editor assets: ${installed.version}` : localData ? "Local game data available" : "Stock data: not installed"}</p>
    <p className="text-sm text-slate-300">Download stock levels and native game data from Jorio’s original distribution, or use data from a located local game. Playing from the editor requires a compatible game build.</p>
    <p className="text-sm text-slate-300">Home model previews are created automatically from the original game data. A separate editor asset download is not required.</p>
    {upstream && <p className="text-sm text-slate-300">Pinned version {upstream.version} · <a className="underline" href={upstream.releaseUrl} target="_blank" rel="noreferrer">Jorio release and attribution</a> · <a className="underline" href={`https://github.com/${upstream.repository}#license`} target="_blank" rel="noreferrer">CC BY-NC-SA 4.0 license</a></p>}
    {!upstream && <p className="text-sm text-amber-200">Original distribution information is unavailable. Installed data remains available offline.</p>}
    {installed?.source === "editor" && <p className="text-sm text-amber-200">Downloading original data replaces this existing editor asset pack. Home model previews remain available from the original data.</p>}
    {upstream && <p className="text-sm text-slate-300">Data download: {String(Math.ceil(upstream.size / 1024 / 1024))} MiB</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy || !upstream} onClick={() => onInstall(game)}>Download original data</Button>
      {installed && <Button size="sm" variant="outline" disabled={busy} onClick={() => onRemove(game)}>{installed.source === "upstream" ? "Remove stock data" : "Remove editor assets"}</Button>}
    </div>
  </div>;
}
