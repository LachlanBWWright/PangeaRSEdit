import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuSection } from "./MenuSection";

function CoordinateFields() {
  return (
    <div
      data-editor-menu-column="coordinates"
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
    >
      <Label htmlFor="fixture-x">X</Label>
      <Input id="fixture-x" type="number" value={128} readOnly />
      <Label htmlFor="fixture-z">Z</Label>
      <Input id="fixture-z" type="number" value={256} readOnly />
    </div>
  );
}

function PreviewColumns() {
  return (
    <div
      data-editor-menu-column="controls-and-preview"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Input
          aria-label="Selected terrain feature"
          value="Selected terrain feature with a long name"
          readOnly
        />
        <Button>Apply changes</Button>
      </div>
      <div className="h-20 w-24 rounded border border-gray-600 bg-slate-800" />
    </div>
  );
}

function ActionColumns() {
  return (
    <div
      data-editor-menu-column="actions"
      className="grid min-w-0 grid-cols-3 gap-2"
    >
      <Button size="sm">Add point</Button>
      <Button size="sm" variant="secondary">
        Duplicate
      </Button>
      <Button size="sm" variant="destructive">
        Delete
      </Button>
    </div>
  );
}

function InspectorColumns() {
  return (
    <div
      data-editor-menu-column="inspectors"
      className="grid min-h-0 min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
    >
      {[
        "Selection and transform",
        "Tile attributes and topology",
        "Palette and operations",
      ].map((title) => (
        <section
          key={title}
          className="min-w-0 rounded border border-gray-700 p-2"
        >
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <Input
            aria-label={`${title} value`}
            className="mt-2"
            value="Long editable property value"
            readOnly
          />
        </section>
      ))}
    </div>
  );
}

const EDITOR_MENUS = [
  "Items",
  "Fences",
  "Water",
  "Splines",
  "Tiles",
  "Supertiles",
  "Scripts",
  "Mighty Mike tiles",
] as const;

function MenuLayoutFixture({ menuName = "Standard" }: { menuName?: string }) {
  return (
    <div data-storybook-editor-menu>
      <MenuSection className="min-w-0 p-3">
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="truncate text-sm font-semibold">{menuName} menu</h3>
          <CoordinateFields />
          <PreviewColumns />
          <ActionColumns />
          <InspectorColumns />
        </div>
      </MenuSection>
    </div>
  );
}

function ResponsiveMenuGallery() {
  return (
    <div className="grid min-w-0 gap-6 p-4">
      {[320, 640, 1024].map((width) => (
        <section key={width} className="min-w-0" style={{ width }}>
          <h2 className="mb-2 text-sm text-gray-400">{width}px editor</h2>
          <div className="grid min-w-0 gap-3">
            {EDITOR_MENUS.map((menuName) => (
              <div
                key={menuName}
                className="min-w-0 rounded border border-gray-600"
              >
                <MenuLayoutFixture menuName={menuName} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: "Level Editor/Menu Layouts",
  component: MenuLayoutFixture,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MenuLayoutFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StandardWidth: Story = {};

export const ResponsiveGallery: Story = {
  render: () => <ResponsiveMenuGallery />,
};
