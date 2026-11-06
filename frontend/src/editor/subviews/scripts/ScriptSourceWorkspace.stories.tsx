import { useState } from "react";
import { Provider } from "jotai";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { OttoGlobals } from "@/data/globals/globals";
import { ScriptSourceWorkspace } from "./ScriptSourceWorkspace";
import { createScriptWorkspaceContext, ensureScriptWorkspace, setScriptActiveFile, upsertScriptSourceFile } from "./scriptWorkspaceState";
import "./scriptWorkbench.css";

const sourcePath = "Data/Scripts/src/dynamic-loader.lua";
function dependencyWorkspace() {
  let state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  state = upsertScriptSourceFile(state, sourcePath, 'local name = "helpers.objectives"\nreturn require(name)');
  state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/objectives.lua", "return {}");
  return setScriptActiveFile(state, sourcePath);
}

function SourceWorkspaceStory() {
  const [workspace, update] = useState(dependencyWorkspace);
  return <Provider><TooltipProvider><main className="script-workbench scripting-workspace min-h-screen"><ScriptSourceWorkspace workspace={workspace} update={update} onError={fn()} /></main></TooltipProvider></Provider>;
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

export const ExplicitExecutionScope: Story = {
  args: { workspace: dependencyWorkspace(), update: fn(), onError: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scope = canvas.getByRole("combobox", { name: /Execution scope/ });
    await expect(scope).toHaveValue("helper");
    await userEvent.selectOptions(scope, "game");
    await expect(scope).toHaveValue("game");
    await userEvent.selectOptions(scope, "helper");
    await expect(scope).toHaveValue("helper");
  },
};

export const ProductionLayout: Story = {
  args: { workspace: dependencyWorkspace(), update: fn(), onError: fn() },
  play: async ({ canvasElement }) => {
    const workspace = canvasElement.querySelector(".workbench-source-layout");
    expect(workspace).not.toBeNull();
    if (!workspace) return;
    expect(getComputedStyle(workspace).display).toBe("grid");
    expect(getComputedStyle(workspace).getPropertyValue("--workbench-text").trim()).not.toBe("");
    const canvas = within(canvasElement);
    expect(canvas.getByRole("main")).toHaveClass("script-workbench");
    await waitFor(() => expect(canvasElement.querySelector(".monaco-editor")).toBeVisible());
    expect(canvas.getByRole("button", { name: "Show API reference" })).toBeVisible();
    expect(canvas.queryByRole("region", { name: "Lua API reference" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Show API reference" }));
    expect(canvas.getByRole("region", { name: "Lua API reference" })).toBeVisible();
  },
};
