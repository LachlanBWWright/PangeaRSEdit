import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  GameEditorStory,
  enableStoryScripting,
} from "@/storybook/actualEditorMenuStory";
import { Game } from "@/data/globals/globals";

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
