import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bugdom2Globals, OttoGlobals } from "@/data/globals/globals";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import { createScriptWorkspaceContext } from "./scriptWorkspaceState";

const meta = {
  title: "Scripts/Hook and API Explorer",
  component: ScriptHookApiExplorer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <Story />
      </div>
    ),
  ],
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof ScriptHookApiExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bugdom2Reference: Story = {
  args: {
    gameId: createScriptWorkspaceContext(Bugdom2Globals, 3).gameId,
    supportedHooks: createScriptWorkspaceContext(Bugdom2Globals, 3).supportedHooks,
    onCreateHook: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /API/ }));
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Search scripting hooks and APIs" }),
      "spawn",
    );

    expect(canvas.getByText("Spawns a custom scripted object.")).toBeInTheDocument();
    expect(args.onCreateHook).not.toHaveBeenCalled();
  },
};

export const OttoHookContracts: Story = {
  args: {
    gameId: createScriptWorkspaceContext(OttoGlobals, 4).gameId,
    supportedHooks: createScriptWorkspaceContext(OttoGlobals, 4).supportedHooks,
    onCreateHook: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Create handler" })[0]);

    expect(args.onCreateHook).toHaveBeenCalledTimes(1);
  },
};
