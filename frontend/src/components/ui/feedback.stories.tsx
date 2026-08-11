import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";
import { Progress } from "./progress";

function FeedbackComponents() {
  return (
    <div className="grid w-[32rem] gap-4">
      <Alert>
        <AlertTitle>Level loaded</AlertTitle>
        <AlertDescription>The terrain and item resources are ready.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Validation failed</AlertTitle>
        <AlertDescription>Two resources need attention.</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Badge>Ready</Badge>
        <Badge variant="secondary">Draft</Badge>
        <Badge variant="destructive">Invalid</Badge>
        <Badge variant="outline">Unmodified</Badge>
      </div>
      <Progress aria-label="Level loading progress" value={64} />
    </div>
  );
}

const meta = {
  title: "UI/Feedback",
  component: FeedbackComponents,
  parameters: { layout: "centered" },
} satisfies Meta<typeof FeedbackComponents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("alert")).toHaveLength(2);
    await expect(canvas.getByRole("progressbar", { name: "Level loading progress" })).toHaveAttribute("aria-valuenow", "64");
  },
};
