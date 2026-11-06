import { useEffect, useRef, useState } from "react";
import type { Game } from "@/data/globals/globals";
import type { GameModel } from "@/components/GameModelSelector";
import { catalogAssetPath, catalogObjectLabel } from "./scriptGameModelCatalog";
import { useModelChoiceThumbnail } from "./useModelChoiceThumbnail";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

function CatalogThumbnail({ game, model, index, assets }: {
  game: Game; model: GameModel; index: number; assets: ScriptWorkspaceState["assets"];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const result = useModelChoiceThumbnail(game, catalogAssetPath(model.bg3dFile), index, assets,
    model.skeletonFile ? catalogAssetPath(model.skeletonFile).replace(/\.rsrc$/i, "") : "");
  const thumbnail = result?.isOk() ? result.value : null;
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !thumbnail) return;
    context.clearRect(0, 0, 96, 96);
    context.drawImage(thumbnail.image, 0, 0, 96, 96);
  }, [thumbnail]);
  return <><canvas ref={canvas} width={96} height={96} aria-label={`${model.name} object ${index + 1} preview`} />
    {!result && <span className="workbench-muted">Loading preview…</span>}
    {result?.isErr() && <span className="workbench-muted" title={result.error}>Preview unavailable</span>}</>;
}

export function CatalogModelChoices({ game, model, count, selected, assets, onSelect }: {
  game: Game; model: GameModel; count: number; selected: number; assets: ScriptWorkspaceState["assets"]; onSelect: (index: number) => void;
}) {
  const [page, setPage] = useState(Math.floor(selected / 12));
  const pages = Math.ceil(count / 12);
  const current = Math.min(page, Math.max(0, pages - 1));
  return <div className="grid gap-3">
    <p className="workbench-muted">{model.skeletonFile ? "Animated skeleton" : `${count} objects · choose the geometry to use`}</p>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
      {Array.from({ length: Math.min(12, count - current * 12) }, (_, offset) => {
        const index = current * 12 + offset;
        const label = catalogObjectLabel(game, model, index);
        return <button type="button" key={index} aria-label={`Select ${label}`} aria-pressed={selected === index}
          className={`grid justify-items-center rounded border p-2 text-sm ${selected === index ? "border-blue-400 bg-blue-950" : "border-slate-700"}`} onClick={() => onSelect(index)}>
          <CatalogThumbnail game={game} model={model} index={index} assets={assets} />
          <span>{label}</span>
        </button>;
      })}
    </div>
    {pages > 1 && <nav className="flex items-center gap-3" aria-label="Game model pages">
      <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous models</button>
      <span>Page {current + 1} of {pages}</span>
      <button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next models</button>
    </nav>}
  </div>;
}
