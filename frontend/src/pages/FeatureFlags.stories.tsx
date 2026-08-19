import type { Meta, StoryObj } from "@storybook/react-vite";
import { FeatureFlagsPage } from "./FeatureFlags";

const meta = {
  title: "Pages/Feature Flags",
  component: FeatureFlagsPage,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs", "test", "smoke", "a11y"],
} satisfies Meta<typeof FeatureFlagsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithScriptingEnabled: Story = {
  render: () => (
    <div className="bg-slate-950 p-4">
      <FeatureFlagsPage />
    </div>
  ),
};
