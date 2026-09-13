import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CanvasViewToggle } from "./CanvasViewToggle";

function CanvasViewToggleStory() {
  return (
    <div className="relative h-20 w-64 bg-slate-900">
      <CanvasViewToggle />
    </div>
  );
}

const meta = {
  title: "Level Editor/Canvas View Toggle",
  component: CanvasViewToggleStory,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <Provider store={createStore()}>
        <Story />
      </Provider>
    ),
  ],
  tags: ["autodocs", "test", "a11y"],
} satisfies Meta<typeof CanvasViewToggleStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
