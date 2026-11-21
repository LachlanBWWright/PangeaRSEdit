import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CROMAG_TAG_DURATION_OPTIONS,
  buildUpdatedLobbyFormState,
  buildUpdatedLobbyModeState,
  getMaxPlayerOptions,
  getModeOptions,
  getTrackOptions,
  usesCroMagTagDuration,
  type LobbyFormState,
} from "@/multiplayer/menuOptions";

interface CreateLobbyDialogProps {
  readonly open: boolean;
  readonly formState: LobbyFormState;
  readonly busy: boolean;
  readonly pendingText: string;
  readonly errorText: string | null;
  readonly onCloseAutoFocus: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFormStateChange: (nextState: LobbyFormState) => void;
  readonly onCreate: () => void;
}

export function CreateLobbyDialog({
  open,
  formState,
  busy,
  pendingText,
  errorText,
  onCloseAutoFocus,
  onOpenChange,
  onFormStateChange,
  onCreate,
}: CreateLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!busy) onOpenChange(nextOpen);
    }}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseAutoFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create lobby</DialogTitle>
          <DialogDescription>
            Choose the match setup, then invite others with the join code.
          </DialogDescription>
        </DialogHeader>

        <form
          id="multiplayer-create-form"
          className="grid min-h-0 content-start gap-4 overflow-y-auto px-1 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) onCreate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-display-name">Display name</Label>
            <Input
              id="multiplayer-create-display-name"
              disabled={busy}
              value={formState.displayName}
              onChange={(event) => {
                onFormStateChange({
                  ...formState,
                  displayName: event.target.value,
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-game">Game</Label>
            <Select
              disabled={busy}
              value={formState.gameId}
              onValueChange={(nextGameId) => {
                onFormStateChange(
                  buildUpdatedLobbyFormState(formState, nextGameId),
                );
              }}
            >
              <SelectTrigger id="multiplayer-create-game">
                <SelectValue placeholder="Select game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cromagrally">Cro-Mag Rally</SelectItem>
                <SelectItem value="nanosaur2">Nanosaur 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-mode">Mode</Label>
            <Select
              disabled={busy}
              value={formState.mode}
              onValueChange={(nextMode) => {
                onFormStateChange(buildUpdatedLobbyModeState(formState, nextMode));
              }}
            >
              <SelectTrigger id="multiplayer-create-mode">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {getModeOptions(formState.gameId).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-map">Map</Label>
            <Select
              disabled={busy}
              value={formState.trackOrLevel}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  trackOrLevel: value,
                });
              }}
            >
              <SelectTrigger id="multiplayer-create-map">
                <SelectValue placeholder="Select a map" />
              </SelectTrigger>
              <SelectContent>
                {getTrackOptions(formState.gameId, formState.mode).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {usesCroMagTagDuration(formState.gameId, formState.mode) ? (
            <div className="space-y-2">
              <Label htmlFor="multiplayer-create-duration">Tag duration</Label>
              <Select
                disabled={busy}
                value={String(formState.tagDurationMinutes)}
                onValueChange={(value) => {
                  onFormStateChange({
                    ...formState,
                    tagDurationMinutes: Number.parseInt(value, 10),
                  });
                }}
              >
                <SelectTrigger id="multiplayer-create-duration">
                  <SelectValue placeholder="Select tag duration" />
                </SelectTrigger>
                <SelectContent>
                  {CROMAG_TAG_DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-capacity">Max players</Label>
            <Select
              disabled={busy}
              value={String(formState.maxPlayers)}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  maxPlayers: Number.parseInt(value, 10),
                });
              }}
            >
              <SelectTrigger id="multiplayer-create-capacity">
                <SelectValue placeholder="Select max players" />
              </SelectTrigger>
              <SelectContent>
                {getMaxPlayerOptions(formState.gameId).map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {String(value)} players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-visibility">Lobby visibility</Label>
            <Select
              disabled={busy}
              value={formState.isPublic ? "public" : "private"}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  isPublic: value === "public",
                });
              }}
            >
              <SelectTrigger id="multiplayer-create-visibility">
                <SelectValue placeholder="Select lobby visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (listed)</SelectItem>
                <SelectItem value="private">Private (invite only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <div className="grid justify-items-end gap-2">
          {busy ? <p role="status" className="text-sm text-muted-foreground">{pendingText}</p> : null}
          {errorText ? (
            <p role="alert" className="text-sm text-destructive">{errorText} Check your settings or try again.</p>
          ) : null}
          <Button
            type="submit"
            form="multiplayer-create-form"
            disabled={busy}
          >
            Create lobby
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
