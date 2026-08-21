import { useState } from "react";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateLobbyDialog } from "./CreateLobbyDialog";
import { JoinLobbyDialog } from "./JoinLobbyDialog";
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
  const [isJoinLobbyOpen, setIsJoinLobbyOpen] = useState(false);

  return (
    <>
      <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border pb-3">
          <h1 className="mr-auto text-2xl font-semibold">Find a Lobby</h1>
          <div className="flex flex-wrap items-center gap-2">
            <MultiplayerLobbyFilters
              joinGameFilter={joinGameFilter}
              joinModeFilter={joinModeFilter}
              busy={controlsDisabled}
              onJoinGameFilterChange={onJoinGameFilterChange}
              onJoinModeFilterChange={onJoinModeFilterChange}
              onRefresh={onRefreshLobbies}
            />
            <Button
              type="button"
              size="default"
              variant="outline"
              className="h-9"
              disabled={controlsDisabled}
              onClick={() => {
                setIsJoinLobbyOpen(true);
              }}
            >
              Join by code
            </Button>
            <Button
              type="button"
              size="default"
              variant="outline"
              className="h-9"
              disabled={controlsDisabled}
              onClick={() => {
                onCreateLobbyOpenChange(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Lobby
            </Button>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="Open lobbies">
          {lobbyListErrorText ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 py-2 text-destructive">
              <AlertDescription>{lobbyListErrorText}</AlertDescription>
            </Alert>
          ) : null}
          <MultiplayerLobbyList
            lobbies={displayedPublicLobbies}
            busy={controlsDisabled}
            onQuickJoin={onQuickJoinLobby}
          />
        </section>
      </main>

      <JoinLobbyDialog
        open={isJoinLobbyOpen}
        formState={formState}
        joinLobbyId={joinLobbyId}
        busy={controlsDisabled}
        onOpenChange={setIsJoinLobbyOpen}
        onFormStateChange={onFormStateChange}
        onJoinLobbyIdChange={onJoinLobbyIdChange}
        onJoin={() => {
          setIsJoinLobbyOpen(false);
          onJoinLobby();
        }}
      />

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
