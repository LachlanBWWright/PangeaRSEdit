import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ok } from "neverthrow";
import type { QueryScriptState } from "./utils/scriptState";
import { ScriptInstanceState, ScriptStateTable } from "./ScriptInstanceState";

const inspect: QueryScriptState = (query) => ok({
  entries: query.path.length ? [
    { key: 1, type: "string", value: "checkpoint opened", expandable: false, cycle: false, truncated: false },
    { key: "parent", type: "table", value: "table", expandable: false, cycle: true, truncated: false },
  ] : [
    { key: "objectives", type: "table", value: "table", expandable: true, cycle: false, truncated: false },
    { key: "health", type: "number", value: "0.75", expandable: false, cycle: false, truncated: false },
  ], offset: 0, nextOffset: null, total: 2, truncated: false, error: null,
});
const meta = { title: "Editor/Scripting/Instance state", component: ScriptInstanceState,
  args: { handle: { id: 72, generation: 3 }, preview: {}, query: inspect },
  decorators: [(Story) => <div className="w-80 bg-slate-950 p-4 text-xs text-slate-200"><Story /></div>],
} satisfies Meta<typeof ScriptInstanceState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NestedAndCyclic: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /objectives/ }));
    await expect(await canvas.findByText(/checkpoint opened/)).toBeVisible();
    await expect(canvas.getByText(/Cycle to an ancestor/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /objectives/ }));
    await expect(canvas.queryByText(/checkpoint opened/)).not.toBeInTheDocument();
  },
};

const inspectDepth: QueryScriptState = () => ok({
  entries: [
    { key: "child", type: "table", value: "table", expandable: false, cycle: false, truncated: true },
    { key: null, type: "string", value: "value of an unsupported key", expandable: false, cycle: false, truncated: true },
  ], offset: 0, nextOffset: null, total: 2, truncated: false, error: null,
});

export const DepthAndUnsupportedKeys: Story = {
  render: (args) => <ScriptStateTable handle={args.handle} query={inspectDepth} path={Array.from({ length: 16 }, (_, index) => `child${index}`)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Maximum inspection depth reached/)).toBeVisible();
    await expect(canvas.getByText("Unsupported key", { exact: true })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /child/ })).not.toBeInTheDocument();
  },
};
