import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScriptDialoguePanel } from "./ScriptDialoguePanel";

const meta = {
  title: "Editor/Scripts/Dialogue",
  component: ScriptDialoguePanel,
  args: { onSave: () => undefined, gameId: "OttoMatic-Android" },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ScriptDialoguePanel>;

export default meta;
type Story = StoryObj<typeof meta>;
export const CreateConversation: Story = {};
export const BillyFrontier: Story = { args: { gameId: "BillyFrontier-Android" } };
