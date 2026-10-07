import { useState } from "react";
import { defaultLobbyFormState, filterPublicLobbies, type JoinGameFilter, type JoinModeFilter, type LobbyFormState } from "@/multiplayer/menuOptions";
import type { MultiplayerLobbySummary } from "@/multiplayer/types";
import { LobbyBrowser } from "@/pages/Multiplayer/LobbyBrowser";
import { STORY_LOBBIES } from "./multiplayerStoryFixtures";

export interface LobbyBrowserStoryProps {
  readonly busy?: boolean;
  readonly isPreloading?: boolean;
  readonly initialCreateLobbyOpen?: boolean;
  readonly initialFormState?: LobbyFormState;
  readonly initialGameFilter?: JoinGameFilter;
  readonly initialModeFilter?: JoinModeFilter;
  readonly lobbies?: readonly MultiplayerLobbySummary[];
  readonly initialError?: string | null;
  readonly actionError?: string | null;
  readonly lobbyListErrorText?: string | null;
  readonly narrow?: boolean;
  readonly onCreateLobby?: () => void;
  readonly onJoinLobby?: () => void;
  readonly onQuickJoinLobby?: (lobbyId: string) => void;
  readonly onRefreshLobbies?: () => void;
}

export function LobbyBrowserStory({
  busy = false, isPreloading = false, initialCreateLobbyOpen = false,
  initialFormState = defaultLobbyFormState, initialGameFilter = "all", initialModeFilter = "all",
  lobbies = STORY_LOBBIES, initialError = null, actionError = null,
  lobbyListErrorText = null, narrow = false,
  onCreateLobby, onJoinLobby, onQuickJoinLobby, onRefreshLobbies,
}: LobbyBrowserStoryProps) {
  const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(initialCreateLobbyOpen);
  const [formState, setFormState] = useState(initialFormState);
  const [joinLobbyId, setJoinLobbyId] = useState("");
  const [joinGameFilter, setJoinGameFilter] = useState(initialGameFilter);
  const [joinModeFilter, setJoinModeFilter] = useState(initialModeFilter);
  const [errorText, setErrorText] = useState(initialError);

  return (
    <div className={`flex h-dvh min-h-0 flex-col bg-background p-4 text-foreground ${narrow ? "w-80 max-w-full" : "w-full"}`}>
      <LobbyBrowser
        isCreateLobbyOpen={isCreateLobbyOpen}
        formState={formState}
        joinLobbyId={joinLobbyId}
        busy={busy}
        isPreloading={isPreloading}
        lobbyListErrorText={lobbyListErrorText}
        errorText={errorText}
        displayedPublicLobbies={filterPublicLobbies(lobbies, joinGameFilter, joinModeFilter)}
        joinGameFilter={joinGameFilter}
        joinModeFilter={joinModeFilter}
        onCreateLobbyOpenChange={setIsCreateLobbyOpen}
        onFormStateChange={setFormState}
        onJoinLobbyIdChange={setJoinLobbyId}
        onJoinGameFilterChange={setJoinGameFilter}
        onJoinModeFilterChange={setJoinModeFilter}
        onRefreshLobbies={() => onRefreshLobbies?.()}
        onCreateLobby={() => {
          onCreateLobby?.();
          if (actionError) setErrorText(actionError);
          else setIsCreateLobbyOpen(false);
        }}
        onJoinLobby={() => {
          onJoinLobby?.();
          setErrorText(actionError);
        }}
        onQuickJoinLobby={(id) => {
          onQuickJoinLobby?.(id);
          setErrorText(actionError);
        }}
        onClearError={() => setErrorText(null)}
      />
    </div>
  );
}
