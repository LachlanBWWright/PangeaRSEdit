import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { EditorCanvasControls } from "./EditorCanvasControls";
import {
  EmptyFencePrompt,
  EmptyItemPrompt,
  EmptySplinePrompt,
  EmptyWaterPrompt,
} from "./EmptyDataPrompts";

function EmptyStates({ onInitialize }: { onInitialize: () => void }) {
  return (
    <div className="grid w-[64rem] grid-cols-2 gap-3">
      <div className="h-64 rounded border border-gray-700"><EmptyFencePrompt onInitialize={onInitialize} /></div>
      <div className="h-64 rounded border border-gray-700"><EmptyItemPrompt onInitialize={onInitialize} /></div>
      <div className="h-64 rounded border border-gray-700"><EmptyWaterPrompt onInitialize={onInitialize} /></div>
      <div className="h-64 rounded border border-gray-700"><EmptySplinePrompt onInitialize={onInitialize} /></div>
    </div>
  );
}

const initialize = fn();

const meta = {
  title: "Level Editor/Common Controls",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CanvasHistoryAndZoom: Story = {
  render: () => (
    <EditorCanvasControls
      undoData={fn()}
      redoData={fn()}
      zoomOut={fn()}
      zoomIn={fn()}
      dataHistoryIndex={1}
      dataHistoryLength={3}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Undo", "Redo", "Zoom out", "Zoom in"]) {
      const button = canvas.getByRole("button", { name });
      await expect(button).toBeEnabled();
      await userEvent.click(button);
    }
  },
};

export const CanvasHistoryBoundaries: Story = {
  render: () => (
    <EditorCanvasControls
      undoData={fn()}
      redoData={fn()}
      zoomOut={fn()}
      zoomIn={fn()}
      dataHistoryIndex={0}
      dataHistoryLength={1}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Redo" })).toBeDisabled();
  },
};

export const EmptyLevelData: Story = {
  render: () => <EmptyStates onInitialize={initialize} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const actions = canvas.getAllByRole("button");
    await expect(actions).toHaveLength(4);
    for (const action of actions) await userEvent.click(action);
    await expect(initialize).toHaveBeenCalledTimes(4);
  },
};
