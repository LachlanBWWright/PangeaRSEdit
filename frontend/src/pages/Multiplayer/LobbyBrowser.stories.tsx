import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { LobbyBrowserStory } from "@/storybook/multiplayer/LobbyBrowserStory";
import { STORY_LOBBIES } from "@/storybook/multiplayer/multiplayerStoryFixtures";

const meta = {
  title: "Multiplayer/Lobby Browser",
  component: LobbyBrowserStory,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" }, description: { component: "Public matchmaking browser. The fixture supplies typed API summaries; filtering and dialogs are the production UI. Actions are spies, so these stories do not contact matchmaking servers or download games." } },
  },
  args: { onCreateLobby: fn(), onJoinLobby: fn(), onQuickJoinLobby: fn(), onRefreshLobbies: fn() },
  tags: ["test", "smoke", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof LobbyBrowserStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { docs: { description: { story: "Cro-Mag Rally and Nanosaur 2 lobbies, including full and started entries. Unavailable entries cannot be joined." } } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Full" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "started" })).toBeDisabled();
    const [join] = canvas.getAllByRole("button", { name: "Join Lobby" });
    await expect(join).toBeDefined();
    if (join) await userEvent.click(join);
    await expect(args.onQuickJoinLobby).toHaveBeenCalledWith(STORY_LOBBIES[0]?.id);
    await userEvent.click(canvas.getByRole("button", { name: "Refresh lobbies" }));
    await expect(args.onRefreshLobbies).toHaveBeenCalled();
  },
};

export const NarrowLayout: Story = {
  args: { narrow: true },
  parameters: { docs: { description: { story: "320 px browser content: filters wrap and lobby actions span the row. Use a phone viewport to inspect the dialogs as well." } } },
};

export const Empty: Story = {
  args: { lobbies: [] },
  parameters: { docs: { description: { story: "No public lobbies are available. Creation and joining by code remain available." } } },
};

export const NoFilterMatches: Story = {
  args: { initialModeFilter: "capture-the-flag" },
  parameters: { docs: { description: { story: "The selected filter has no matches. The current UI uses the same empty message as an empty lobby list." } } },
};

export const FilterByGame: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Game filter" }));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("option", { name: "Nanosaur 2" }));
    await expect(canvas.queryByText("Cro-Mag Rally")).toBeNull();
    await expect(canvas.getAllByRole("button", { name: "Join Lobby" })).toHaveLength(1);
  },
};

export const FilterByMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Mode filter" }));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("option", { name: "Battle / Survival / Tag" }));
    await expect(canvas.queryByRole("button", { name: "Join Lobby" })).toBeNull();
    await expect(canvas.getByRole("button", { name: "Full" })).toBeDisabled();
  },
};

export const ListUnavailable: Story = {
  args: { lobbies: [], lobbyListErrorText: "Could not reach matchmaking. Check your connection and refresh." },
  parameters: { docs: { description: { story: "A list request failed. This documents the current error and empty-state combination; recovery uses Refresh lobbies." } } },
};

export const QuickJoinFailure: Story = {
  args: { initialError: "This lobby filled up before you joined. Choose another lobby.", actionError: "This lobby filled up before you joined. Choose another lobby." },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const [join] = canvas.getAllByRole("button", { name: "Join Lobby" });
    await expect(join).toBeDefined();
    if (join) await userEvent.click(join);
    await expect(canvas.getByRole("alert")).toHaveTextContent(args.actionError ?? "");
  },
};

export const PreparingGame: Story = {
  args: { busy: true, isPreloading: true },
  parameters: { docs: { description: { story: "A quick join is preparing game files. Matchmaking actions are disabled while the operation is in progress." } } },
};

export const JoiningLobby: Story = {
  args: { busy: true },
  parameters: { docs: { description: { story: "Preparation has finished and a quick join is awaiting a lobby response." } } },
};

export const CreatingLobby: Story = {
  args: { busy: true, isPreloading: true, initialCreateLobbyOpen: true },
  parameters: { docs: { description: { story: "The create dialog remains visible during preparation and freezes the submitted setup." } } },
};
