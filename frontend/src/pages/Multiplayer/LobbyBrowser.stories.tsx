import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { filterPublicLobbies, defaultLobbyFormState, type LobbyFormState } from "@/multiplayer/menuOptions";
import type { MultiplayerLobbySummary } from "@/multiplayer/types";
import { LobbyBrowser } from "./LobbyBrowser";

const STORY_LOBBIES = [
  {
    id: "cromag-race-lobby",
    gameId: "cromagrally",
    mode: "multiplayerRace",
    trackOrLevel: "3",
    tagDurationMinutes: 3,
    maxPlayers: 4,
    isPublic: true,
    joinCode: "RALLY3",
    state: "open",
    playerCount: 2,
    createdAt: "2026-01-01T12:00:00.000Z",
    expiresAt: "2026-01-01T13:00:00.000Z",
    canJoin: true,
  },
  {
    id: "nanosaur-race-lobby",
    gameId: "nanosaur2",
    mode: "multiplayerRace",
    trackOrLevel: "3",
    tagDurationMinutes: 3,
    maxPlayers: 2,
    isPublic: true,
    joinCode: "NANO22",
    state: "open",
    playerCount: 1,
    createdAt: "2026-01-01T12:05:00.000Z",
    expiresAt: "2026-01-01T13:05:00.000Z",
    canJoin: true,
  },
  {
    id: "full-lobby",
    gameId: "cromagrally",
    mode: "multiplayerBattle",
    trackOrLevel: "12",
    tagDurationMinutes: 3,
    maxPlayers: 2,
    isPublic: true,
    joinCode: "FULL12",
    state: "open",
    playerCount: 2,
    createdAt: "2026-01-01T12:10:00.000Z",
    expiresAt: "2026-01-01T13:10:00.000Z",
    canJoin: false,
  },
] satisfies readonly MultiplayerLobbySummary[];

function LobbyBrowserStory() {
  const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false);
  const [formState, setFormState] = useState<LobbyFormState>(
    defaultLobbyFormState,
  );
  const [joinLobbyId, setJoinLobbyId] = useState("");
  const [joinGameFilter, setJoinGameFilter] = useState<"all" | "cromagrally" | "nanosaur2">("all");
  const [joinModeFilter, setJoinModeFilter] = useState<"all" | "race" | "battle" | "capture-the-flag">("all");
  const displayedPublicLobbies = filterPublicLobbies(
    STORY_LOBBIES,
    joinGameFilter,
    joinModeFilter,
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 p-6 text-slate-100">
      <LobbyBrowser
        isCreateLobbyOpen={isCreateLobbyOpen}
        formState={formState}
        joinLobbyId={joinLobbyId}
        busy={false}
        isPreloading={false}
        lobbyListErrorText={null}
        displayedPublicLobbies={displayedPublicLobbies}
        joinGameFilter={joinGameFilter}
        joinModeFilter={joinModeFilter}
        onCreateLobbyOpenChange={setIsCreateLobbyOpen}
        onFormStateChange={setFormState}
        onJoinLobbyIdChange={setJoinLobbyId}
        onJoinGameFilterChange={setJoinGameFilter}
        onJoinModeFilterChange={setJoinModeFilter}
        onRefreshLobbies={() => undefined}
        onCreateLobby={() => setIsCreateLobbyOpen(false)}
        onJoinLobby={() => undefined}
        onQuickJoinLobby={() => undefined}
      />
    </div>
  );
}

const meta = {
  title: "Multiplayer/Lobby Browser",
  component: LobbyBrowserStory,
  parameters: {
    layout: "fullscreen",
  },
  render: () => <LobbyBrowserStory />,
  tags: ["test", "smoke", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof LobbyBrowserStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowLayout: Story = {
};
