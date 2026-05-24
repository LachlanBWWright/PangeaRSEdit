import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateLobbyDialog } from "./CreateLobbyDialog";
import { MultiplayerLobbyFilters } from "./MultiplayerLobbyFilters";
import { MultiplayerLobbyList } from "./MultiplayerLobbyList";
import type { LobbyBrowserProps } from "./types";

export function LobbyBrowser({
  isCreateLobbyOpen,
  formState,
  joinLobbyId,
  busy,
  isPreloading,
  lobbyListErrorText,
  displayedPublicLobbies,
  joinGameFilter,
  joinModeFilter,
  onCreateLobbyOpenChange,
  onFormStateChange,
  onJoinLobbyIdChange,
  onJoinGameFilterChange,
  onJoinModeFilterChange,
  onRefreshLobbies,
  onCreateLobby,
  onJoinLobby,
  onQuickJoinLobby,
}: LobbyBrowserProps) {
  const controlsDisabled = busy || isPreloading;

  return (
    <>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Find a Lobby</CardTitle>
              <CardDescription className="text-muted-foreground">
                Choose a display name, join an open lobby, or enter a lobby ID
                or code directly.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={controlsDisabled}
              onClick={() => {
                onCreateLobbyOpenChange(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Lobby
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(12rem,20rem)_1fr]">
            <div className="space-y-2">
              <Label htmlFor="multiplayer-display-name">Display Name</Label>
              <Input
                id="multiplayer-display-name"
                value={formState.displayName}
                disabled={controlsDisabled}
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="multiplayer-join-lobby-id"
                  value={joinLobbyId}
                  placeholder="Paste a lobby ID or enter a public join code"
                  disabled={busy}
                  onChange={(event) => {
                    onJoinLobbyIdChange(event.target.value);
                  }}
                />
                <Button
                  type="button"
                  className="sm:w-auto"
                  disabled={controlsDisabled || joinLobbyId.trim().length === 0}
                  onClick={onJoinLobby}
                >
                  Join Lobby
                </Button>
              </div>
            </div>
          </div>
          <MultiplayerLobbyFilters
            joinGameFilter={joinGameFilter}
            joinModeFilter={joinModeFilter}
            busy={controlsDisabled}
            onJoinGameFilterChange={onJoinGameFilterChange}
            onJoinModeFilterChange={onJoinModeFilterChange}
            onRefresh={onRefreshLobbies}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {lobbyListErrorText ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lobbyListErrorText}
            </div>
          ) : null}
          <MultiplayerLobbyList
            lobbies={displayedPublicLobbies}
            busy={controlsDisabled}
            onQuickJoin={onQuickJoinLobby}
            onOpenCreate={() => {
              onCreateLobbyOpenChange(true);
            }}
          />
        </CardContent>
      </Card>

      <CreateLobbyDialog
        open={isCreateLobbyOpen}
        formState={formState}
        busy={controlsDisabled}
        onOpenChange={onCreateLobbyOpenChange}
        onFormStateChange={onFormStateChange}
        onCreate={onCreateLobby}
      />
    </>
  );
}
