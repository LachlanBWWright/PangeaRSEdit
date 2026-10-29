import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { ok } from "neverthrow";
import { DesktopProjectController } from "./DesktopProjectController";
import { desktopActiveDocumentAtom, desktopConflictOpenAtom, desktopConsoleOpenAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { installWorkflowBridge, workflowProject } from "./workflowFixtures.stories.support";

const meta = { title: "Desktop/Workflows", component: DesktopProjectController, beforeEach: installWorkflowBridge,
  tags: ["test", "a11y", "interaction", "visual"],
  decorators: [(Story, context) => {
    const store = createStore();
    store.set(desktopProjectAtom, workflowProject); store.set(desktopLevelIdAtom, "farm");
    if (context.name === "Native Console") store.set(desktopConsoleOpenAtom, true);
    if (context.name === "Asset Assignments") store.set(desktopProjectDialogAtom, "assignments");
    if (context.name === "Playable Packs") store.set(desktopProjectDialogAtom, "packs");
    if (context.name === "Editor Settings") store.set(desktopProjectDialogAtom, "settings");
    if (context.name === "Mixed Conflict Review") {
      store.set(desktopExternalProjectAtom, { ...workflowProject, revision: "disk", files: [...workflowProject.files, { path: "Data/Scripts/src/helpers/objectives.lua", hash: "external", size: 32 }] });
      store.set(desktopConflictOpenAtom, true); store.set(desktopProjectDirtyAtom, true);
      store.set(desktopActiveDocumentAtom, { kind: "scripts", save: async () => undefined, discard: () => store.set(desktopProjectDirtyAtom, false), capture: () => "local", prepare: async () => ok({ manifest: workflowProject.manifest, files: [], removed: [] }) });
    }
    return <Provider store={store}><MemoryRouter><Story /></MemoryRouter></Provider>;
  }],
} satisfies Meta<typeof DesktopProjectController>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NativeConsole: Story = { play: async () => {
  const ui = within(within(document.body).getByRole("dialog", { name: "Native game console" }));
  await expect(ui.getByLabelText("Native game output")).toHaveTextContent("missing objective");
  await userEvent.click(ui.getByRole("button", { name: /^Stop$/ }));
  await expect(ui.getByRole("status")).toHaveTextContent("exited");
  await userEvent.click(ui.getByRole("button", { name: /^Restart snapshot$/ }));
  await expect(ui.getByRole("status")).toHaveTextContent("running");
} };
export const AssetAssignments: Story = { play: async () => {
  const ui = within(within(document.body).getByRole("dialog", { name: "Asset assignments" }));
  await userEvent.click(ui.getByRole("button", { name: /^Load targets from installed game$/ }));
  await userEvent.selectOptions(ui.getByLabelText("Project source asset"), "Assets/sprites/farm.palette.tga");
  await userEvent.selectOptions(ui.getByLabelText("Native replacement target"), "Data/Images/farmscene.tga");
  await expect(ui.getByRole("checkbox", { name: /Replace palette colors only/ })).toBeChecked();
  await userEvent.click(ui.getByRole("button", { name: /^Add assignment$/ }));
  await expect(ui.getByText(/farm.palette.tga → Data\/Images\/farmscene.tga/)).toBeVisible();
} };
export const PlayablePacks: Story = { play: async () => {
  const ui = within(within(document.body).getByRole("dialog", { name: "Playable packs" }));
  await expect(ui.getByRole("combobox", { name: "Pack level" })).toHaveValue("farm");
  await userEvent.click(ui.getByRole("button", { name: /^Play pack level$/ }));
  await expect(ui.getByRole("button", { name: /^Import editable project$/ })).toBeEnabled();
} };
export const MixedConflictReview: Story = { play: async () => {
  const ui = within(within(document.body).getByRole("dialog", { name: "Project changed outside the editor" }));
  await userEvent.click(ui.getByRole("button", { name: /^Review and merge files$/ }));
  await expect(ui.getByRole("button", { name: /^Apply merged files and reload$/ })).toBeDisabled();
  await expect(ui.getByLabelText("Merged content of Data/Scripts/src/helpers/objectives.lua")).toHaveValue("local count = 2\nreturn count + 1");
  await userEvent.selectOptions(ui.getByRole("combobox", { name: "Version for Assets/models/ufo.bg3d" }), "disk");
  await expect(ui.getByRole("button", { name: /^Apply merged files and reload$/ })).toBeEnabled();
} };
export const EditorSettings: Story = { play: async () => {
  const ui = within(within(document.body).getByRole("dialog", { name: "Project settings" }));
  await userEvent.selectOptions(ui.getByRole("combobox", { name: /^Preferred external editor/ }), "vscodium");
  await expect(ui.getByRole("combobox", { name: /^Preferred external editor/ })).toHaveValue("vscodium");
  await userEvent.click(ui.getByRole("button", { name: /^Check editor updates$/ }));
  await expect(ui.getByRole("status")).toHaveTextContent("0.2.0 is available");
} };
