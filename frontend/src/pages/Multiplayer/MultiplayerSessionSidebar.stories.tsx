import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MultiplayerSessionSidebar } from "./MultiplayerSessionSidebar";
import { MultiplayerSessionView } from "./MultiplayerSessionView";
import { createSessionStoryProps, FULL_STORY_LOBBY, GUEST, NANOSAUR_STORY_LOBBY, STORY_LOBBY } from "@/storybook/multiplayer/multiplayerStoryFixtures";

const meta = {
  title: "Multiplayer/Session Sidebar",
  component: MultiplayerSessionSidebar,
  args: createSessionStoryProps(),
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "760px" }, description: { component: "Production lobby sidebar at its desktop column width. Fixtures exercise host and guest permissions, map selection, player removal, readiness, and debug telemetry. Action spies record requests; full composed sessions are documented under Multiplayer/Session." } },
  },
  render: (args) => (
    <div className="flex min-h-screen w-full justify-end bg-background p-4 text-foreground">
      <div className="h-[720px] w-[360px] max-w-full"><MultiplayerSessionSidebar {...args} /></div>
    </div>
  ),
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof MultiplayerSessionSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CroMagLobby: Story = {
  parameters: { docs: { description: { story: "Three players, two ready. The host can change map and mode, remove guests, or explicitly force a start from More match actions." } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const [remove] = canvas.getAllByRole("button", { name: "Remove" });
    await expect(remove).toBeDefined();
    if (remove) await userEvent.click(remove);
    await expect(args.onRemoveParticipant).toHaveBeenCalledWith(GUEST.participantId);
  },
};

export const DebugSidebar: Story = {
  args: { showDebugOverlay: true },
  parameters: { docs: { description: { story: "Feature-flagged diagnostics: signaling and RTC state, packet counters, impairment controls, and native synchronization telemetry. These values are fixtures, not live network measurements." } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Debug" }));
    await expect(canvas.getByRole("button", { name: "Copy Lobby ID" })).toBeVisible();
    await expect(canvas.getByText("Network Impairment")).toBeVisible();
    await expect(canvas.getByText("Multiplayer Debug")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
    await expect(args.onResetNetworkDebugOptions).toHaveBeenCalled();
  },
};

export const ShortSessionLayout: Story = {
  render: (args) => (
    <div className="flex h-[480px] w-full bg-background p-4 text-foreground">
      <MultiplayerSessionView {...createSessionStoryProps()} {...args} activeMatchConfigPresent={false} />
    </div>
  ),
  parameters: { docs: { description: { story: "The production session composition in a short container. Lobby content scrolls above the persistent action footer. Browser layout tests verify chat and match controls remain reachable." } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Start match" })).toBeDisabled();
    await expect(canvas.getByText("2 of 3 players ready")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "More match actions" }));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Start Anyway" }));
    await expect(args.onStartAnyway).toHaveBeenCalled();
  },
};

export const GuestReady: Story = {
  args: createSessionStoryProps(STORY_LOBBY, GUEST.participantId),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("You’re ready. Waiting for the host to start.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Start match" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Remove" })).toBeNull();
    await expect(canvas.queryByRole("combobox")).toBeNull();
  },
};

export const FullRoster: Story = {
  args: createSessionStoryProps(FULL_STORY_LOBBY),
  parameters: { docs: { description: { story: "Cro-Mag Rally's maximum six-player roster with long names and mixed readiness. The footer remains outside the scrolling roster and chat area." } } },
};

export const NanosaurCaptureTheFlag: Story = {
  args: createSessionStoryProps(NANOSAUR_STORY_LOBBY),
  parameters: { docs: { description: { story: "Nanosaur 2 uses its own two-player limit, modes, and bundled multiplayer level names." } } },
};

export const ImpairedNetwork: Story = {
  ...DebugSidebar,
  args: { showDebugOverlay: true, networkDebugOptions: { latencyMs: 250, packetLossPercent: 8, packetBurstPercent: 15, packetBurstSize: 3 } },
};

export const DesyncReported: Story = {
  ...DebugSidebar,
  args: {
    showDebugOverlay: true,
    errorText: "Players are out of sync. End the match and start a rematch.",
    nativeDebugStats: { ...createSessionStoryProps().nativeDebugStats, hasDesync: true },
  },
};
