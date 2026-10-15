import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LobbyProgress } from "./LobbyProgress";
import type { LobbyFormState } from "@/multiplayer/menuOptions";

interface JoinLobbyDialogProps {
  readonly open: boolean;
  readonly formState: LobbyFormState;
  readonly joinLobbyId: string;
  readonly busy: boolean;
  readonly isPreloading: boolean;
  readonly errorText: string | null;
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
  isPreloading,
  errorText,
  onOpenChange,
  onFormStateChange,
  onJoinLobbyIdChange,
  onJoin,
}: JoinLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Join a Lobby</DialogTitle>
          <DialogDescription>
            Enter your name and the lobby join code.
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
            <Label htmlFor="multiplayer-join-lobby-id">Join code</Label>
            <Input
              id="multiplayer-join-lobby-id"
              value={joinLobbyId}
              placeholder="Enter the join code"
              disabled={busy}
              onChange={(event) => {
                onJoinLobbyIdChange(event.target.value);
              }}
            />
          </div>
        </div>
        {errorText ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorText}</AlertDescription>
          </Alert>
        ) : null}
        {busy ? <LobbyProgress isPreloading={isPreloading} action="join" /> : null}
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
