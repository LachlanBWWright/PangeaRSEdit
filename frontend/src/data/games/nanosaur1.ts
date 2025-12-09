import type { GameInfo } from "@/components/GameModelSelector";

export const nanosaur1: GameInfo = {
  id: "nanosaur1",
  name: "Nanosaur 1",
  models: [
    // Skeleton models (characters with animations)
    {
      name: "Deinon",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Deinon.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Deinon.skeleton.rsrc",
      description: "Deinonychus - main playable character",
      category: "Characters",
    },
    {
      name: "Diloph",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Diloph.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Diloph.skeleton.rsrc",
      description: "Dilophosaurus enemy",
      category: "Characters",
    },
    {
      name: "Ptera",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Ptera.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Ptera.skeleton.rsrc",
      description: "Pteranodon flying enemy",
      category: "Characters",
    },
    {
      name: "Rex",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Rex.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Rex.skeleton.rsrc",
      description: "Tyrannosaurus Rex enemy",
      category: "Characters",
    },
    {
      name: "Stego",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Stego.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Stego.skeleton.rsrc",
      description: "Stegosaurus enemy",
      category: "Characters",
    },
    {
      name: "Tricer",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Tricer.3dmf",
      skeletonFile: "/PangeaRSEdit/games/nanosaur1/skeletons/Tricer.skeleton.rsrc",
      description: "Triceratops enemy",
      category: "Characters",
    },
    {
      name: "DeinonTeethFix",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/skeletons/DeinonTeethFix.3dmf",
      description: "Deinonychus teeth fix model",
      category: "Characters",
    },

    // Level models
    {
      name: "Level 1 Models",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/Level1_Models.3dmf",
      description: "Level 1 environment models",
      category: "Levels",
    },

    // Interface and object models
    {
      name: "Global Models",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/Global_Models.3dmf",
      description: "Shared game objects",
      category: "Objects",
    },
    {
      name: "Menu Interface",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/MenuInterface.3dmf",
      description: "Menu interface models",
      category: "Objects",
    },
    {
      name: "Title",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/Title.3dmf",
      description: "Title screen models",
      category: "Objects",
    },
    {
      name: "High Scores",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/HighScores.3dmf",
      description: "High scores screen models",
      category: "Objects",
    },
    {
      name: "Infobar Models",
      bg3dFile: "/PangeaRSEdit/games/nanosaur1/models/Infobar_Models.3dmf",
      description: "HUD and infobar models",
      category: "Objects",
    },
  ],
};
