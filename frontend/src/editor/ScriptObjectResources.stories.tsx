import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ScriptObjectResources } from "./ScriptObjectResources";
import { ownedResources } from "./ScriptObjectResources.fixtures";

const meta = {
  title: "Editor/Scripting/Object resources", component: ScriptObjectResources,
  args: { handle: { id: 72, generation: 3 }, resources: ownedResources },
  decorators: [(Story) => <div className="w-80 bg-slate-950 p-4 text-xs text-slate-200"><Story /></div>],
} satisfies Meta<typeof ScriptObjectResources>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OwnedCallbacks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Timers (2)"));
    await expect(canvas.getByText(/Every 5.00s/)).toBeVisible();
    await userEvent.click(canvas.getByText("Tasks (1)"));
    await expect(canvas.getByText(/wakes in 2.00s/)).toBeVisible();
    await userEvent.click(canvas.getByText("Event subscriptions (1)"));
    await expect(canvas.getByText(/checkpoint.open · Once/)).toBeVisible();
  },
};

export const OlderRuntime: Story = {
  args: { resources: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Rebuild this game runtime/)).toBeVisible();
  },
};
