import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { createStore, Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { ProjectFilesDialog } from "./ProjectFilesDialog";
import { DesktopScriptSource } from "./DesktopScriptSource";
import { desktopLevelIdAtom, desktopProjectAtom, desktopProjectDialogAtom } from "./projectState";

const source = "Data/Scripts/src/helpers/objectives.lua";
const fixture: ProjectSnapshot = { folder: "/home/editor/Projects/Earth missions", revision: "fixture", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, name: "Earth missions", game: "OttoMatic", levels: [
    { id: "farm", name: "Earth farm arrival", baseLevel: 0, primary: ".pangea/levels/farm/level.ter.rsrc", files: [".pangea/levels/farm/level.ter.rsrc"] },
    { id: "rescue", name: "Rescue the farmers and return to the rocket", baseLevel: 0, primary: ".pangea/levels/rescue/level.ter.rsrc", files: [".pangea/levels/rescue/level.ter.rsrc"] },
  ] }, files: [source, "Data/Scripts/types/pangea.lua", ".pangea/levels/farm/level.ter.rsrc", "Assets/models/custom-ufo.bg3d"].map((path) => ({ path, hash: "fixture", size: 1024 })) };

function installBridge() {
  const previous = window.pangeaDesktop;
  window.pangeaDesktop = { request: async (request) => request.operation === "project.save"
    ? { ok: true, value: { ...fixture, revision: "updated", manifest: request.manifest } } : { ok: true, value: undefined },
  onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
  return () => { window.pangeaDesktop = previous; };
}

const meta = { title: "Desktop/Project management", component: ProjectDetailsDialog,
  beforeEach: installBridge, tags: ["test", "a11y", "visual", "interaction"],
  decorators: [(Story, context) => {
    const store = createStore();
    store.set(desktopProjectAtom, fixture);
    store.set(desktopLevelIdAtom, "farm");
    store.set(desktopProjectDialogAtom, context.name === "Files" ? "files" : "levels");
    return <Provider store={store}><MemoryRouter><Story /></MemoryRouter></Provider>;
  }],
} satisfies Meta<typeof ProjectDetailsDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Levels: Story = {
  play: async () => {
    const dialog = within(document.body).getByRole("dialog", { name: "Project levels" });
    const ui = within(dialog);
    const name = ui.getAllByLabelText("Level name")[0];
    const rename = ui.getAllByRole("button", { name: /^Rename$/ })[0];
    const move = ui.getAllByRole("button", { name: /^Move up$/ })[0];
    await expect(name).toBeDefined();
    if (!name || !rename || !move) return;
    await userEvent.clear(name);
    await userEvent.type(name, "Arrival and rescue");
    await userEvent.click(rename);
    await expect(ui.getByRole("button", { name: /^Arrival and rescue$/ })).toBeVisible();
    await expect(move).toBeDisabled();
  },
};
export const Files: Story = { render: () => <ProjectFilesDialog />,
  play: async () => {
    const ui = within(within(document.body).getByRole("dialog", { name: "Project files" }));
    await userEvent.type(ui.getByLabelText("Filter files"), "objectives");
    await expect(ui.getByText(source)).toBeVisible();
    await expect(ui.getByRole("button", { name: /^Open externally$/ })).toBeEnabled();
    await expect(ui.queryByText("Assets/models/custom-ufo.bg3d")).not.toBeInTheDocument();
  },
};
export const ExternalLua: Story = { render: () => <DesktopScriptSource path={source} content={'local pangea = require("pangea")\nreturn { onLevelStart = function() pangea.log.info("Ready") end }'} />,
  play: async ({ canvasElement }) => {
    const ui = within(canvasElement);
    await expect(ui.getByRole("button", { name: /^Open file externally$/ })).toBeEnabled();
    await expect(ui.getByLabelText("Lua source preview")).toHaveTextContent('require("pangea")');
  },
};
