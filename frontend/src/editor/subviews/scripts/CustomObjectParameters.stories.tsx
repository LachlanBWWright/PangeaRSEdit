import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { CustomObjectParameters, CustomPlacementParameters } from "./CustomObjectParameters";
import { CustomObjectDefinitionScope } from "./CustomObjectDefinitionScope";
import { CustomObjectParameterDefinitions } from "./CustomObjectParameterDefinitions";
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
  return <div className="script-workbench grid gap-4 p-4"><CustomObjectDefinitionScope workspace={workspace} definition={definition} /><CustomObjectParameterDefinitions workspace={workspace} definition={definition} update={update} onError={setError} /><CustomObjectParameters workspace={workspace} definition={definition} update={update} onError={setError} /><CustomPlacementParameters workspace={workspace} placement={placement} update={update} onError={setError} />{error && <p role="alert">{error}</p>}</div>;
}

const meta = { title: "Scripting/Object Parameter Scope", component: ParameterScopeInspector, tags: ["test", "interaction"], parameters: { layout: "padded" } } satisfies Meta<typeof ParameterScopeInspector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SharedDefaultsAndPlacementOverrides: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Shared object · 2 placements")).toBeVisible();
    await userEvent.click(canvas.getByText("Shared object · 2 placements"));
    await expect(canvas.getByText(/Appearance, collision and behavior apply to every placement/)).toBeVisible();
    await expect(canvas.getByText(/updates 1 placement across all levels; overrides remain on 1 placement/)).toBeVisible();
    const fields = canvas.getAllByRole("spinbutton", { name: "Health" });
    const shared = fields[0];
    const selected = fields[1];
    if (!shared || !selected) return;
    await userEvent.click(shared);
    await userEvent.keyboard("{Control>}a{/Control}20");
    await userEvent.tab();
    await expect(selected).toHaveValue(20);
    await userEvent.click(selected);
    await userEvent.keyboard("{Control>}a{/Control}40");
    await userEvent.tab();
    await expect(canvas.getByText(/updates 0 placements across all levels; overrides remain on 2 placements/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reset to default" }));
    await expect(selected).toHaveValue(20);
    await expect(canvas.getByText("Uses definition default")).toBeVisible();
  },
};

export const AuthorBehaviorSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add setting" }));
    await userEvent.type(canvas.getByLabelText("Setting name"), "Spawn interval");
    await userEvent.type(canvas.getByLabelText("Lua identifier"), "spawn_interval");
    await userEvent.clear(canvas.getByLabelText("Default value"));
    await userEvent.type(canvas.getByLabelText("Default value"), "5");
    await userEvent.type(canvas.getByLabelText("Minimum (optional)"), "1");
    await userEvent.type(canvas.getByLabelText("Maximum (optional)"), "60");
    await userEvent.click(canvas.getByRole("button", { name: "Save setting" }));
    await expect(canvas.getAllByRole("spinbutton", { name: "Spawn interval" })).toHaveLength(2);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Spawn interval" }));
    await expect(canvas.getByLabelText("Lua identifier")).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: /^Cancel$/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Remove Spawn interval" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent("Update any Lua references to self.parameters.spawn_interval");
    await userEvent.click(canvas.getByRole("button", { name: "Confirm removal" }));
    await expect(canvas.queryByRole("spinbutton", { name: "Spawn interval" })).not.toBeInTheDocument();
  },
};

export const AuthorBooleanAndChoiceSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add setting" }));
    await userEvent.type(canvas.getByLabelText("Setting name"), "Start active");
    await userEvent.type(canvas.getByLabelText("Lua identifier"), "active");
    await userEvent.selectOptions(canvas.getByLabelText("Value type"), "boolean");
    await userEvent.click(canvas.getByRole("checkbox", { name: "Enabled by default" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save setting" }));
    await expect(canvas.getAllByRole("checkbox", { name: "Start active" })).toHaveLength(2);
    await userEvent.click(canvas.getByRole("button", { name: "Add setting" }));
    await userEvent.type(canvas.getByLabelText("Setting name"), "Spawn mode");
    await userEvent.type(canvas.getByLabelText("Lua identifier"), "mode");
    await userEvent.selectOptions(canvas.getByLabelText("Value type"), "enum");
    await userEvent.type(canvas.getByLabelText("Choice 1 label"), "Once");
    await userEvent.type(canvas.getByLabelText("Choice 1 value"), "once");
    await userEvent.click(canvas.getByRole("button", { name: "Add choice" }));
    await userEvent.type(canvas.getByLabelText("Choice 2 label"), "Repeat");
    await userEvent.type(canvas.getByLabelText("Choice 2 value"), "repeat");
    await userEvent.selectOptions(canvas.getByLabelText("Default choice"), "repeat");
    await userEvent.click(canvas.getByRole("button", { name: "Save setting" }));
    const choices = canvas.getAllByRole("combobox", { name: "Spawn mode" });
    await expect(choices).toHaveLength(2);
    for (const choice of choices) await expect(choice).toHaveValue("repeat");
    const placementChoice = choices[1];
    if (!placementChoice) return;
    await userEvent.selectOptions(placementChoice, "once");
    await expect(placementChoice).toHaveValue("once");
    await expect(canvas.getByText("Placement override")).toBeVisible();
  },
};
