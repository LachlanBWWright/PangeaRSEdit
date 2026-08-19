import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { Navigation } from "./Navigation";

function NavigationStory() {
  return (
    <div className="min-h-[12rem] bg-slate-950">
      <Navigation />
    </div>
  );
}

const meta = {
  title: "Pages/Navigation",
  component: NavigationStory,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={["/"]}>
          <Story />
        </MemoryRouter>
      </Provider>
    ),
  ],
  tags: ["autodocs", "test", "smoke", "a11y"],
} satisfies Meta<typeof NavigationStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowLayout: Story = {
  parameters: {
    layout: "padded",
  },
  render: () => (
    <div className="w-[320px] bg-slate-950">
      <NavigationStory />
    </div>
  ),
};
