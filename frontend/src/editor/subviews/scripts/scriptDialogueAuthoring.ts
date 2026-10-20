import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { presentationSounds } from "./scriptPresentationSounds";
import { addBehaviorDefinition, applyGlobalBehavior, type ScriptHookId, type ScriptWorkspaceState } from "./scriptWorkspaceState";

const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,47}$/);
function boundedText(bytes: number, required: boolean) {
  return z.string().min(required ? 1 : 0).refine((value) => !value.includes("\0") && new TextEncoder().encode(value).length < bytes, `Keep text below ${bytes} UTF-8 bytes and omit null characters`);
}
const text = boundedText(512, true);
const choiceSchema = z.object({ id: identifier, text: boundedText(128, true), next: z.string() });
export const dialogueNodeSchema = z.object({
  id: identifier.refine((id) => id !== "end", "End is reserved for the conversation destination"),
  speaker: boundedText(64, false),
  text,
  voice: boundedText(64, false),
  duration: z.number().finite().min(0).max(3600),
  next: z.string(),
  choices: z.array(choiceSchema).max(4),
});
export const dialogueDraftSchema = z.object({ id: identifier, nodes: z.array(dialogueNodeSchema).min(1).max(16) }).superRefine((draft, context) => {
  const ids = new Set(draft.nodes.map((node) => node.id));
  if (ids.size !== draft.nodes.length) context.addIssue({ code: "custom", message: "Dialogue line IDs must be unique" });
  for (const node of draft.nodes) {
    if (node.next !== "end" && !ids.has(node.next)) context.addIssue({ code: "custom", message: `Unknown destination for ${node.id}` });
    const choiceIds = new Set(node.choices.map((choice) => choice.id));
    if (choiceIds.size !== node.choices.length) context.addIssue({ code: "custom", message: `Choice IDs must be unique in ${node.id}` });
    for (const choice of node.choices) {
      if (choice.next !== "end" && !ids.has(choice.next)) context.addIssue({ code: "custom", message: `Unknown destination for ${choice.id}` });
    }
  }
});

export type DialogueDraft = z.infer<typeof dialogueDraftSchema>;
export type DialogueNode = z.infer<typeof dialogueNodeSchema>;
export type DialogueChoice = z.infer<typeof choiceSchema>;

export function changeDialogueChoice(node: DialogueNode, index: number, changes: Partial<DialogueChoice>): DialogueNode {
  return { ...node, choices: node.choices.map((choice, position) => position === index ? { ...choice, ...changes } : choice) };
}

export function addDialogueChoice(node: DialogueNode): DialogueNode {
  let number = 1;
  while (node.choices.some((choice) => choice.id === `choice${number}`)) number++;
  return { ...node, choices: [...node.choices, { id: `choice${number}`, text: "New choice", next: "end" }] };
}

export function removeDialogueChoice(node: DialogueNode, index: number): DialogueNode {
  return { ...node, choices: node.choices.filter((_, position) => position !== index) };
}

export function createDialogueLine(nodes: readonly DialogueNode[]): DialogueNode {
  let number = 1;
  while (nodes.some((node) => node.id === `line${number}`)) number++;
  return { id: `line${number}`, speaker: "", text: "New dialogue line", voice: "", duration: 4, next: "end", choices: [] };
}

export function replaceDialogueLine(draft: DialogueDraft, index: number, node: DialogueNode): DialogueDraft {
  return { ...draft, nodes: draft.nodes.map((existing, position) => position === index ? node : existing) };
}

export function removeDialogueLine(draft: DialogueDraft, id: string): DialogueDraft {
  return { ...draft, nodes: draft.nodes.filter((node) => node.id !== id).map((node) => ({
    ...node,
    next: node.next === id ? "end" : node.next,
    choices: node.choices.map((choice) => ({ ...choice, next: choice.next === id ? "end" : choice.next })),
  })) };
}

function quote(value: string): string {
  const escaped = [...value].map((character) => {
    if (character === "\\") return "\\\\";
    if (character === '"') return '\\"';
    const code = character.codePointAt(0);
    return code !== undefined && code < 32 ? `\\${String(code).padStart(3, "0")}` : character;
  }).join("");
  return `"${escaped}"`;
}

function destination(nodes: readonly DialogueNode[], id: string): number {
  return id === "end" ? 0 : nodes.findIndex((node) => node.id === id) + 1;
}

export function dialogueStartHook(gameId: string): ScriptHookId {
  if (gameId === "CroMagRally-Android") return "onRaceStart";
  if (gameId === "BillyFrontier-Android" || gameId === "MightyMike-Android") return "onAreaStart";
  return "onLevelStart";
}

export function buildDialogueSource(draft: DialogueDraft, gameId: string): string {
  const nodes = draft.nodes.map((node) => {
    const choices = node.choices.map((choice) => `{id=${quote(choice.id)}, text=${quote(choice.text)}, next=${destination(draft.nodes, choice.next)}}`).join(", ");
    return `  {speaker=${quote(node.speaker)}, text=${quote(node.text)}, voice=${quote(node.voice)}, duration=${node.duration}, next=${destination(draft.nodes, node.next)}, choices={${choices}}}`;
  }).join(",\n");
  return `local pangea = require("pangea")\nlocal nodes = {\n${nodes}\n}\n\nreturn {\n  ${dialogueStartHook(gameId)} = function()\n    local definition = pangea.dialogue.define(${quote(draft.id)}, nodes)\n    if definition.ok then pangea.dialogue.start(${quote(draft.id)}) end\n  end,\n  onDialogueResult = function(ctx)\n    pangea.log.info(ctx.dialogueId .. ": " .. ctx.reason .. " " .. ctx.choiceId)\n  end,\n}\n`;
}

export function saveDialogueModule(state: ScriptWorkspaceState, input: unknown): Result<ScriptWorkspaceState, string> {
  const parsed = dialogueDraftSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues.map((issue) => issue.message).join("; "));
  const draft = parsed.data;
  const sounds = presentationSounds(state.context.gameId);
  if (draft.nodes.some((node) => node.voice !== "" && !sounds.includes(node.voice))) return err("Choose a line sound supported by this game");
  const id = `dialogue.${draft.id}`;
  const path = `Data/Scripts/src/dialogue_${draft.id}.lua`;
  if (state.sourceFiles[path]) return err("That dialogue module already exists. Choose a new ID or edit its Lua in Code.");
  const source = buildDialogueSource(draft, state.context.gameId);
  const next = addBehaviorDefinition(state, {
    target: "global", hooks: [dialogueStartHook(state.context.gameId), "onDialogueResult"], id,
    label: `Dialogue: ${draft.id}`, description: "Native branching dialogue", tags: [], sourceFilePath: path, sourceTemplate: source,
  });
  const withStart = applyGlobalBehavior(next, dialogueStartHook(state.context.gameId), id);
  return ok(applyGlobalBehavior(withStart, "onDialogueResult", id));
}

export function saveDialogueToWorkspace(state: ScriptWorkspaceState, draft: DialogueDraft, persist: (state: ScriptWorkspaceState) => void, reportError: (message: string) => void): void {
  const saved = saveDialogueModule(state, draft);
  if (saved.isErr()) { reportError(saved.error); return; }
  persist(saved.value);
}
