import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { z } from "zod";
import { gameRunSchema, type GameRun } from "@pangea/desktop-contracts";
import { useDesktopScriptObjectQuery, useDesktopScriptStateQuery } from "./scriptObjectQuery";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopBridge, desktopRequest } from "./client";
import { desktopConsoleOpenAtom, desktopProjectAtom } from "./projectState";
import { gameConsoleSource } from "./gameConsoleSource";
import { openExternalProjectFile } from "./ProjectFilesDialog";
import { ScriptInspector } from "@/editor/ScriptInspector";
import { DESKTOP_GAMES } from "./games";

export function GameConsole() {
  const [open, setOpen] = useAtom(desktopConsoleOpenAtom);
  const project = useAtomValue(desktopProjectAtom);
  const [runs, setRuns] = useState<GameRun[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const bridge = desktopBridge();
    if (!bridge) return;
    let generation = 0;
    let known = new Set<string>();
    void desktopRequest({ operation: "games.runs" }, z.array(gameRunSchema)).then((result) => {
      if (result.isOk() && generation === 0) { known = new Set(result.value.map((run) => run.id)); setRuns(result.value); }
    });
    return bridge.onGameRun?.((value) => {
      const parsed = z.array(gameRunSchema).safeParse(value);
      if (!parsed.success) return;
      generation++;
      const latest = parsed.data.at(-1);
      if (latest && !known.has(latest.id)) { setSelected(latest.id); setOpen(true); }
      known = new Set(parsed.data.map((run) => run.id));
      setRuns(parsed.data);
    });
  }, [setOpen]);
  const run = runs.find((entry) => entry.id === selected) ?? runs.at(-1);
  const runId = run?.id;
  const queryObjects = useDesktopScriptObjectQuery(runId);
  const queryState = useDesktopScriptStateQuery(runId);
  async function control(operation: "games.stop" | "games.restart") {
    if (!run || busy) return;
    setBusy(true);
    const result = await desktopRequest({ operation, id: run.id }, z.void());
    if (result.isErr()) toast.error(result.error.message);
    setBusy(false);
  }
  const lines = run?.output.map((chunk) => chunk.text).join("").split("\n").slice(-2000) ?? [];
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl">
    <DialogHeader><DialogTitle>Native game console</DialogTitle><DialogDescription>Game output and Lua tracebacks. Restart reuses the most recent launch snapshot.</DialogDescription></DialogHeader>
    <div className="flex flex-wrap items-center gap-2">
      <label className="min-w-0 flex-1 text-sm">Game run<select aria-label="Game run" className="ml-2 max-w-full rounded border bg-slate-900 p-2" value={run?.id ?? ""} onChange={(event) => setSelected(event.target.value)}>{runs.map((entry) => <option key={entry.id} value={entry.id}>{entry.game} · {entry.startedAt} · {entry.state}</option>)}</select></label>
      <Button disabled={busy || run?.state !== "running"} onClick={() => void control("games.stop")}>Stop</Button>
      <Button disabled={busy || !run?.canRestart} onClick={() => void control("games.restart")}>Restart snapshot</Button>
    </div>
    <p role="status" className="text-sm">{run ? `${run.state}${run.exitCode !== null ? ` · exit ${run.exitCode}` : ""}${run.signal ? ` · ${run.signal}` : ""}` : "No native game has been launched."}{run && run.droppedBytes > 0 ? ` · ${run.droppedBytes} earlier log bytes omitted` : ""}</p>
    <div className="max-h-[65vh] overflow-auto"><ScriptInspector key={runId} queryObjects={run?.state === "running" ? queryObjects : undefined} queryState={run?.state === "running" ? queryState : undefined} snapshot={run?.inspector ?? null} unavailable={run?.state === "running" ? undefined : "Launch Test Current Level with an updated compatible game build to inspect live Lua state."} navigationContext={{
      game: DESKTOP_GAMES.find((game) => game.id === run?.game)?.globals.GAME_TYPE,
      unavailable: !run?.sourceProject || run.sourceProject !== project?.folder ? "Open the originating project to follow this diagnostic." : undefined,
      placementUnavailable: run?.state !== "running" ? "This runtime has stopped; its object handles are no longer live." : undefined,
      onSelectPlacement: () => setOpen(false),
    }} />
    <div aria-label="Native game output" className="max-h-[55vh] min-h-40 overflow-auto rounded border bg-slate-950 p-3 font-mono text-xs">
      {lines.map((text, index) => { const source = gameConsoleSource(text); return <div key={index} className="whitespace-pre-wrap break-all">{text}{source && <Button size="sm" variant="ghost" disabled={!run?.sourceProject || run.sourceProject !== project?.folder} title="Open the originating project to follow this source location" className="h-auto p-1 text-xs underline" onClick={() => void openExternalProjectFile("edit", source.path, source.line)}>Open {source.path.split("/").at(-1)}:{source.line}</Button>}</div>; })}
    </div></div>
  </DialogContent></Dialog>;
}
