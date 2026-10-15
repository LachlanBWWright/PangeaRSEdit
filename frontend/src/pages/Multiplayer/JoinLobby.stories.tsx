import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { defaultLobbyFormState } from "@/multiplayer/menuOptions";
import { JoinLobbyDialog } from "./JoinLobbyDialog";

interface JoinStoryProps {
  readonly busy: boolean;
  readonly isPreloading: boolean;
  readonly code: string;
  readonly error: string | null;
  readonly onJoin: () => void;
}

function JoinStory({ busy, isPreloading, code, error, onJoin }: JoinStoryProps) {
  const [formState, setFormState] = useState({ ...defaultLobbyFormState, displayName: "Samira" });
  const [joinCode, setJoinCode] = useState(code);
  const [open, setOpen] = useState(true);
  return (
    <JoinLobbyDialog open={open} formState={formState} joinLobbyId={joinCode}
      busy={busy} isPreloading={isPreloading} errorText={error}
      onOpenChange={setOpen} onFormStateChange={setFormState}
      onJoinLobbyIdChange={setJoinCode} onJoin={onJoin} />
  );
}

const meta = {
  title: "Multiplayer/Join by Code",
  component: JoinStory,
  args: { busy: false, isPreloading: false, code: "", error: null, onJoin: fn() },
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "600px" }, description: { component: "The production join dialog accepts a display name and lobby code. Empty codes disable submission; preparing and joining states freeze the inputs. Action spies do not validate a code against the backend." } },
  },
  tags: ["test", "a11y", "visual", "interaction"],
} satisfies Meta<typeof JoinStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCode: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("button", { name: "Join Lobby" })).toBeDisabled();
  },
};

export const EnterAndSubmitCode: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(body.getByRole("textbox", { name: "Join code" }), "RALLY3");
    await userEvent.click(body.getByRole("button", { name: "Join Lobby" }));
    await expect(args.onJoin).toHaveBeenCalled();
  },
};

export const PreparingFiles: Story = { args: { code: "RALLY3", busy: true, isPreloading: true } };
export const Joining: Story = { args: { code: "RALLY3", busy: true } };
export const InvalidCode: Story = { args: { code: "OLD123", error: "No lobby was found for this code. Check the code with your host." } };
export const FullLobby: Story = { args: { code: "FULL12", error: "This lobby is full. Ask the host to free a slot." } };
export const ExpiredLobby: Story = { args: { code: "OLD123", error: "This lobby is no longer open for joining." } };
export const PreparationFailure: Story = { args: { code: "RALLY3", error: "Could not load the game files. Check your connection and try again." } };
