import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { defaultLobbyFormState, defaultTrackForMode, type LobbyFormState } from "@/multiplayer/menuOptions";
import { LobbyBrowserStory } from "@/storybook/multiplayer/LobbyBrowserStory";

function setup(gameId: "cromagrally" | "nanosaur2", mode: string): LobbyFormState {
  return { ...defaultLobbyFormState, displayName: "Alex", gameId, mode, trackOrLevel: defaultTrackForMode(gameId, mode) };
}

const meta = {
  title: "Multiplayer/Lobby Setup",
  component: LobbyBrowserStory,
  args: { initialCreateLobbyOpen: true, initialFormState: setup("cromagrally", "multiplayerRace"), onCreateLobby: fn() },
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" }, description: { component: "Production create dialog over the lobby browser. Every supported game mode has a setup example with valid bundled track or level choices. The local fixture owns form state; submission is recorded without creating a server lobby." } },
  },
  tags: ["test", "a11y", "visual", "interaction"],
} satisfies Meta<typeof LobbyBrowserStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CroMagRace: Story = {};
export const CroMagKeepAway: Story = {
  args: { initialFormState: setup("cromagrally", "multiplayerTag1") },
  parameters: { docs: { description: { story: "Keep Away uses battle arenas and exposes a constrained tag duration selector (2–4 minutes)." } } },
};
export const CroMagStampede: Story = { args: { initialFormState: setup("cromagrally", "multiplayerTag2") } };
export const CroMagSurvival: Story = { args: { initialFormState: setup("cromagrally", "multiplayerSurvival") } };
export const CroMagQuestForFire: Story = { args: { initialFormState: setup("cromagrally", "multiplayerQuestForFire") } };
export const NanosaurRace: Story = { args: { initialFormState: setup("nanosaur2", "multiplayerRace") } };
export const NanosaurBattle: Story = { args: { initialFormState: setup("nanosaur2", "multiplayerBattle") } };
export const NanosaurCaptureTheFlag: Story = { args: { initialFormState: setup("nanosaur2", "multiplayerFlag") } };

export const PrivateInviteOnly: Story = {
  args: { initialFormState: { ...setup("cromagrally", "multiplayerRace"), isPublic: false } },
  parameters: { docs: { description: { story: "Private lobbies are omitted from public matchmaking and are joined using their code." } } },
};

export const ChangeGameAndMode: Story = {
  parameters: { docs: { description: { story: "Switching game resets mode, map, and capacity to valid choices. This interaction switches to Nanosaur 2 and selects Capture the Flag." } } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(body.getByRole("dialog", { name: "Create Lobby" }));
    await userEvent.click(dialog.getByRole("combobox", { name: "Game" }));
    await userEvent.click(body.getByRole("option", { name: "Nanosaur 2" }));
    await expect(dialog.getByRole("combobox", { name: "Max Players" })).toHaveTextContent("2 players");
    await userEvent.click(dialog.getByRole("combobox", { name: "Mode" }));
    await userEvent.click(body.getByRole("option", { name: "Capture the Flag" }));
    await expect(dialog.queryByRole("combobox", { name: "Tag Duration" })).toBeNull();
    await expect(dialog.getByRole("combobox", { name: "Track / Level" })).not.toHaveTextContent("Stone Age");
  },
};

export const CreateFailure: Story = {
  args: { initialError: "Could not create the lobby. Check your connection and try again.", actionError: "Could not create the lobby. Check your connection and try again." },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(body.getByRole("dialog", { name: "Create Lobby" }));
    await userEvent.click(dialog.getByRole("button", { name: "Create Lobby" }));
    await expect(dialog.getByRole("alert")).toHaveTextContent(args.actionError ?? "");
    await expect(dialog.getByRole("textbox", { name: "Display Name" })).toHaveValue("Alex");
  },
};

export const PreparingFiles: Story = { args: { busy: true, isPreloading: true } };
export const AwaitingCreation: Story = { args: { busy: true } };
