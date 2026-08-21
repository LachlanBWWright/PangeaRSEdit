import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LobbyFormState } from "@/multiplayer/menuOptions";

interface JoinLobbyDialogProps {
  readonly open: boolean;
  readonly formState: LobbyFormState;
  readonly joinLobbyId: string;
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFormStateChange: (nextState: LobbyFormState) => void;
  readonly onJoinLobbyIdChange: (nextLobbyId: string) => void;
  readonly onJoin: () => void;
}

export function JoinLobbyDialog({
  open,
  formState,
  joinLobbyId,
  busy,
  onOpenChange,
  onFormStateChange,
  onJoinLobbyIdChange,
  onJoin,
}: JoinLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Lobby</DialogTitle>
          <DialogDescription>
            Enter your name and the lobby ID or join code.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="multiplayer-display-name">Display Name</Label>
            <Input
              id="multiplayer-display-name"
              value={formState.displayName}
              disabled={busy}
              onChange={(event) => {
                onFormStateChange({
                  ...formState,
                  displayName: event.target.value,
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="multiplayer-join-lobby-id">
              Lobby ID or Code
            </Label>
            <Input
              id="multiplayer-join-lobby-id"
              value={joinLobbyId}
              placeholder="Paste an ID or enter a code"
              disabled={busy}
              onChange={(event) => {
                onJoinLobbyIdChange(event.target.value);
              }}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="default"
            disabled={busy || joinLobbyId.trim().length === 0}
            onClick={onJoin}
          >
            Join Lobby
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
