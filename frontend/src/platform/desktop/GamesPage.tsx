import { useEffect, useState } from "react";
import { loadAssetSources, syncAssetSources } from "./assetSourceState";
import { resetAssets } from "@/assets/assetState";
import { useSetAtom } from "jotai";
import { z } from "zod";
import { assetInstallationSchema, hostInfoSchema, installationSchema, releaseManifestSchema, transferSchema, upstreamDataReleaseSchema, type GameId, type Installation, type ReleaseManifest, type UpstreamDataRelease } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desktopBridge, desktopRequest } from "./client";
import { DESKTOP_GAMES } from "./games";
import { installedEditorAssetsAtom, installedNativeGameDataAtom } from "./assetAvailability";
import { GameDataSource } from "./GameDataSource";
import { editorAssetGames, nativeDataGames } from "./editorAssetGames";

export function GamesPage() {
  const setInstalledAssets = useSetAtom(installedEditorAssetsAtom);
  const setNativeData = useSetAtom(installedNativeGameDataAtom);
  const [installed, setInstalled] = useState<Installation[]>([]);
  const [releases, setReleases] = useState<ReleaseManifest[]>([]);
  const [prerelease, setPrerelease] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<GameId | null>(null);
  const [progress, setProgress] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [dataError, setDataError] = useState("");
  const [upstream, setUpstream] = useState<UpstreamDataRelease[]>([]);
  const [assets, setAssets] = useState<z.infer<typeof assetInstallationSchema>[]>([]);
  const [sourcesReady, setSourcesReady] = useState(false);
  const [host, setHost] = useState<z.infer<typeof hostInfoSchema> | null>(null);
  const bridge = desktopBridge();
  useEffect(() => {
    if (!bridge) return;
    void desktopRequest({ operation: "host.info" }, hostInfoSchema).then((result) => { if (result.isOk()) setHost(result.value); });
    void loadAssetSources().then((result) => {
      if (result.isErr()) { setDataError(result.error.message); return; }
      setAssets(result.value.assets); setInstalled(result.value.games);
      setInstalledAssets(editorAssetGames(result.value.assets)); setSourcesReady(true);
    });
    void desktopRequest({ operation: "games.upstream-catalog" }, z.array(upstreamDataReleaseSchema)).then((result) => { if (result.isOk()) setUpstream(result.value); });
    return bridge.onTransfer((value) => {
      const parsed = transferSchema.safeParse(value);
      if (parsed.success) setProgress(`${String(Math.round(parsed.data.received / parsed.data.total * 100))}% downloaded`);
    });
  }, [bridge, setInstalledAssets]);
  useEffect(() => {
    if (!sourcesReady) return;
    setNativeData(nativeDataGames(assets, installed));
    syncAssetSources(assets, installed);
  }, [assets, installed, sourcesReady, setNativeData]);

  async function checkReleases() {
    setCatalogError("");
    const result = await desktopRequest({ operation: "games.catalog", prerelease }, z.array(releaseManifestSchema));
    if (result.isErr()) { setCatalogError(result.error.message); return; }
    setReleases(result.value);
    setSelected(result.value[0]?.tag ?? "");
    if (!result.value.length) setCatalogError("No complete compatible releases have been published yet. You can locate an existing compatible build.");
  }
  async function manage(game: GameId, operation: "games.install" | "games.locate" | "games.remove") {
    setBusy(game); setProgress("");
    const result = await desktopRequest(operation === "games.install" ? { operation, game, tag: selected, kind: "runtime" } : { operation, game }, z.array(installationSchema));
    if (result.isOk()) setInstalled(result.value);
    else if (result.error.code !== "cancelled") toast.error(result.error.message);
    setBusy(null); setProgress("");
  }
  async function play(game: GameId) {
    const result = await desktopRequest({ operation: "games.play", game }, z.void());
    if (result.isErr()) toast.error(result.error.message);
  }
  async function manageAssets(game: GameId, remove: boolean) {
    setBusy(game); setProgress(""); setDataError("");
    const result = await desktopRequest(remove ? { operation: "games.remove-assets", game }
      : { operation: "games.install-upstream-data", game }, z.array(assetInstallationSchema));
    if (result.isOk()) { setAssets(result.value); setInstalledAssets(editorAssetGames(result.value)); }
    else if (result.error.code !== "cancelled") setDataError(result.error.message);
    setBusy(null); setProgress("");
  }

  return <main className="mx-auto max-w-5xl p-6 text-white space-y-5">
    <h1 className="text-2xl font-semibold">Games</h1>
    <p className="text-slate-300">Install only the games you want. Downloads are verified, updates are explicit, and installed games work offline.</p>
    {bridge ? <>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void checkReleases()}>Check releases</Button>
        <Button variant="outline" onClick={resetAssets}>Reload game assets</Button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={prerelease} onChange={(event) => setPrerelease(event.target.checked)} />Include prereleases</label>
        {!!releases.length && <select aria-label="Game release" className="rounded bg-slate-800 p-2" value={selected} onChange={(event) => setSelected(event.target.value)}>{releases.map((release) => <option key={release.tag} value={release.tag}>{release.tag}</option>)}</select>}
      </div>
      {catalogError && <p role="status" className="text-amber-200">{catalogError}</p>}
      {dataError && <p role="alert" className="text-amber-200">{dataError} You can retry the download; installed data is retained.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{DESKTOP_GAMES.map((game) => {
        const installation = installed.find((item) => item.game === game.id);
        const release = releases.find((item) => item.tag === selected);
        const runtime = release?.assets.find((asset) => asset.game === game.id && asset.kind === "runtime" && asset.platform === host?.platform && (asset.arch === host.arch || asset.arch === "universal"));
        const assetInstallation = assets.find((entry) => entry.game === game.id);
        return <section key={game.id} aria-label={game.label} className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-3">
          <h2 className="font-semibold text-lg">{game.label}</h2>
          <p className="text-sm text-slate-300">{installation ? `Installed: ${installation.version}${installation.managed ? "" : " (external)"}` : "Not installed"}{runtime ? ` · Download: ${String(Math.ceil(runtime.size / 1024 / 1024))} MiB` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null || !runtime} onClick={() => void manage(game.id, "games.install")}>{installation ? "Install selected version" : "Download and install"}</Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => void manage(game.id, "games.locate")}>Locate existing</Button>
            {installation && <><Button variant="outline" onClick={() => void play(game.id)}>Play</Button><Button variant="outline" disabled={busy !== null} onClick={() => void manage(game.id, "games.remove")}>{installation.managed ? "Remove" : "Forget"}</Button></>}
            {busy === game.id && <Button variant="outline" onClick={() => void desktopRequest({ operation: "games.cancel", game: game.id }, z.void())}>Cancel download</Button>}
          </div>
          <GameDataSource game={game.id} installed={assetInstallation} localData={!!installation} upstream={upstream.find((entry) => entry.game === game.id)} busy={busy !== null} onInstall={(id) => void manageAssets(id, false)} onRemove={(id) => void manageAssets(id, true)} />
          {busy === game.id && <p role="status">{progress || "Preparing installation…"}</p>}
        </section>;
      })}</div>
    </> : <p>Native installation and launching are available in the desktop editor. Browser uploads and in-browser previews remain available.</p>}
  </main>;
}
