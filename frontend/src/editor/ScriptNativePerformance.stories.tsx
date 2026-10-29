import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { inspectorFixture } from "../../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { ScriptRuntimeMonitor } from "./ScriptRuntimeMonitor";

const meta = {
  title: "Editor/Scripting native performance",
  component: ScriptRuntimeMonitor,
  args: { status: null, previewError: null, files: [], inspector: {
    ...inspectorFixture,
    nativeCosts: {
      current: { level: 0, frame: 120, calls: 3, milliseconds: 4.25,
        operations: [{ operation: "spawn.native", calls: 3, milliseconds: 4.25, maxMilliseconds: 3,
          slowCalls: 1, source: "Data/Scripts/dist/enemy.lua", object: { id: 1, generation: 2 } }] },
      previous: { level: 0, frame: 119, calls: 2, milliseconds: 0.125,
        operations: [{ operation: "world.rayCast", calls: 2, milliseconds: 0.125, maxMilliseconds: 0.1,
          slowCalls: 0, source: "Data/Scripts/dist/player.lua", object: null }] },
    },
  } },
  decorators: [(Story) => <div className="h-[640px] bg-slate-950 p-4"><Story /></div>],
  tags: ["test", "interaction", "a11y"],
} satisfies Meta<typeof ScriptRuntimeMonitor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MeasuredNativeFrames: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const costs = within(canvas.getByRole("region", { name: "Native operation performance" }));
    await userEvent.click(costs.getByText("Current native frame: 3 calls, 4.250 ms"));
    expect(costs.getByText("spawn.native")).toBeVisible();
    expect(costs.getByText("3 calls · total 4.250 ms · maximum 3.000 ms")).toBeVisible();
    expect(costs.getByText("1 call at or above 2 ms")).toBeVisible();
    expect(costs.getByText("Slowest call: Data/Scripts/dist/enemy.lua · object 1:2")).toBeVisible();
    await userEvent.click(costs.getByText("Previous native frame: 2 calls, 0.125 ms"));
    expect(costs.getByText("world.rayCast")).toBeVisible();
    expect(costs.getByText(/separate from Lua instruction budgets/)).toBeVisible();
    expect(canvas.getByText("Instruction budgets: load / event / frame")).toBeVisible();
  },
};

export const OlderRuntime: Story = {
  args: { inspector: inspectorFixture },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByText("Rebuild the game to measure native operation costs.")).toBeVisible();
  },
};

export const RollingAttribution: Story = {
  args: { inspector: { ...inspectorFixture, nativeCosts: { ...meta.args.inspector.nativeCosts,
    window: { capacity: 60, frames: 2, level: 0, calls: 5, milliseconds: 10, maxMilliseconds: 5, slowCalls: 2,
      history: [
        { frame: 119, calls: 2, milliseconds: 3, maxMilliseconds: 2, slowCalls: 1 },
        { frame: 120, calls: 3, milliseconds: 7, maxMilliseconds: 5, slowCalls: 1 },
      ],
      entries: [
        { source: "enemy.lua", object: { id: 1, generation: 1 }, calls: 2, milliseconds: 3, maxMilliseconds: 2, slowCalls: 1 },
        { source: "enemy.lua", object: { id: 1, generation: 2 }, calls: 2, milliseconds: 5, maxMilliseconds: 5, slowCalls: 1 },
      ],
      truncated: true, sourceTruncated: false, unattributedCalls: 1, unattributedMilliseconds: 2,
    },
  } } },
  play: async ({ canvasElement }) => {
    const history = within(within(canvasElement).getByRole("region", { name: "Native cost rolling history" }));
    expect(history.getByText("Last 2 observed frames (up to 60)")).toBeVisible();
    expect(history.getByRole("status")).toHaveTextContent("1 calls (2.000 ms)");
    await userEvent.click(history.getByText("Totals by script"));
    expect(history.getByText("enemy.lua")).toBeVisible();
    expect(history.getByText("4 calls · total 8.000 ms · maximum 5.000 ms · 2 calls ≥ 2 ms")).toBeVisible();
    await userEvent.click(history.getByText("Totals by object"));
    expect(history.getByText("Object 1:1")).toBeVisible();
    expect(history.getByText("Object 1:2")).toBeVisible();
    await userEvent.click(history.getByText("Frame history (oldest first)"));
    expect(history.getByRole("table")).toBeVisible();
  },
};
