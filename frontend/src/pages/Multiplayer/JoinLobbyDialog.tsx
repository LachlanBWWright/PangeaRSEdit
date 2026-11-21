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
  readonly pendingText: string;
  readonly errorText: string | null;
  readonly onCloseAutoFocus: () => void;
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
  pendingText,
  errorText,
  onCloseAutoFocus,
  onOpenChange,
  onFormStateChange,
  onJoinLobbyIdChange,
  onJoin,
}: JoinLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!busy) onOpenChange(nextOpen);
    }}>
      <DialogContent onCloseAutoFocus={(event) => {
        event.preventDefault();
        onCloseAutoFocus();
      }}>
        <DialogHeader>
          <DialogTitle>Join by code</DialogTitle>
          <DialogDescription>
            Enter your name and the lobby join code.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (!busy && joinLobbyId.trim()) onJoin();
        }}>
          <div className="space-y-2">
            <Label htmlFor="multiplayer-display-name">Display name</Label>
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
            <Label htmlFor="multiplayer-join-lobby-id">Join code</Label>
            <Input
              id="multiplayer-join-lobby-id"
              value={joinLobbyId}
              aria-describedby={errorText ? "multiplayer-join-error" : undefined}
              placeholder="Enter the join code"
              disabled={busy}
              onChange={(event) => {
                onJoinLobbyIdChange(event.target.value);
              }}
            />
            {errorText ? (
              <p id="multiplayer-join-error" role="alert" className="text-sm text-destructive">
                {errorText} Check the join code or try again.
              </p>
            ) : null}
          </div>
          {busy ? <p role="status" className="text-sm text-muted-foreground">{pendingText}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || joinLobbyId.trim().length === 0}>
              Join lobby
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
