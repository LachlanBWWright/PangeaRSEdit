import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LobbyProgress } from "./LobbyProgress";
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
  readonly isPreloading: boolean;
  readonly errorText: string | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFormStateChange: (nextState: LobbyFormState) => void;
  readonly onCreate: () => void;
}

export function CreateLobbyDialog({
  open,
  formState,
  busy,
  isPreloading,
  errorText,
  onOpenChange,
  onFormStateChange,
  onCreate,
}: CreateLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lobby</DialogTitle>
          <DialogDescription>
            Choose the match setup, then invite others with the join code.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={busy} className="grid min-w-0 gap-4">
          <div className="space-y-2">
            <Label htmlFor="multiplayer-create-display-name">Display Name</Label>
            <Input
              id="multiplayer-create-display-name"
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
            <Label htmlFor="multiplayer-create-map">Track / Level</Label>
            <Select
              value={formState.trackOrLevel}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  trackOrLevel: value,
                });
              }}
            >
              <SelectTrigger id="multiplayer-create-map">
                <SelectValue placeholder="Select track or level" />
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
              <Label htmlFor="multiplayer-create-tag-duration">Tag Duration</Label>
              <Select
                value={String(formState.tagDurationMinutes)}
                onValueChange={(value) => {
                  onFormStateChange({
                    ...formState,
                    tagDurationMinutes: Number.parseInt(value, 10),
                  });
                }}
              >
                <SelectTrigger id="multiplayer-create-tag-duration">
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
            <Label htmlFor="multiplayer-create-max-players">Max Players</Label>
            <Select
              value={String(formState.maxPlayers)}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  maxPlayers: Number.parseInt(value, 10),
                });
              }}
            >
              <SelectTrigger id="multiplayer-create-max-players">
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
            <Label htmlFor="multiplayer-create-visibility">Lobby Visibility</Label>
            <Select
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
        </fieldset>
        {errorText ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorText}</AlertDescription>
          </Alert>
        ) : null}

        {busy ? <LobbyProgress isPreloading={isPreloading} action="create" /> : null}
        <div className="sticky bottom-0 flex justify-end bg-background py-2">
          <Button
            type="button"
            size="default"
            disabled={busy}
            onClick={onCreate}
          >
            Create Lobby
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
