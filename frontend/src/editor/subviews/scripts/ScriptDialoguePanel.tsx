import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScriptDialogueLineEditor } from "./ScriptDialogueLineEditor";
import { presentationSounds } from "./scriptPresentationSounds";
import { createDialogueLine, dialogueDraftSchema, replaceDialogueLine, removeDialogueLine, type DialogueDraft } from "./scriptDialogueAuthoring";

interface Props {
  onSave: (draft: DialogueDraft) => void;
  gameId: string;
}

export function ScriptDialoguePanel({ onSave, gameId }: Props) {
  const [draft, setDraft] = useState<DialogueDraft>({ id: "intro", nodes: [createDialogueLine([])] });
  const parsed = dialogueDraftSchema.safeParse(draft);
  const sounds = presentationSounds(gameId);
  return (
    <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-100">
      <div><h3 className="font-semibold">Dialogue</h3><p className="mt-1 text-sm text-slate-400">Create a conversation with named choices. Save a Lua module, then assign it to an area, race, or level start hook in Assignments. Gameplay continues during dialogue.</p></div>
      <label className="grid gap-1 text-sm">Dialogue ID<Input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} /></label>
      {draft.nodes.map((node, index) => <ScriptDialogueLineEditor key={node.id} node={node} nodes={draft.nodes} sounds={sounds} canRemove={draft.nodes.length > 1} onChange={(updated) => setDraft(replaceDialogueLine(draft, index, updated))} onRemove={() => setDraft(removeDialogueLine(draft, node.id))} />)}
      {!parsed.success && <p role="alert" className="text-sm text-orange-300">{parsed.error.issues.map((issue) => issue.message).join("; ")}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={draft.nodes.length >= 16} onClick={() => setDraft({ ...draft, nodes: [...draft.nodes, createDialogueLine(draft.nodes)] })}>Add line</Button><Button disabled={!parsed.success} onClick={() => { if (parsed.success) onSave(parsed.data); }}>Save dialogue module</Button></div>
    </section>
  );
}
