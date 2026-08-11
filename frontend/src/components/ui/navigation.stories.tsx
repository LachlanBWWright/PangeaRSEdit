import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Separator } from "./separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Button } from "./button";

function NavigationCard() {
  return (
    <Card className="w-[32rem]">
      <CardHeader>
        <CardTitle>Level inspector</CardTitle>
        <CardDescription>Switch between editor data categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="terrain">Terrain</TabsTrigger>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
          </TabsList>
          <Separator className="my-3" />
          <TabsContent value="items">Item properties are visible.</TabsContent>
          <TabsContent value="terrain">Terrain properties are visible.</TabsContent>
          <TabsContent value="scripts">Script bindings are visible.</TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter><Button size="sm">Save changes</Button></CardFooter>
    </Card>
  );
}

const meta = {
  title: "UI/Navigation and Cards",
  component: NavigationCard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NavigationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TabInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Item properties are visible.")).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Terrain" }));
    await expect(canvas.getByText("Terrain properties are visible.")).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Terrain" })).toHaveAttribute("aria-selected", "true");
  },
};
