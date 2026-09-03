import { expect, userEvent, within } from "storybook/test";
import { Provider, createStore } from "jotai";
import { MemoryRouter } from "react-router-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { CustomObjectsPage } from "./CustomObjectsPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  loadScriptSample,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  createScriptWorkspaceContext,
} from "@/editor/subviews/scripts/scriptWorkspaceState";

function CustomObjectsPageStory() {
  const store = createStore();
  store.set(Globals, OttoGlobals);
  const context = createScriptWorkspaceContext(OttoGlobals, null);
  store.set(
    scriptWorkspaceStoreAtom,
    replaceScriptWorkspace({}, loadScriptSample(context, "hover-beacon")),
  );

  return (
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/custom-objects"]}>
          <CustomObjectsPage />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>
  );
}

const meta = {
  title: "Pages/Custom Objects",
  component: CustomObjectsPageStory,
  parameters: { layout: "fullscreen" },
  tags: ["test", "a11y", "visual", "overflow", "interaction"],
} satisfies Meta<typeof CustomObjectsPageStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GameLibrary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvasElement.querySelector('[aria-label="Game"]')?.textContent).toContain("Otto Matic");
    expect(canvas.getByRole("button", { name: "Create Custom Object Script" })).toBeVisible();
    expect(canvas.queryByText("Instances on this level")).toBeNull();
    expect(canvas.queryByText("Levels")).toBeNull();

    await userEvent.click(canvas.getByRole("combobox", { name: "Game" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Bugdom 2" }));
    expect(canvasElement.querySelector('[aria-label="Game"]')?.textContent).toContain("Bugdom 2");

    await userEvent.click(canvas.getByRole("button", { name: "Create Custom Object Script" }));
    expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeTruthy();
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toContain("Create Script");
  },
};
