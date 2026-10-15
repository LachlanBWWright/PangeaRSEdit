import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addDialogueChoice, changeDialogueChoice, dialogueNodeSchema, removeDialogueChoice, type DialogueNode } from "./scriptDialogueAuthoring";

interface Props {
  node: DialogueNode;
  nodes: readonly DialogueNode[];
  onChange: (node: DialogueNode) => void;
  onRemove: () => void;
  canRemove: boolean;
  sounds: readonly string[];
}

function destinationOptions(nodes: readonly DialogueNode[]) {
  return <><option value="end">End conversation</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.id}: {node.text.slice(0, 40)}</option>)}</>;
}

export function ScriptDialogueLineEditor({ node, nodes, onChange, onRemove, canRemove, sounds }: Props) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-slate-700 p-3">
      <legend className="px-1 font-medium">{node.id}</legend>
      <label className="grid gap-1 text-sm">Speaker<Input value={node.speaker} maxLength={60} onChange={(event) => onChange({ ...node, speaker: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">Dialogue text<Textarea value={node.text} onChange={(event) => onChange({ ...node, text: event.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Line sound<select className="rounded border border-slate-700 bg-slate-950 p-2" value={node.voice} onChange={(event) => {
          const voice = dialogueNodeSchema.shape.voice.safeParse(event.target.value);
          if (voice.success) onChange({ ...node, voice: voice.data });
        }}><option value="">Text only</option>{sounds.map((sound) => <option key={sound} value={sound}>{sound}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Duration in seconds<Input type="number" min={0} max={3600} step={0.5} value={node.duration} onChange={(event) => onChange({ ...node, duration: event.target.valueAsNumber })} /><span className="text-xs text-slate-400">Zero waits for confirmation.</span></label>
      </div>
      <label className="grid gap-1 text-sm">Next line<select className="rounded border border-slate-700 bg-slate-950 p-2" value={node.next} onChange={(event) => onChange({ ...node, next: event.target.value })}>{destinationOptions(nodes)}</select></label>
      {node.choices.map((choice, index) => <fieldset key={index} className="grid gap-2 rounded border border-slate-700 p-2">
        <legend>Choice {index + 1}</legend>
        <label className="grid gap-1 text-sm">Choice ID<Input value={choice.id} onChange={(event) => onChange(changeDialogueChoice(node, index, { id: event.target.value }))} /></label>
        <label className="grid gap-1 text-sm">Label<Input value={choice.text} maxLength={120} onChange={(event) => onChange(changeDialogueChoice(node, index, { text: event.target.value }))} /></label>
        <label className="grid gap-1 text-sm">Destination<select className="rounded border border-slate-700 bg-slate-950 p-2" value={choice.next} onChange={(event) => onChange(changeDialogueChoice(node, index, { next: event.target.value }))}>{destinationOptions(nodes)}</select></label>
        <Button variant="outline" size="sm" onClick={() => onChange(removeDialogueChoice(node, index))}>Remove choice</Button>
      </fieldset>)}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={node.choices.length >= 4} onClick={() => onChange(addDialogueChoice(node))}>Add choice</Button>
        <Button variant="outline" size="sm" disabled={!canRemove} onClick={onRemove}>Remove line</Button>
      </div>
    </fieldset>
  );
}
