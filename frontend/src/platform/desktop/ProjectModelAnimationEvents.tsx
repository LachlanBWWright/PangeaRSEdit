import { useState } from "react";
import { assetImportRecipeSchema, type AssetImportRecipe, type ProjectAsset } from "@pangea/desktop-contracts";
import { AnimationEventEditor } from "@/components/AnimationViewer/AnimationEventEditor";
import type { AnimationEvent } from "@/components/AnimationViewer/types";
import { playAnimationEventSound } from "@/components/AnimationViewer/animationSoundPlayer";
import { Button } from "@/components/ui/button";
import { DESKTOP_GAMES } from "./games";
import { setAssetAnimationEvents } from "./projectModelRecipe";

export function ProjectModelAnimationEvents({ asset, recipe, onChange, disabled }: { asset: ProjectAsset; recipe: AssetImportRecipe; onChange: (recipe: AssetImportRecipe) => void; disabled: boolean }) {
  const [selection, setSelection] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [error, setError] = useState("");
  const clip = asset.animations.find((entry) => entry.name === selection) ?? asset.animations[0];
  if (!clip) return <p className="workbench-muted">Import an animated model to configure native animation events.</p>;
  const override = recipe.animationEvents?.find((entry) => entry.clip === clip.name);
  const events = override?.events ?? clip.events ?? [];
  const format = asset.outputs.model.endsWith(".3dmf") ? "3dmf" : "bg3d";
  const game = DESKTOP_GAMES.find((entry) => entry.id === asset.game);
  const gameLabel = asset.game === "Bugdom" ? "Bugdom 1" : asset.game === "Nanosaur" ? "Nanosaur 1" : game?.label;

  function update(events: AnimationEvent[] | undefined) {
    const next = assetImportRecipeSchema.safeParse(setAssetAnimationEvents(recipe, clip?.name ?? "", events));
    if (!next.success) { setError("Events require a time from 0–32767 ticks and a value from 0–255, with at most 30 events per clip."); return; }
    setError("");
    onChange(next.data);
  }

  return <fieldset disabled={disabled} className="grid gap-3" aria-label="Persistent animation events">
    <label className="grid gap-1 text-sm">Animation event clip<select className="rounded border border-slate-600 bg-slate-900 p-2" value={clip.name} onChange={(event) => { setSelection(event.target.value); setSelectedEvent(null); setError(""); }}>{asset.animations.map((entry) => <option key={entry.index} value={entry.name}>{entry.name}</option>)}</select></label>
    <p className="workbench-muted">{override ? "Project event overrides replace this clip's source events." : "Showing source events."} Changes apply when reimported and remain linked by clip name.</p>
    <AnimationEventEditor selectedAnimationInfo={clip} selectedEvents={events} selectedEventIndex={selectedEvent}
      maxEvents={30} supportedEventTypes={[0, 1, 2, 3, 4, 5, 6, 7, ...(["Bugdom", "Nanosaur", "CroMagRally"].includes(asset.game) ? [] : [8])]}
      gameLabel={gameLabel} modelSourceKind={format} onSelectEvent={setSelectedEvent}
      onAddEvent={() => update([...events, { time: 0, type: 0, value: 0 }])}
      onUpdateEvent={(index, event) => update(events.map((entry, position) => position === index ? event : entry))}
      onDeleteEvent={(index) => { update(events.filter((_, position) => position !== index)); setSelectedEvent(null); }}
      onPreviewEvent={(event) => { void playAnimationEventSound(event.value, format, gameLabel).mapErr(setError); }} />
    {override && <Button variant="ghost" className="justify-self-start" onClick={() => update(undefined)}>Restore source events</Button>}
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
  </fieldset>;
}
