import { useState } from "react";
import type { Game } from "@/data/globals/globals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GameObjectModelBrowser } from "./GameObjectModelBrowser";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

export function GameModelChooser({ game, workspace, definition, metadata, onChange, update }: {
  game: Game; workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition;
  metadata?: Readonly<Record<string, string>>; onChange: (definition: ScriptCustomObjectDefinition) => void;
  update: (change: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void;
}) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="secondary">Change model</Button></DialogTrigger>
    <DialogContent className="script-workbench model-chooser sm:max-w-5xl">
      <DialogHeader><DialogTitle>Choose an appearance</DialogTitle><DialogDescription>Browse game models. Your object changes when you apply a choice.</DialogDescription></DialogHeader>
      {open && <GameObjectModelBrowser game={game} workspace={workspace} definition={definition} metadata={metadata}
        onChange={(next) => { onChange(next); setOpen(false); }} update={update} onApplied={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
