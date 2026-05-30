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
  getModeOptions,
  getTrackOptions,
  usesCroMagTagDuration,
  type LobbyFormState,
} from "@/multiplayer/menuOptions";

interface CreateLobbyDialogProps {
  readonly open: boolean;
  readonly formState: LobbyFormState;
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFormStateChange: (nextState: LobbyFormState) => void;
  readonly onCreate: () => void;
}

export function CreateLobbyDialog({
  open,
  formState,
  busy,
  onOpenChange,
  onFormStateChange,
  onCreate,
}: CreateLobbyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lobby</DialogTitle>
          <DialogDescription>
            Choose the match setup, then invite others by lobby ID or join code.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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
            <Label>Game</Label>
            <Select
              value={formState.gameId}
              onValueChange={(nextGameId) => {
                onFormStateChange(
                  buildUpdatedLobbyFormState(formState, nextGameId),
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cromagrally">Cro-Mag Rally</SelectItem>
                <SelectItem value="nanosaur2">Nanosaur 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <Select
              value={formState.mode}
              onValueChange={(nextMode) => {
                onFormStateChange(buildUpdatedLobbyModeState(formState, nextMode));
              }}
            >
              <SelectTrigger>
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
            <Label>Track / Level</Label>
            <Select
              value={formState.trackOrLevel}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  trackOrLevel: value,
                });
              }}
            >
              <SelectTrigger>
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
              <Label>Tag Duration</Label>
              <Select
                value={String(formState.tagDurationMinutes)}
                onValueChange={(value) => {
                  onFormStateChange({
                    ...formState,
                    tagDurationMinutes: Number.parseInt(value, 10),
                  });
                }}
              >
                <SelectTrigger>
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
            <Label>Max Players</Label>
            <Select
              value={String(formState.maxPlayers)}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  maxPlayers: Number.parseInt(value, 10),
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select max players" />
              </SelectTrigger>
              <SelectContent>
                {["2", "3", "4", "5", "6"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} players
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lobby Visibility</Label>
            <Select
              value={formState.isPublic ? "public" : "private"}
              onValueChange={(value) => {
                onFormStateChange({
                  ...formState,
                  isPublic: value === "public",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lobby visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (listed)</SelectItem>
                <SelectItem value="private">Private (invite only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
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
