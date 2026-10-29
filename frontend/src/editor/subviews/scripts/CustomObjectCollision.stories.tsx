import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MightyMikeGlobals, OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { createObjectDefinition } from "./scriptObjectActions";
import { CustomObjectCollision } from "./CustomObjectCollision";
import "./scriptWorkbench.css";

function CollisionInspector({ gameId = "OttoMatic-Android" }: { gameId?: string }) {
  const [created] = useState(() => createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(gameId === "MightyMike-Android" ? MightyMikeGlobals : OttoGlobals, null)), "Checkpoint volume", "blank"));
  const [definition, setDefinition] = useState(created.isOk() ? created.value.state.customObjects[0] : undefined);
  if (!definition) return null;
  return <div className="script-workbench p-4"><CustomObjectCollision definition={definition} gameId={gameId} onChange={setDefinition} /></div>;
}

const meta = { title: "Scripting/Object Collision Inspector", component: CollisionInspector, tags: ["test", "a11y", "visual", "interaction"], parameters: { layout: "padded" } } satisfies Meta<typeof CollisionInspector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WorldAlignedBounds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /Trigger An overlap/ }));
    expect(canvas.getByRole("img", { name: /Front.*100 by 100/ })).toBeVisible();
    await userEvent.clear(canvas.getByLabelText("Collision width"));
    await userEvent.type(canvas.getByLabelText("Collision width"), "161");
    await userEvent.tab();
    expect(canvas.getByRole("img", { name: /Front.*160 by 100/ })).toBeVisible();
    expect(canvas.getByRole("img", { name: /Top.*160 by 100/ })).toBeVisible();
  },
};

export const MightyMikeSpritePlane: Story = {
  args: { gameId: "MightyMike-Android" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /Solid A box/ }));
    expect(canvas.getByRole("img", { name: /Sprite plane.*100 by 100/ })).toBeVisible();
    expect(canvas.queryByRole("img", { name: /Top/ })).not.toBeInTheDocument();
    expect(canvas.getByText(/depth is ignored/)).toBeVisible();
  },
};
