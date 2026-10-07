import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
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
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
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
  args: { game: Game.OTTO_MATIC, view: View.scripts, withScriptSample: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByRole("tab", { name: "Overview" }),
      ).toBeInTheDocument(),
      { timeout: 30_000 },
    );
    expect(canvas.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(canvas.queryAllByRole("button", { name: "Open Scripts" })).toHaveLength(0);
    expect(canvasElement.querySelectorAll("canvas")).toHaveLength(0);

    const dialog = within(document.body);
    await userEvent.click(dialog.getByRole("tab", { name: "Assignments" }));
    expect(dialog.getByRole("tab", { name: "Custom items" })).toHaveAttribute("aria-selected", "true");
    expect(dialog.getAllByText("Hover Beacon").length).toBeGreaterThan(0);
    await userEvent.click(dialog.getByRole("button", { name: "Edit item script" }));
    await waitFor(() => expect(dialog.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true"));
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
    const packageBytes = new ArrayBuffer(packageResult.value.byteLength);
    new Uint8Array(packageBytes).set(packageResult.value);
    const packageFile = new File(
      [packageBytes],
      "reopen-workflow.zip",
      { type: "application/zip" },
    );
    await userEvent.upload(
      dialog.getByLabelText("Upload Script Package"),
      packageFile,
    );
    const review = await dialog.findByRole("dialog", { name: /Review/ });
    await userEvent.click(within(review).getByRole("button", { name: "Add to project" }));
    await waitFor(() => expect(dialog.queryByRole("dialog", { name: /Review/ })).not.toBeInTheDocument());
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
