import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GameEditorStory, enableStoryScripting, EDITOR_MENUS } from "@/storybook/actualEditorMenuStory";
import { Game, OttoGlobals } from "@/data/globals/globals";
import { View } from "@/editor/viewEnum";
import { buildScriptPackageZipAsync, createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "@/editor/subviews/scripts/scriptWorkspaceState";

enableStoryScripting();
const meta = {
  title: "Level Editor/Menu Layouts", component: GameEditorStory,
  parameters: { layout: "fullscreen" }, tags: ["autodocs"],
} satisfies Meta<typeof GameEditorStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OttoMatic: Story = { args: { game: Game.OTTO_MATIC } };
export const Bugdom: Story = { args: { game: Game.BUGDOM } };
export const Bugdom2: Story = { args: { game: Game.BUGDOM_2 } };
export const Nanosaur: Story = { args: { game: Game.NANOSAUR } };
export const Nanosaur2: Story = { args: { game: Game.NANOSAUR_2 } };
export const CroMagRally: Story = { args: { game: Game.CRO_MAG } };
export const BillyFrontier: Story = { args: { game: Game.BILLY_FRONTIER } };
export const MightyMike: Story = { args: { game: Game.MIGHTY_MIKE } };
export const StandardWidth: Story = { args: { game: Game.OTTO_MATIC }, parameters: { viewport: { defaultViewport: "desktop" } } };
export const ResponsiveGallery: Story = {
  args: { game: Game.OTTO_MATIC },
  render: () => <div className="grid min-w-0 gap-6 bg-slate-950 p-4 text-slate-100 md:grid-cols-2">{EDITOR_MENUS.map((config) => <section key={config.name} className="min-w-0 overflow-hidden rounded border border-slate-700"><h2 className="border-b border-slate-700 px-3 py-2 text-sm font-semibold">{config.name}</h2><GameEditorStory game={config.game} /></section>)}</div>,
};

export const ScriptingWorkflow: Story = {
  args: { game: Game.OTTO_MATIC, view: View.scripts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Level events" })).toBeVisible(), { timeout: 30_000 });
    await userEvent.click(canvas.getByRole("button", { name: "Create Level Start handler" }));
    const eventDialog = body.getByRole("dialog");
    await userEvent.click(within(eventDialog).getByRole("button", { name: "Create Script" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "globals/level-start-script.lua" })).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Level events" }));
    expect(canvas.getByText("Level Start Script")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Edit source" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Save source" })).toBeDisabled());
    await userEvent.click(canvas.getByRole("button", { name: "Objects" }));
    await userEvent.click(canvas.getByRole("button", { name: "New object" }));
    const dialog = body.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Object name"), "Workflow lantern");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create object" }));
    await waitFor(() => expect(canvas.getByLabelText("Object name")).toHaveValue("Workflow lantern"));
    await userEvent.click(canvas.getByRole("button", { name: "Collision" }));
    await userEvent.click(canvas.getByRole("radio", { name: /Trigger An overlap/ }));
    await userEvent.clear(canvas.getByLabelText("Collision width"));
    await userEvent.type(canvas.getByLabelText("Collision width"), "160");
    await userEvent.tab();
    expect(canvas.getByLabelText("Collision width")).toHaveValue(160);
    await userEvent.click(canvas.getByRole("button", { name: "Level events" }));
    const replace = canvas.queryByRole("button", { name: "Replace selected item" });
    if (replace && !replace.hasAttribute("disabled")) {
      await userEvent.click(replace);
      expect(canvas.getByRole("button", { name: "Restore native item" })).toBeVisible();
    }
    await userEvent.click(canvas.getByRole("button", { name: "Lua source" }));
    expect(canvas.getByRole("region", { name: "Lua API reference" })).toBeVisible();
    await userEvent.type(canvas.getByLabelText("New helper module"), "workflow");
    await userEvent.click(canvas.getByRole("button", { name: "Add file" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "workflow.lua" })).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Test & export" }));
    expect(canvas.getByRole("button", { name: "Test with scripts" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "Export extended level" })).toBeVisible();
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    const imported = upsertScriptSourceFile(ensureScriptWorkspace({}, context), "Data/Scripts/src/imported.lua", "return { onFrame = function() end }");
    const packageResult = await buildScriptPackageZipAsync(imported);
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;
    const bytes = new Uint8Array(packageResult.value.byteLength);
    bytes.set(packageResult.value);
    await userEvent.upload(canvas.getByLabelText("Upload Script Package"), new File([bytes], "workflow.zip", { type: "application/zip" }));
    await userEvent.click(canvas.getByRole("button", { name: "Lua source" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "imported.lua" })).toBeVisible());
  },
};
