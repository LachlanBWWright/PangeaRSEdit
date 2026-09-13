import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScriptGettingStartedPanel } from "./ScriptGettingStartedPanel";

const meta = {
  title: "Scripts/Getting Started Panel",
  component: ScriptGettingStartedPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <Story />
      </div>
    ),
  ],
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof ScriptGettingStartedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

function callbacks() {
  return {
    onCreateHook: fn(),
    onOpenCode: fn(),
    onCompile: fn(),
    onOpenPreview: fn(),
  };
}

export const EmptyWorkspace: Story = {
  args: {
    hasScripts: false,
    ...callbacks(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create a level hook" }));
    await userEvent.click(canvas.getByRole("button", { name: "Open Code" }));
    await userEvent.click(canvas.getByRole("button", { name: "Compile" }));
    await userEvent.click(canvas.getByRole("button", { name: "Preview" }));

    expect(args.onCreateHook).toHaveBeenCalledTimes(1);
    expect(args.onOpenCode).toHaveBeenCalledTimes(1);
    expect(args.onCompile).toHaveBeenCalledTimes(1);
    expect(args.onOpenPreview).toHaveBeenCalledTimes(1);
    expect(canvas.getByText(/Start with `onLevelStart`/)).toBeInTheDocument();
  },
};

export const ExistingWorkspace: Story = {
  args: {
    hasScripts: true,
    ...callbacks(),
  },
};
