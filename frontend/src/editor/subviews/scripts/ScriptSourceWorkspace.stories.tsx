import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { OttoGlobals } from "@/data/globals/globals";
import { ScriptSourceWorkspace } from "./ScriptSourceWorkspace";
import { createScriptWorkspaceContext, ensureScriptWorkspace, setScriptActiveFile, upsertScriptSourceFile } from "./scriptWorkspaceState";

const sourcePath = "Data/Scripts/src/dynamic-loader.lua";
function dependencyWorkspace() {
  let state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  state = upsertScriptSourceFile(state, sourcePath, 'local name = "helpers.objectives"\nreturn require(name)');
  state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/objectives.lua", "return {}");
  return setScriptActiveFile(state, sourcePath);
}

function SourceWorkspaceStory() {
  const [workspace, update] = useState(dependencyWorkspace);
  return <ScriptSourceWorkspace workspace={workspace} update={update} onError={fn()} />;
}

const meta = {
  title: "Scripts/Lua Source Workspace",
  component: ScriptSourceWorkspace,
  parameters: { layout: "fullscreen" },
  tags: ["test", "interaction"],
  render: SourceWorkspaceStory,
} satisfies Meta<typeof ScriptSourceWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ComputedModuleDependency: Story = {
  args: { workspace: dependencyWorkspace(), update: fn(), onError: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Dynamic module dependencies (0)"));
    const checkbox = canvas.getByRole("checkbox", { name: "helpers.objectives" });
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await expect(canvas.getByText("Dynamic module dependencies (1)")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Clear declared dependencies" }));
    await expect(checkbox).not.toBeChecked();
  },
};
