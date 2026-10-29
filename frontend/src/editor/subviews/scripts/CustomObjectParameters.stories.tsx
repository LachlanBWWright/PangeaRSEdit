import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { CustomObjectParameters, CustomPlacementParameters } from "./CustomObjectParameters";
import { CustomObjectDefinitionScope } from "./CustomObjectDefinitionScope";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import "./scriptWorkbench.css";

function initialWorkspace(): ScriptWorkspaceState {
  const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const definition = workspace.customObjects[0];
  const level = workspace.levels[workspace.context.levelKey];
  const placement = level?.customPlacements[0];
  if (!definition || !level || !placement) return workspace;
  return { ...workspace, customObjects: [{ ...definition, parameterDefinitions: [{ kind: "number", id: "health", label: "Health", min: 1, max: 100, defaultValue: 10 }] }], levels: {
    ...workspace.levels,
    [workspace.context.levelKey]: { ...level, customPlacements: [placement] },
    other: { ...level, customPlacements: [{ ...placement, id: "second", levelKey: "other", parameterOverrides: { health: 30 } }] },
  } };
}

function ParameterScopeInspector() {
  const [workspace, update] = useState(initialWorkspace);
  const [error, setError] = useState("");
  const definition = workspace.customObjects[0];
  const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
  if (!definition || !placement) return null;
  return <div className="script-workbench grid gap-4 p-4"><CustomObjectDefinitionScope workspace={workspace} definition={definition} /><CustomObjectParameters workspace={workspace} definition={definition} update={update} onError={setError} /><CustomPlacementParameters workspace={workspace} placement={placement} update={update} onError={setError} />{error && <p role="alert">{error}</p>}</div>;
}

const meta = { title: "Scripting/Object Parameter Scope", component: ParameterScopeInspector, tags: ["test", "interaction"], parameters: { layout: "padded" } } satisfies Meta<typeof ParameterScopeInspector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SharedDefaultsAndPlacementOverrides: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/appearance, collision and behavior apply to 2 placements/)).toBeVisible();
    await expect(canvas.getByText(/updates 1 placement across all levels; overrides remain on 1 placement/)).toBeVisible();
    const fields = canvas.getAllByRole("spinbutton", { name: "Health" });
    const shared = fields[0];
    const selected = fields[1];
    if (!shared || !selected) return;
    await userEvent.click(shared);
    await userEvent.keyboard("{Control>}a{/Control}20");
    await expect(selected).toHaveValue(20);
    await userEvent.click(selected);
    await userEvent.keyboard("{Control>}a{/Control}40");
    await expect(canvas.getByText(/updates 0 placements across all levels; overrides remain on 2 placements/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reset to default" }));
    await expect(selected).toHaveValue(20);
    await expect(canvas.getByText("Uses definition default")).toBeVisible();
  },
};
