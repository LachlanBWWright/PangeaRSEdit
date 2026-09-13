import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { NativeVisualDebugStats } from "@/multiplayer/nativeVisualDebugStats";
import type {
  MultiplayerRuntimeDebugStats,
  MultiplayerNetworkDebugOptions,
} from "@/multiplayer/runtimeBridge";
import type { MultiplayerLobbyDetails } from "@/multiplayer/types";
import { MultiplayerSessionSidebar } from "./MultiplayerSessionSidebar";

const LOBBY = {
  id: "cromag-rally-lobby-7f3a2b9c",
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "3",
  tagDurationMinutes: 3,
  maxPlayers: 4,
  isPublic: true,
  hostParticipantId: "participant-host",
  joinCode: "RALLY3",
  state: "open",
  createdAt: "2026-08-27T09:00:00.000Z",
  expiresAt: "2026-08-27T10:00:00.000Z",
  participantId: "participant-host",
  players: [
    {
      participantId: "participant-host",
      displayName: "Alex (host)",
      playerIndex: 0,
      isHost: true,
      isReady: true,
      region: "Sydney",
      pingMs: 18,
      joinedAt: "2026-08-27T09:01:00.000Z",
      lastSeenAt: "2026-08-27T09:05:00.000Z",
    },
    {
      participantId: "participant-guest-1",
      displayName: "SamiraWithAQuiteLongDisplayName",
      playerIndex: 1,
      isHost: false,
      isReady: true,
      region: "Melbourne",
      pingMs: 42,
      joinedAt: "2026-08-27T09:02:00.000Z",
      lastSeenAt: "2026-08-27T09:05:00.000Z",
    },
    {
      participantId: "participant-guest-2",
      displayName: "Jordan",
      playerIndex: 2,
      isHost: false,
      isReady: false,
      region: "Auckland",
      pingMs: 76,
      joinedAt: "2026-08-27T09:03:00.000Z",
      lastSeenAt: "2026-08-27T09:05:00.000Z",
    },
  ],
} satisfies MultiplayerLobbyDetails;

const runtimeDebugStats: MultiplayerRuntimeDebugStats = {
  sentReliable: 128,
  sentUnreliable: 64,
  received: 124,
  polled: 120,
  rejected: 0,
  impairedDropped: 0,
  impairedDelayed: 0,
  queueDepth: 1,
  lastPacketType: 4,
  lastPacketSequence: 128,
  lastPacketDirection: "recv",
  lastError: null,
};

const nativeDebugStats: NativeVisualDebugStats = {
  frameNumber: 642,
  hasDesync: false,
  lastSyncHash: 1842,
  lastVisualEventSequence: 8,
  appliedVisualEventSequence: 8,
  duplicateVisualEventCount: 0,
  staleVisualEventCount: 0,
};

const networkDebugOptions: MultiplayerNetworkDebugOptions = {
  latencyMs: 0,
  packetLossPercent: 0,
  packetBurstPercent: 0,
  packetBurstSize: 1,
};

const meta = {
  title: "Multiplayer/Session Sidebar",
  component: MultiplayerSessionSidebar,
  parameters: { layout: "fullscreen" },
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof MultiplayerSessionSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CroMagLobby: Story = {
  args: {
    lobby: LOBBY,
    showDebugOverlay: false,
    localParticipantId: "participant-host",
    localPlayerIndex: 0,
    connectionStatus: "connected",
    currentMatchPhase: "lobby",
    rtcStatusText: "waiting for peers",
    displayedPingMs: 18,
    currentMatchKind: "race",
    hudLabel: "Ready when all players are set",
    statusText: "Waiting for players",
    errorText: null,
    isHost: true,
    readyPlayerCount: 2,
    busy: false,
    chatMessages: [
      {
        lobbyId: LOBBY.id,
        participantId: "participant-guest-1",
        displayName: "SamiraWithAQuiteLongDisplayName",
        message: "Ready when you are!",
        createdAt: "2026-08-27T09:04:00.000Z",
      },
    ],
    chatDraft: "",
    localParticipantIsReady: true,
    hasLocalParticipant: true,
    canStartLobby: false,
    canForceStartLobby: true,
    canEndMatch: false,
    packetCounts: { hostSnapshot: 64, clientInput: 60 },
    runtimeDebugStats,
    nativeDebugStats,
    networkDebugOptions,
    onCopyLobbyId: fn(),
    onRemoveParticipant: fn(),
    onChatDraftChange: fn(),
    onSendChat: fn(),
    onToggleReady: fn(),
    onStart: fn(),
    onStartAnyway: fn(),
    onUpdateSelection: fn(),
    onEndMatch: fn(),
    onLeave: fn(),
    onResetNetworkDebugOptions: fn(),
    onUpdateNetworkDebugOption: fn(),
  },
  render: (args) => (
    <div className="flex min-h-screen w-full justify-end bg-slate-950 p-4 text-slate-100">
      <div className="h-[720px] w-[360px] max-w-full">
        <MultiplayerSessionSidebar {...args} />
      </div>
    </div>
  ),
};

export const DebugSidebar: Story = {
  ...CroMagLobby,
  args: {
    ...CroMagLobby.args,
    showDebugOverlay: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Debug" }));
    await expect(
      canvas.getByRole("button", { name: "Copy Lobby ID" }),
    ).toBeVisible();
    await expect(canvas.getByText("Network Impairment")).toBeVisible();
    await expect(canvas.getByText("Multiplayer Debug")).toBeVisible();
  },
};
