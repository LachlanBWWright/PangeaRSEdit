import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";
import { toast } from "sonner";

export interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  category: "Characters" | "Levels" | "Objects";
}

export interface GameInfo {
  id: string;
  name: string;
  models: GameModel[];
}

export interface GameModelSelectorProps {
  onLoadModel: (bg3dFile: File, skeletonFile?: File) => Promise<void>;
  loading: boolean;
}

// Game data structure - organized by game with their models
const GAMES: GameInfo[] = [
  {
    id: "ottomatic",
    name: "Otto Matic",
    models: [
      // Character Models with Skeletons
      { name: "Otto", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc", category: "Characters" },
      { name: "Onion", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Onion.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Onion.skeleton.rsrc", category: "Characters" },
      { name: "BeeWoman", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/BeeWoman.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/BeeWoman.skeleton.rsrc", category: "Characters" },
      { name: "Blob", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Blob.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Blob.skeleton.rsrc", category: "Characters" },
      { name: "BrainAlien", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/BrainAlien.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/BrainAlien.skeleton.rsrc", category: "Characters" },
      { name: "EliteBrainAlien", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/EliteBrainAlien.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/EliteBrainAlien.skeleton.rsrc", category: "Characters" },
      { name: "Farmer", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Farmer.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Farmer.skeleton.rsrc", category: "Characters" },
      { name: "Mutant", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mutant.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mutant.skeleton.rsrc", category: "Characters" },
      { name: "Scientist", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Scientist.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Scientist.skeleton.rsrc", category: "Characters" },
      { name: "SkirtLady", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/SkirtLady.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/SkirtLady.skeleton.rsrc", category: "Characters" },
      { name: "Strongman", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Strongman.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Strongman.skeleton.rsrc", category: "Characters" },
      { name: "Clown", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Clown.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Clown.skeleton.rsrc", category: "Characters" },
      { name: "ClownFish", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/ClownFish.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/ClownFish.skeleton.rsrc", category: "Characters" },
      { name: "Corn", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Corn.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Corn.skeleton.rsrc", category: "Characters" },
      { name: "Flamester", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Flamester.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Flamester.skeleton.rsrc", category: "Characters" },
      { name: "GiantLizard", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/GiantLizard.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/GiantLizard.skeleton.rsrc", category: "Characters" },
      { name: "IceCube", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/IceCube.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/IceCube.skeleton.rsrc", category: "Characters" },
      { name: "Mantis", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mantis.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Mantis.skeleton.rsrc", category: "Characters" },
      { name: "MutantRobot", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/MutantRobot.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/MutantRobot.skeleton.rsrc", category: "Characters" },
      { name: "PitcherPlant", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/PitcherPlant.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/PitcherPlant.skeleton.rsrc", category: "Characters" },
      { name: "PodWorm", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/PodWorm.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/PodWorm.skeleton.rsrc", category: "Characters" },
      { name: "SlimeTree", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/SlimeTree.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/SlimeTree.skeleton.rsrc", category: "Characters" },
      { name: "Squooshy", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Squooshy.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Squooshy.skeleton.rsrc", category: "Characters" },
      { name: "Tomato", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Tomato.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Tomato.skeleton.rsrc", category: "Characters" },
      { name: "Turtle", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/Turtle.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/Turtle.skeleton.rsrc", category: "Characters" },
      { name: "VenusFlytrap", bg3dFile: "/PangeaRSEdit/games/ottomatic/skeletons/VenusFlytrap.bg3d", skeletonFile: "/PangeaRSEdit/games/ottomatic/skeletons/VenusFlytrap.skeleton.rsrc", category: "Characters" },
      // Level Models
      { name: "Level 1 - Farm", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level1_farm.bg3d", category: "Levels" },
      { name: "Level 2 - Slime", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level2_slime.bg3d", category: "Levels" },
      { name: "Level 3 - Blob Boss", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level3_blobboss.bg3d", category: "Levels" },
      { name: "Level 4 - Apocalypse", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level4_apocalypse.bg3d", category: "Levels" },
      { name: "Level 5 - Cloud", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level5_cloud.bg3d", category: "Levels" },
      { name: "Level 6 - Jungle", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level6_jungle.bg3d", category: "Levels" },
      { name: "Level 8 - Fire Ice", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level8_fireice.bg3d", category: "Levels" },
      { name: "Level 9 - Saucer", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level9_saucer.bg3d", category: "Levels" },
      { name: "Level 10 - Brain Boss", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/level10_brainboss.bg3d", category: "Levels" },
      // Object Models
      { name: "Global Models", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/global.bg3d", category: "Objects" },
      { name: "Main Menu", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/mainmenu.bg3d", category: "Objects" },
      { name: "Bonus", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/bonus.bg3d", category: "Objects" },
      { name: "High Scores", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/highscores.bg3d", category: "Objects" },
      { name: "Level Intro", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/LevelIntro.bg3d", category: "Objects" },
      { name: "Lose Screen", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/losescreen.bg3d", category: "Objects" },
      { name: "Win Screen", bg3dFile: "/PangeaRSEdit/games/ottomatic/models/winscreen.bg3d", category: "Objects" }
    ]
  },
  {
    id: "bugdom2",
    name: "Bugdom 2",
    models: [
      // Character Models with Skeletons
      { name: "BuddyBug", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/BuddyBug.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/BuddyBug.skeleton.rsrc", category: "Characters" },
      { name: "Ant", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Ant.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Ant.skeleton.rsrc", category: "Characters" },
      { name: "BumbleBee", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/BumbleBee.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/BumbleBee.skeleton.rsrc", category: "Characters" },
      { name: "DragonFly", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/DragonFly.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/DragonFly.skeleton.rsrc", category: "Characters" },
      { name: "Frog", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Frog.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Frog.skeleton.rsrc", category: "Characters" },
      { name: "Checkpoint", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Checkpoint.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Checkpoint.skeleton.rsrc", category: "Characters" },
      { name: "Chipmunk", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Chipmunk.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Chipmunk.skeleton.rsrc", category: "Characters" },
      { name: "ComputerBug", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/ComputerBug.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/ComputerBug.skeleton.rsrc", category: "Characters" },
      { name: "EvilPlant", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/EvilPlant.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/EvilPlant.skeleton.rsrc", category: "Characters" },
      { name: "Fish", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Fish.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Fish.skeleton.rsrc", category: "Characters" },
      { name: "Flea", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Flea.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Flea.skeleton.rsrc", category: "Characters" },
      { name: "Gnome", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Gnome.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Gnome.skeleton.rsrc", category: "Characters" },
      { name: "Grasshopper", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Grasshopper.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Grasshopper.skeleton.rsrc", category: "Characters" },
      { name: "HoboBag", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/HoboBag.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/HoboBag.skeleton.rsrc", category: "Characters" },
      { name: "HouseFly", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/HouseFly.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/HouseFly.skeleton.rsrc", category: "Characters" },
      { name: "Moth", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Moth.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Moth.skeleton.rsrc", category: "Characters" },
      { name: "Mouse", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Mouse.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Mouse.skeleton.rsrc", category: "Characters" },
      { name: "MouseTrap", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/MouseTrap.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/MouseTrap.skeleton.rsrc", category: "Characters" },
      { name: "OttoToy", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/OttoToy.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/OttoToy.skeleton.rsrc", category: "Characters" },
      { name: "Roach", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Roach.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Roach.skeleton.rsrc", category: "Characters" },
      { name: "Snail", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Snail.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Snail.skeleton.rsrc", category: "Characters" },
      { name: "SnakeHead", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/SnakeHead.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/SnakeHead.skeleton.rsrc", category: "Characters" },
      { name: "Soldier", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Soldier.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Soldier.skeleton.rsrc", category: "Characters" },
      { name: "Tick", bg3dFile: "/PangeaRSEdit/games/bugdom2/skeletons/Tick.bg3d", skeletonFile: "/PangeaRSEdit/games/bugdom2/skeletons/Tick.skeleton.rsrc", category: "Characters" },
      // Level Models
      { name: "Level 1 - Garden", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level1_Garden.bg3d", category: "Levels" },
      { name: "Level 2 - Sidewalk", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level2_Sidewalk.bg3d", category: "Levels" },
      { name: "Level 4 - Plumbing", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level4_Plumbing.bg3d", category: "Levels" },
      { name: "Level 5 - Playroom", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level5_Playroom.bg3d", category: "Levels" },
      { name: "Level 6 - Closet", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level6_Closet.bg3d", category: "Levels" },
      { name: "Level 7 - Gutter", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level7_Gutter.bg3d", category: "Levels" },
      { name: "Level 8 - Garbage", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level8_Garbage.bg3d", category: "Levels" },
      { name: "Level 9 - Balsa", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level9_Balsa.bg3d", category: "Levels" },
      { name: "Level 10 - Park", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Level10_Park.bg3d", category: "Levels" },
      // Object Models
      { name: "Global Models", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Global.bg3d", category: "Objects" },
      { name: "Main Menu", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/MainMenu.bg3d", category: "Objects" },
      { name: "Bonus", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Bonus.bg3d", category: "Objects" },
      { name: "Foliage", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Foliage.bg3d", category: "Objects" },
      { name: "High Scores", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/HighScores.bg3d", category: "Objects" },
      { name: "Level Intro", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/LevelIntro.bg3d", category: "Objects" },
      { name: "Lose Screen", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/LoseScreen.bg3d", category: "Objects" },
      { name: "Title", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/Title.bg3d", category: "Objects" },
      { name: "Win Screen", bg3dFile: "/PangeaRSEdit/games/bugdom2/models/WinScreen.bg3d", category: "Objects" }
    ]
  },
  {
    id: "cromagrally",
    name: "Cro-Mag Rally",
    models: [
      // Character Models with Skeletons
      { name: "Brog", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Brog.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Brog.skeleton.rsrc", category: "Characters" },
      { name: "BrogStanding", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/BrogStanding.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/BrogStanding.skeleton.rsrc", category: "Characters" },
      { name: "BrontoNeck", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/BrontoNeck.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/BrontoNeck.skeleton.rsrc", category: "Characters" },
      { name: "Camel", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Camel.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Camel.skeleton.rsrc", category: "Characters" },
      { name: "Catapult", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Catapult.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Catapult.skeleton.rsrc", category: "Characters" },
      { name: "Dragon", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Dragon.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Dragon.skeleton.rsrc", category: "Characters" },
      { name: "Druid", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Druid.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Druid.skeleton.rsrc", category: "Characters" },
      { name: "Flag", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Flag.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Flag.skeleton.rsrc", category: "Characters" },
      { name: "Flower", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Flower.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Flower.skeleton.rsrc", category: "Characters" },
      { name: "Grag", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Grag.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Grag.skeleton.rsrc", category: "Characters" },
      { name: "GragStanding", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/GragStanding.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/GragStanding.skeleton.rsrc", category: "Characters" },
      { name: "Mummy", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Mummy.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Mummy.skeleton.rsrc", category: "Characters" },
      { name: "PolarBear", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/PolarBear.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/PolarBear.skeleton.rsrc", category: "Characters" },
      { name: "Pterodactyl", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Pterodactyl.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Pterodactyl.skeleton.rsrc", category: "Characters" },
      { name: "Shark", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Shark.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Shark.skeleton.rsrc", category: "Characters" },
      { name: "Troll", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Troll.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Troll.skeleton.rsrc", category: "Characters" },
      { name: "Viking", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Viking.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Viking.skeleton.rsrc", category: "Characters" },
      { name: "Yeti", bg3dFile: "/PangeaRSEdit/games/cromagrally/skeletons/Yeti.bg3d", skeletonFile: "/PangeaRSEdit/games/cromagrally/skeletons/Yeti.skeleton.rsrc", category: "Characters" },
      // Level Models
      { name: "Atlantis", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/atlantis.bg3d", category: "Levels" },
      { name: "Aztec", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/aztec.bg3d", category: "Levels" },
      { name: "China", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/china.bg3d", category: "Levels" },
      { name: "Coliseum", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/coliseum.bg3d", category: "Levels" },
      { name: "Crete", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/crete.bg3d", category: "Levels" },
      { name: "Desert", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/desert.bg3d", category: "Levels" },
      { name: "Egypt", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/egypt.bg3d", category: "Levels" },
      { name: "Europe", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/europe.bg3d", category: "Levels" },
      { name: "Ice", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/ice.bg3d", category: "Levels" },
      { name: "Jungle", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/jungle.bg3d", category: "Levels" },
      { name: "Scandinavia", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/scandinavia.bg3d", category: "Levels" },
      { name: "Stonehenge", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/stonehenge.bg3d", category: "Levels" },
      { name: "Tarpits", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/tarpits.bg3d", category: "Levels" },
      // Object Models
      { name: "Global Models", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/global.bg3d", category: "Objects" },
      { name: "Car Parts", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/carparts.bg3d", category: "Objects" },
      { name: "Car Select", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/carselect.bg3d", category: "Objects" },
      { name: "Ramps", bg3dFile: "/PangeaRSEdit/games/cromagrally/models/ramps.bg3d", category: "Objects" }
    ]
  },
  {
    id: "nanosaur2",
    name: "Nanosaur 2",
    models: [
      // Character Models with Skeletons
      { name: "Nano", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/nano.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/nano.skeleton.rsrc", category: "Characters" },
      { name: "Raptor", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/raptor.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/raptor.skeleton.rsrc", category: "Characters" },
      { name: "Brach", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/brach.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/brach.skeleton.rsrc", category: "Characters" },
      { name: "Ramphor", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/ramphor.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/ramphor.skeleton.rsrc", category: "Characters" },
      { name: "BonusWorm", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/bonusworm.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/bonusworm.skeleton.rsrc", category: "Characters" },
      { name: "Worm", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/worm.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/worm.skeleton.rsrc", category: "Characters" },
      { name: "WormHole", bg3dFile: "/PangeaRSEdit/games/nanosaur2/skeletons/wormhole.bg3d", skeletonFile: "/PangeaRSEdit/games/nanosaur2/skeletons/wormhole.skeleton.rsrc", category: "Characters" },
      // Level Models
      { name: "Desert Level", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/desert.bg3d", category: "Levels" },
      { name: "Forest Level", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/forest.bg3d", category: "Levels" },
      { name: "Swamp Level", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/swamp.bg3d", category: "Levels" },
      // Object Models
      { name: "Global Models", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/global.bg3d", category: "Objects" },
      { name: "Level Intro", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/levelintro.bg3d", category: "Objects" },
      { name: "Player Parts", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/playerparts.bg3d", category: "Objects" },
      { name: "Weapons", bg3dFile: "/PangeaRSEdit/games/nanosaur2/models/weapons.bg3d", category: "Objects" }
    ]
  },
  {
    id: "billyfrontier",
    name: "Billy Frontier",
    models: [
      // Character Models with Skeletons
      { name: "Billy", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Billy.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Billy.skeleton.rsrc", category: "Characters" },
      { name: "Bandito", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Bandito.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Bandito.skeleton.rsrc", category: "Characters" },
      { name: "FrogMan", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/FrogMan.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/FrogMan.skeleton.rsrc", category: "Characters" },
      { name: "KangaRex", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaRex.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaRex.skeleton.rsrc", category: "Characters" },
      { name: "KangaCow", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaCow.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/KangaCow.skeleton.rsrc", category: "Characters" },
      { name: "Rygar", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Rygar.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Rygar.skeleton.rsrc", category: "Characters" },
      { name: "Shorty", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Shorty.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Shorty.skeleton.rsrc", category: "Characters" },
      { name: "TremorAlien", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/TremorAlien.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/TremorAlien.skeleton.rsrc", category: "Characters" },
      { name: "TremorGhost", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/TremorGhost.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/TremorGhost.skeleton.rsrc", category: "Characters" },
      { name: "Walker", bg3dFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Walker.bg3d", skeletonFile: "/PangeaRSEdit/games/billyfrontier/skeletons/Walker.skeleton.rsrc", category: "Characters" },
      // Level Models
      { name: "Town Level", bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/town.bg3d", category: "Levels" },
      { name: "Swamp Level", bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/swamp.bg3d", category: "Levels" },
      { name: "Target Practice", bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/targetpractice.bg3d", category: "Levels" },
      // Object Models
      { name: "Global Models", bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/global.bg3d", category: "Objects" },
      { name: "Buildings", bg3dFile: "/PangeaRSEdit/games/billyfrontier/models/buildings.bg3d", category: "Objects" }
    ]
  }
];

export function GameModelSelector({ onLoadModel, loading }: GameModelSelectorProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Characters");
  const [selectedModel, setSelectedModel] = useState<GameModel | null>(null);
  const [loadWithSkeleton, setLoadWithSkeleton] = useState<boolean>(true);

  const selectedGame = GAMES.find(game => game.id === selectedGameId);
  const availableModels = selectedGame?.models.filter(model => model.category === selectedCategory) || [];
  const availableCategories = selectedGame ? 
    [...new Set(selectedGame.models.map(model => model.category))] : [];

  useEffect(() => {
    // Reset model selection when game or category changes
    setSelectedModel(null);
  }, [selectedGameId, selectedCategory]);

  useEffect(() => {
    // Reset category when game changes
    if (selectedGame && availableCategories.length > 0) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [selectedGameId]);

  const handleLoadSelectedModel = async () => {
    if (!selectedModel) {
      toast.error("Please select a model to load");
      return;
    }

    try {
      // Fetch the BG3D file
      const bg3dResponse = await fetch(selectedModel.bg3dFile);
      if (!bg3dResponse.ok) {
        throw new Error(`Failed to fetch ${selectedModel.name}.bg3d: ${bg3dResponse.status}`);
      }

      const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
      const bg3dFile = new File([bg3dArrayBuffer], `${selectedModel.name}.bg3d`, {
        type: "application/octet-stream",
      });

      let skeletonFile: File | undefined;

      // If skeleton file exists and user wants to load it
      if (selectedModel.skeletonFile && loadWithSkeleton) {
        const skeletonResponse = await fetch(selectedModel.skeletonFile);
        if (skeletonResponse.ok) {
          const skeletonArrayBuffer = await skeletonResponse.arrayBuffer();
          skeletonFile = new File([skeletonArrayBuffer], `${selectedModel.name}.skeleton.rsrc`, {
            type: "application/octet-stream",
          });
          console.log(`Loaded ${selectedModel.name} skeleton file`);
        } else {
          console.warn(`${selectedModel.name} skeleton file not found, loading without animations`);
          toast.warning("Skeleton file not found, loading model without animations");
        }
      }

      await onLoadModel(bg3dFile, skeletonFile);
    } catch (error) {
      console.error("Error loading selected model:", error);
      toast.error(`Failed to load ${selectedModel.name}`);
    }
  };

  const hasSkeletonFile = selectedModel?.skeletonFile !== undefined;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Game Model Selector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Selection */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Game</label>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {GAMES.map((game) => (
                <SelectItem 
                  key={game.id} 
                  value={game.id}
                  className="text-white hover:bg-gray-600"
                >
                  {game.name} {game.models.length === 0 && "(No models available)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Category Selection */}
        {selectedGame && availableCategories.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {availableCategories.map((category) => (
                  <SelectItem 
                    key={category} 
                    value={category}
                    className="text-white hover:bg-gray-600"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Model Selection */}
        {selectedGame && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Model</label>
            {availableModels.length > 0 ? (
              <Select 
                value={selectedModel?.name || ""} 
                onValueChange={(modelName) => {
                  const model = availableModels.find(m => m.name === modelName);
                  setSelectedModel(model || null);
                }}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {availableModels.map((model) => (
                    <SelectItem 
                      key={model.name} 
                      value={model.name}
                      className="text-white hover:bg-gray-600"
                    >
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-400 p-3 bg-gray-700 rounded border border-gray-600">
                No models available for {selectedGame.name}. 
                Files need to be copied to the public folder.
              </div>
            )}
          </div>
        )}

        {/* Skeleton Loading Option */}
        {selectedModel && hasSkeletonFile && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Animation Data</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="skeletonOption"
                  checked={loadWithSkeleton}
                  onChange={() => setLoadWithSkeleton(true)}
                  className="text-blue-500"
                />
                <span className="text-sm text-white">
                  Load with skeleton data (includes animations)
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="skeletonOption"
                  checked={!loadWithSkeleton}
                  onChange={() => setLoadWithSkeleton(false)}
                  className="text-blue-500"
                />
                <span className="text-sm text-white">
                  Load model only (no animations)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Load Button */}
        <Button
          onClick={handleLoadSelectedModel}
          disabled={!selectedModel || loading}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          {loading ? "Loading..." : `Load ${selectedModel?.name || "Model"}`}
        </Button>

        {/* Model Info */}
        {selectedModel && (
          <div className="text-xs text-gray-400 space-y-1 p-3 bg-gray-700 rounded">
            <p><strong>Model:</strong> {selectedModel.name}</p>
            <p><strong>BG3D File:</strong> {selectedModel.bg3dFile.split('/').pop()}</p>
            {selectedModel.skeletonFile && (
              <p><strong>Skeleton File:</strong> {selectedModel.skeletonFile.split('/').pop()}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}