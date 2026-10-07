import { expect, userEvent, within } from "storybook/test";
import { Provider, createStore } from "jotai";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { CustomObjectsPage } from "./CustomObjectsPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { enableStoryScripting } from "@/storybook/actualEditorMenuStory";
import {
  loadScriptSample,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  createScriptWorkspaceContext,
} from "@/editor/subviews/scripts/scriptWorkspaceState";

enableStoryScripting();

function createLibraryStore() {
  const store = createStore();
  store.set(Globals, OttoGlobals);
  const context = createScriptWorkspaceContext(OttoGlobals, null);
  store.set(
    scriptWorkspaceStoreAtom,
    replaceScriptWorkspace({}, loadScriptSample(context, "hover-beacon")),
  );
  return store;
}

function CustomObjectsPageStory() {
  const [store] = useState(createLibraryStore);

  return (
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/custom-objects"]}>
          <Navigation />
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
    expect(canvas.getByRole("tab", { name: "Custom items" })).toBeVisible();
    expect(canvas.queryByText("Instances on this level")).toBeNull();
    expect(canvas.queryByText("Levels")).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Edit item script" }));
    expect(canvas.getByRole("tab", { name: "Code" })).toHaveAttribute("data-state", "active");
    expect(canvas.getByRole("region", { name: "Code workspace" })).toBeVisible();
  },
};
export const LibraryLayout: Story = {};

export const ItemScriptingReference: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit item script" }));
    expect(canvas.getByText("Used by Hover Beacon")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Hooks & API Reference" }));
    expect(canvas.getByRole("complementary", { name: "Scripting reference" })).toBeVisible();
    expect(canvas.getByRole("region", { name: "Lua source editor" })).toBeVisible();
    expect(canvas.getByRole("tab", { name: "Code" })).toHaveAttribute("data-state", "active");
    await userEvent.click(canvas.getByRole("button", { name: "Close scripting reference" }));
    await userEvent.click(canvas.getByRole("button", { name: "Back to custom items" }));
    expect(canvas.getByRole("button", { name: "Edit item script" })).toBeVisible();
  },
};
