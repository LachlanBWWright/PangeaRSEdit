import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { defaultTrackForMode } from "@/multiplayer/menuOptions";
import { MultiplayerSessionStory } from "@/storybook/multiplayer/MultiplayerSessionStory";
import { createSessionStoryProps, FULL_STORY_LOBBY, GUEST, HOST, NANOSAUR_STORY_LOBBY, STORY_LOBBY } from "@/storybook/multiplayer/multiplayerStoryFixtures";

const READY_LOBBY = { ...STORY_LOBBY, players: [HOST, GUEST] };
const meta = {
  title: "Multiplayer/Session",
  component: MultiplayerSessionStory,
  args: createSessionStoryProps(),
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" }, description: { component: "Full production session: game stage and sidebar. Local fixtures let you toggle readiness, select maps, send chat, and change debug settings. Start, leave, remove, and end actions are spies. Runtime examples mount the real game canvas without loading WebAssembly; they cover UI layout, not gameplay or network synchronization." } },
  },
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof MultiplayerSessionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostWaiting: Story = {};
export const HostAlone: Story = {
  args: createSessionStoryProps({ ...STORY_LOBBY, players: [{ ...HOST, isReady: false }] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Waiting for one more player")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Start match" })).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: "More match actions" })).toBeNull();
  },
};

export const EveryoneReady: Story = {
  args: createSessionStoryProps(READY_LOBBY),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Start match" }));
    await expect(args.onStart).toHaveBeenCalled();
  },
};

export const ToggleGuestReady: Story = {
  args: createSessionStoryProps({ ...READY_LOBBY, players: [HOST, { ...GUEST, isReady: false }] }, GUEST.participantId),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ready up" }));
    await expect(canvas.getByText("You’re ready. Waiting for the host to start.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Not ready" }));
    await expect(canvas.getByRole("button", { name: "Ready up" })).toBeEnabled();
    await expect(args.onToggleReady).toHaveBeenCalledTimes(2);
  },
};

export const PrivateLobby: Story = { args: createSessionStoryProps({ ...STORY_LOBBY, isPublic: false }) };
export const FullRoster: Story = { args: createSessionStoryProps(FULL_STORY_LOBBY) };
export const ShortLayout: Story = { args: { short: true } };
export const PhoneLayout: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  parameters: { docs: { description: { story: "Phone viewport: the production grid stacks game stage above lobby controls. Automated layout checks also load this story at 390 × 844." } } },
};
export const NanosaurCaptureTheFlag: Story = { args: createSessionStoryProps(NANOSAUR_STORY_LOBBY) };
export const CroMagKeepAway: Story = {
  args: createSessionStoryProps({ ...STORY_LOBBY, mode: "multiplayerTag1", trackOrLevel: defaultTrackForMode("cromagrally", "multiplayerTag1") }),
  parameters: { docs: { description: { story: "The host can edit arena and tag duration. Both Keep Away and Stampede use this duration control." } } },
};

export const ChangeHostModeAndDuration: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("combobox", { name: "Mode" }));
    await userEvent.click(body.getByRole("option", { name: "Tag: Keep Away (arenas 10-17)" }));
    await userEvent.click(canvas.getByRole("combobox", { name: "Tag Duration" }));
    await userEvent.click(body.getByRole("option", { name: "4 minutes" }));
    await expect(args.onUpdateSelection).toHaveBeenLastCalledWith("multiplayerTag1", defaultTrackForMode("cromagrally", "multiplayerTag1"), 4);
    await expect(canvas.getByRole("combobox", { name: "Tag Duration" })).toHaveTextContent("4 minutes");
  },
};

export const CopyJoinCode: Story = {
  parameters: { docs: { description: { story: "Uses the browser clipboard boundary. Secure contexts with permission show success; unavailable or denied clipboard access shows manual-copy guidance. The displayed code stays selectable in both cases." } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Copy code" }));
    await expect(await canvas.findByText(/Join code copied|Copy is unavailable|Could not copy the code/)).toBeVisible();
    await expect(canvas.getByText("RALLY3", { exact: true })).toBeVisible();
  },
};

export const SendChatWithEnter: Story = {
  args: { chatMessages: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Chat message" });
    await userEvent.type(input, "Let’s race!{Enter}");
    await expect(canvas.getByText("Let’s race!")).toBeVisible();
    await expect(input).toHaveValue("");
    await expect(args.onSendChat).toHaveBeenCalled();
  },
};

export const LongChat: Story = {
  args: {
    chatMessages: Array.from({ length: 12 }, (_, index) => ({
      lobbyId: STORY_LOBBY.id, participantId: GUEST.participantId, displayName: GUEST.displayName,
      message: `Message ${String(index + 1)}: Let’s try the next arena after this race.`,
      createdAt: `2026-08-27T09:04:${String(index).padStart(2, "0")}.000Z`,
    })),
  },
};

export const BusyLobby: Story = { args: { busy: true, statusText: "Updating match setup…" } };
export const ConnectingPeers: Story = { args: { connectionStatus: "connecting", rtcStatusText: "connecting", currentMatchPhase: "loading", statusText: "Connecting to other players…" } };
export const LoadingRuntime: Story = {
  args: { ...createSessionStoryProps({ ...READY_LOBBY, state: "started" }), activeMatchConfigPresent: true,
    currentMatchPhase: "loading", statusText: "Launching multiplayer runtime…" },
};
export const WaitingForPeerRuntime: Story = {
  ...LoadingRuntime,
  args: { ...LoadingRuntime.args, statusText: "Waiting for peers to finish runtime load…" },
};
export const MatchInProgress: Story = {
  ...LoadingRuntime,
  args: { ...LoadingRuntime.args, currentMatchPhase: "active", statusText: "Match started" },
  parameters: { docs: { description: { story: "The real canvas surface with host End Match and Leave Lobby controls. No game is drawn because this story does not initialize the native runtime." } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Multiplayer Game")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Ready up" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "End Match" }));
    await expect(args.onEndMatch).toHaveBeenCalled();
  },
};
export const GuestInProgress: Story = {
  args: { ...createSessionStoryProps({ ...READY_LOBBY, state: "started" }, GUEST.participantId),
    activeMatchConfigPresent: true, currentMatchPhase: "active", statusText: "Match in progress" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button", { name: "End Match" })).toBeNull();
  },
};
export const RematchReady: Story = {
  args: { ...createSessionStoryProps({ ...READY_LOBBY, state: "match_ended" }), statusText: "Match ended by host" },
  parameters: { docs: { description: { story: "The current post-match UI returns to the waiting stage and offers Start rematch. It does not display a results table." } } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Start rematch" }));
    await expect(args.onStart).toHaveBeenCalled();
  },
};
export const RematchWaiting: Story = {
  args: { ...createSessionStoryProps({ ...STORY_LOBBY, state: "match_ended" }), statusText: "Match ended. Waiting for players to ready up." },
};
export const ConnectionLost: Story = {
  args: { connectionStatus: "disconnected", rtcStatusText: "failed", currentMatchPhase: "teardown",
    statusText: "Connection lost", errorText: "Could not reconnect to the host. Leave the lobby and rejoin." },
};
export const RuntimeFailure: Story = {
  args: { ...createSessionStoryProps({ ...READY_LOBBY, state: "started" }), currentMatchPhase: "teardown",
    errorText: "This game runtime is incompatible with the match. Reload the app and rejoin.", statusText: "Could not launch the match" },
};
export const DebugControls: Story = {
  args: { showDebugOverlay: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Debug" }));
    await userEvent.click(canvas.getByRole("slider", { name: "Artificial latency" }));
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onUpdateNetworkDebugOption).toHaveBeenLastCalledWith("latencyMs", 25);
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
    await expect(args.onResetNetworkDebugOptions).toHaveBeenCalled();
    await expect(canvas.getByRole("slider", { name: "Artificial latency" })).toHaveAttribute("aria-valuenow", "0");
  },
};
