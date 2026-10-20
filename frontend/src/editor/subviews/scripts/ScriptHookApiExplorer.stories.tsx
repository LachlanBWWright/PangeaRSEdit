import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bugdom2Globals, OttoGlobals, NanosaurGlobals } from "@/data/globals/globals";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";

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
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 3)),
    onCreateHook: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Functions/ }));
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Search scripting hooks and APIs" }),
      "spawn",
    );

    await userEvent.click(canvas.getByText(/pangea.spawn.scripted\(/));
    expect(canvas.getByText("Spawns a custom scripted object.")).toBeVisible();
    expect(args.onCreateHook).not.toHaveBeenCalled();
  },
};

export const OttoHookContracts: Story = {
  args: {
    gameId: createScriptWorkspaceContext(OttoGlobals, 4).gameId,
    supportedHooks: createScriptWorkspaceContext(OttoGlobals, 4).supportedHooks,
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 4)),
    onCreateHook: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Hooks/ }));
    const createHandlerButton = canvas.getAllByRole("button", { name: "Create handler" })[0];
    if (!createHandlerButton) return;
    await userEvent.click(createHandlerButton);

    expect(args.onCreateHook).toHaveBeenCalledTimes(1);
    await userEvent.type(canvas.getByRole("textbox", { name: "Search scripting hooks and APIs" }), "onDamage");
    const contextSummary = canvas.getAllByText("DamageContext extends LevelContext")[0];
    expect(contextSummary).toBeDefined();
    if (!contextSummary?.parentElement) return;
    await userEvent.click(contextSummary);
    const context = within(contextSummary.parentElement);
    expect(context.getByText("playerNum number")).toBeVisible();
    expect(context.getByText("gameId string")).toBeVisible();
    await userEvent.click(canvas.getByText("DamageResult", { selector: "summary" }));
    expect(canvas.getByText("applyDamage boolean|nil")).toBeVisible();
  },
};

export const LearnTheApi: Story = {
  args: {
    gameId: createScriptWorkspaceContext(NanosaurGlobals, 0).gameId,
    supportedHooks: createScriptWorkspaceContext(NanosaurGlobals, 0).supportedHooks,
    workspace: ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Learn" }));
    await userEvent.selectOptions(canvas.getByLabelText("Guide section"), "level-startup-and-a-delayed-message");
    expect(canvas.getByRole("article", { name: "Scripting guide" }).textContent).toContain("pangea.time.after");
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Scripting guide" }), "scripting-runtime.md");
    await userEvent.selectOptions(canvas.getByLabelText("Guide section"), "custom-objects-and-lifetime");
    expect(canvas.getByRole("article", { name: "Scripting guide" }).textContent).toContain("pangea.object.state(self.handle)");
    expect(canvas.getByRole("table")).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: /Hooks/ }));
    await userEvent.type(canvas.getByLabelText("Search scripting hooks and APIs"), "onSave");
    expect(canvas.getByText("No matching scripting entries.")).toBeVisible();
    await userEvent.click(canvas.getByLabelText("Include other games"));
    expect(canvas.getByText("onSave", { selector: "p" })).toBeVisible();
    expect(canvas.getByText("Not advertised by the selected game.")).toBeVisible();
  },
};
