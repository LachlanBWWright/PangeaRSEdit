import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { Game } from "@/data/globals/globals";
import { View } from "@/editor/viewEnum";
import { enableStoryScripting, GameEditorStory } from "@/storybook/actualEditorMenuStory";
import { expect, userEvent, within } from "storybook/test";

enableStoryScripting();

const meta = {
  title: "Scripts/Level Workspace",
  component: GameEditorStory,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: "fullscreen" },
  tags: ["visual", "overflow"],
  args: { game: Game.OTTO_MATIC, view: View.scripts, withScriptSample: true },
} satisfies Meta<typeof GameEditorStory>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Populated: Story = {};
export const Empty: Story = { args: { withScriptSample: false } };
export const ReferenceWhileEditing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("tab", { name: "Assignments" }));
    await userEvent.click(canvas.getByRole("tab", { name: "Level events" }));
    await userEvent.click(canvas.getByRole("tab", { name: "Code" }));
    await userEvent.click(canvas.getByRole("button", { name: "Hooks & API Reference" }));
    expect(canvas.getByRole("complementary", { name: "Scripting reference" })).toBeVisible();
    expect(canvas.getByRole("region", { name: "Lua source editor" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Back to assignments" }));
    expect(canvas.getByRole("tab", { name: "Level events" })).toHaveAttribute("data-state", "active");
  },
};
