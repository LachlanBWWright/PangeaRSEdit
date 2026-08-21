import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  GameEditorStory,
  enableStoryScripting,
  EDITOR_MENUS,
} from "@/storybook/actualEditorMenuStory";
import { Game, OttoGlobals } from "@/data/globals/globals";
import { View } from "@/editor/viewEnum";
import {
  buildScriptPackageZipAsync,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  upsertScriptSourceFile,
} from "@/editor/subviews/scripts/scriptWorkspaceState";

enableStoryScripting();

const meta = {
  title: "Level Editor/Menu Layouts",
  component: GameEditorStory,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
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

export const StandardWidth: Story = {
  args: { game: Game.OTTO_MATIC },
  parameters: { viewport: { defaultViewport: "desktop" } },
};

export const ResponsiveGallery: Story = {
  args: { game: Game.OTTO_MATIC },
  render: () => (
    <div className="grid min-w-0 gap-6 bg-slate-950 p-4 text-slate-100 md:grid-cols-2">
      {EDITOR_MENUS.map((config) => (
        <section key={config.name} className="min-w-0 overflow-hidden rounded border border-slate-700">
          <h2 className="border-b border-slate-700 px-3 py-2 text-sm font-semibold">{config.name}</h2>
          <GameEditorStory game={config.game} />
        </section>
      ))}
    </div>
  ),
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "desktop" } },
};

export const ScriptingWorkflow: Story = {
  args: { game: Game.OTTO_MATIC, view: View.scripts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Open Scripts" }),
      ).toBeInTheDocument(),
      { timeout: 30_000 },
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Open Scripts" }),
    );

    const dialog = within(document.body);
    await userEvent.click(dialog.getByRole("tab", { name: "Overview" }));
    const loadButtons = dialog.getAllByRole("button", { name: "Load" });
    expect(loadButtons.length).toBeGreaterThan(0);
    const lastLoadButton = loadButtons[loadButtons.length - 1];
    if (lastLoadButton) {
      await userEvent.click(lastLoadButton);
    }
    await userEvent.click(dialog.getByRole("tab", { name: "Assignments" }));
    expect(dialog.getAllByText("Hover Beacon").length).toBeGreaterThan(0);
    await userEvent.click(dialog.getByRole("combobox", { name: "Hover Beacon collision" }));
    await userEvent.click(dialog.getByRole("option", { name: "Trigger box" }));
    const collisionWidth = dialog.getByLabelText("Hover Beacon collision width");
    await userEvent.clear(collisionWidth);
    await userEvent.type(collisionWidth, "2");
    expect(collisionWidth).toHaveValue(2);

    await userEvent.click(dialog.getByRole("tab", { name: "Code" }));
    const fileName = dialog.getByLabelText("Add file");
    await userEvent.clear(fileName);
    await userEvent.type(fileName, "workflow");
    await userEvent.click(dialog.getByRole("button", { name: "Add" }));
    expect(
      dialog.getByRole("button", { name: /workflow\.lua/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      dialog.getByRole("tab", { name: "Preview and Export" }),
    );
    expect(
      dialog.getByRole("button", { name: "Preview with Scripts" }),
    ).toBeInTheDocument();
    expect(
      dialog.getByRole("button", { name: "Download Script Package" }),
    ).toBeInTheDocument();

    let importedWorkspace = ensureScriptWorkspace(
      {},
      createScriptWorkspaceContext(OttoGlobals, 1),
    );
    importedWorkspace = upsertScriptSourceFile(
      importedWorkspace,
      "Data/Scripts/src/imported.lua",
      "return { onFrame = function() end }",
    );
    const packageResult = await buildScriptPackageZipAsync(importedWorkspace);
    expect(packageResult.isErr()).toBe(false);
    if (packageResult.isErr()) {
      return;
    }
    const packageFile = new File(
      [packageResult.value],
      "reopen-workflow.zip",
      { type: "application/zip" },
    );
    await userEvent.upload(
      dialog.getByLabelText("Upload Script Package"),
      packageFile,
    );
    await waitFor(() =>
      expect(dialog.getByRole("tab", { name: "Code" })).toBeInTheDocument(),
    );
    await userEvent.click(dialog.getByRole("tab", { name: "Code" }));
    await waitFor(() =>
      expect(
        dialog.getAllByRole("button", { name: /imported\.lua/ }).length,
      ).toBeGreaterThan(0),
    );
  },
};
