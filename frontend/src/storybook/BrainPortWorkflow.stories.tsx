import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { err } from "neverthrow";
import { BrainPortWorkflowStory } from "./BrainPortWorkflowStory";
import { loadBrainPortWorkflow } from "./brainPortWorkflowFixture";

const meta = {
  title: "Workflows/Brain Port", component: BrainPortWorkflowStory,
  args: { fixture: err("Waiting for bundled Earth Farm assets."), step: "appearance" },
  parameters: { layout: "fullscreen" }, tags: ["test", "interaction", "visual"],
  loaders: [async () => ({ fixture: await loadBrainPortWorkflow() })],
  render: (args, { loaded }) => <BrainPortWorkflowStory fixture={loaded.fixture} step={args.step} />,
} satisfies Meta<typeof BrainPortWorkflowStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CreateObject: Story = {
  args: { step: "create" },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Create your first object" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(dialog.getByLabelText("Object name"), "Brain Port");
    expect(dialog.getByRole("button", { name: /^Create object$/ })).toBeEnabled();
  },
};

export const Appearance: Story = {
  args: { step: "appearance" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("Object name")).toHaveValue("Brain Port");
    await userEvent.click(canvas.getByText("Objects in this file"));
    expect(canvas.getByRole("button", { name: "Use model 6" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const thumbnail = canvas.getByRole("button", { name: "Use model 6" }).querySelector("canvas");
      const pixels = thumbnail?.getContext("2d")?.getImageData(0, 0, 96, 96).data;
      expect(pixels?.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
    }, { timeout: 60_000 });
    await waitFor(() => expect(canvas.getByLabelText("Selected model preview").querySelector("canvas")).toBeVisible(), { timeout: 60_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Use model 7" }));
    expect(canvas.getByRole("button", { name: "Use model 7" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByText("Native asset details", { exact: true }));
    expect(canvas.getByLabelText("Model object ID")).toHaveValue(6);
    await userEvent.click(canvas.getByRole("button", { name: "Use model 6" }));
    expect(canvas.getByLabelText("Model object ID")).toHaveValue(5);
    expect(canvas.getByLabelText("Model scale")).toHaveValue(3.5);
  },
};

export const Behavior: Story = {
  args: { step: "behavior" },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector(".monaco-editor")).toBeVisible(), { timeout: 30_000 });
    const editor = canvasElement.querySelector(".monaco-editor");
    const workspace = canvasElement.querySelector(".scripting-workspace");
    expect(editor).not.toBeNull();
    expect(workspace).not.toBeNull();
    if (editor && workspace) expect(editor.getBoundingClientRect().top).toBeLessThan(workspace.getBoundingClientRect().bottom - 200);
    expect(within(canvasElement).getByRole("button", { name: "Save source" })).toBeDisabled();
  },
};

export const Placement: Story = {
  args: { step: "placement" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Brain Port near player start", { exact: true })).toBeVisible();
    expect(canvasElement.querySelector("#scripted-item-x")).toHaveValue(340);
    expect(canvasElement.querySelector("#scripted-item-z")).toHaveValue(2150);
    expect(canvas.getByRole("button", { name: /^Edit definition$/ })).toBeEnabled();
  },
};

export const TestAndExport: Story = {
  args: { step: "export" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("button", { name: /^Test with scripts$/ })).toBeEnabled();
    expect(canvas.getByRole("button", { name: /^Export extended level$/ })).toBeEnabled();
    await userEvent.click(canvas.getByText(/^No draft changes ·/));
    expect(canvas.getByText(/No scripted preview prepared/)).toBeVisible();
  },
};
