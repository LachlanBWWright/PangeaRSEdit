import { ItemType } from "@/data/items/bugdomItemType";
import type {
  ModelPartMapping,
  SemanticCitation,
  StaticAnalysisIssue,
  UniversalItemModelMapping,
} from "@/data/items/itemModelTypes";

interface BugdomMappingOptions {
  readonly levelNum?: number;
  readonly params?: { p0: number; p1: number; p2: number; p3: number };
  readonly flags?: number;
}

type BugdomLevelGroup = "lawn" | "forest" | "hive" | "night" | "anthill";

const ITEM_FLAGS_USER1 = 1;
const HONEYCOMB_PLATFORM_SCALE = 2;
const HONEYCOMB_PLATFORM_SCALE_SMALL = 1.3;
const DETONATOR_SCALE = 1.1;
const PLUNGER_DOWN_Y_OFFSET = 60 * DETONATOR_SCALE;
const BUGDOM_GRASS_SCALE = 0.15;
const BUGDOM_WEED_SCALE = 0.2;
const BUGDOM_FLOWER_SCALE = 0.4;
const BUGDOM_REED_SCALE = 0.4;
const BUGDOM_TREE_SCALE = 20;
const BUGDOM_CHECKPOINT_SCALE = 1.5;
const BUGDOM_BOULDER_SCALE = 3;

function cite(
  file: string,
  line: number,
  description: string,
  proves: SemanticCitation["proves"],
  endLine?: number,
): SemanticCitation {
  return { file, line, endLine, description, proves };
}

function getBugdomLevelGroup(levelNum: number | undefined): BugdomLevelGroup {
  if (levelNum === 3 || levelNum === 9) {
    return "forest";
  }
  if (levelNum === 4) {
    return "hive";
  }
  if (levelNum === 5) {
    return "night";
  }
  if (levelNum === 6 || levelNum === 7) {
    return "anthill";
  }
  return "lawn";
}

function getParams(options: BugdomMappingOptions): {
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
} {
  return options.params ?? { p0: 0, p1: 0, p2: 0, p3: 0 };
}

function getFlags(options: BugdomMappingOptions): number {
  return options.flags ?? 0;
}

function mergePrimaryPart(
  base: Omit<UniversalItemModelMapping, "modelFile" | "modelIndex" | "modelPath">,
  modelParts: readonly ModelPartMapping[],
): UniversalItemModelMapping {
  const primaryPart = modelParts[0];
  if (!primaryPart) {
    return {
      ...base,
      modelFile: "",
      modelPath: "models",
      modelIndex: 0,
      modelParts,
    };
  }

  return {
    ...base,
    modelFile: primaryPart.modelFile,
    modelPath: primaryPart.modelPath,
    modelIndex: primaryPart.modelIndex,
    groupSize: primaryPart.groupSize,
    scale: primaryPart.scale,
    scaleXZ: primaryPart.scaleXZ,
    scaleY: primaryPart.scaleY,
    rotationY: primaryPart.rotationY,
    positionOffset: primaryPart.positionOffset,
    modelParts,
  };
}

function buildRockMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const levelGroup = getBugdomLevelGroup(options.levelNum);

  const modelPart =
    levelGroup === "forest"
      ? {
          partId: "rock",
          modelFile: "Forest_Models.3dmf",
          modelPath: "models" as const,
          modelIndex: 10 + params.p0,
          scale: 0.9,
          citations: [
            cite("src/Items/Items2.c", 677, "AddRock add routine", "item-add-routine", 717),
            cite("src/Items/Items2.c", 701, "Forest rock index uses p0", "model-index", 704),
          ],
        }
      : levelGroup === "night"
        ? {
            partId: "rock",
            modelFile: "Night_Models.3dmf",
            modelPath: "models" as const,
            modelIndex: 2 + params.p0,
            scale: 0.6,
            citations: [
              cite("src/Items/Items2.c", 677, "AddRock add routine", "item-add-routine", 717),
              cite("src/Items/Items2.c", 689, "Night rock index uses p0", "model-index", 692),
            ],
          }
        : {
            partId: "rock",
            modelFile: "Lawn_Models2.3dmf",
            modelPath: "models" as const,
            modelIndex: 8 + params.p0,
            scale: 4,
            citations: [
              cite("src/Items/Items2.c", 677, "AddRock add routine", "item-add-routine", 717),
              cite("src/Items/Items2.c", 695, "Lawn rock index uses p0", "model-index", 698),
            ],
          };

  const staticAnalysisIssues: StaticAnalysisIssue[] =
    options.levelNum === undefined
      ? [{ severity: "warning", message: "Rock defaults to lawn assets without a level number." }]
      : [];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations: modelPart.citations,
      semanticCitations: modelPart.citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Selects the rock mesh within the active level group.",
          values: [
            { value: 0, label: "Primary rock" },
            { value: 1, label: "Secondary rock" },
          ],
        },
      },
      staticAnalysisIssues,
    },
    [modelPart],
  );
}

function buildLawnDoorMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const flags = getFlags(options);
  const levelGroup = getBugdomLevelGroup(options.levelNum);
  const isNight = levelGroup === "night";
  const isOpen = (flags & ITEM_FLAGS_USER1) !== 0;
  const aim = isOpen ? (params.p1 ^ 1) : params.p1;

  const citations = [
    cite("src/Items/Triggers.c", 754, "AddLawnDoor add routine", "item-add-routine", 795),
    cite("src/Items/Triggers.c", 763, "Door color and rotation come from params", "param-domain", 768),
    cite("src/Items/Triggers.c", 772, "Door file changes by level type", "level-condition", 775),
    cite("src/Items/Triggers.c", 783, "Door rotation uses aim * PI/2", "rotation", 784),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Key color / door variant.",
          values: [
            { value: 0, label: "Green" },
            { value: 1, label: "Teal" },
            { value: 2, label: "Red" },
            { value: 3, label: "Orange" },
            { value: 4, label: "Purple" },
          ],
        },
        p1: {
          kind: "rotation",
          summary: "Door orientation (0-3 quarter turns).",
          divisions: 4,
        },
        flags: {
          kind: "bitset",
          summary: "Door state flags.",
          bits: [{ index: 0, label: "Already open" }],
        },
      },
      staticAnalysisIssues:
        options.levelNum === undefined
          ? [{ severity: "warning", message: "LawnDoor defaults to the lawn model set without a level number." }]
          : [],
    },
    [
      {
        partId: "door",
        modelFile: isNight ? "Night_Models.3dmf" : "Lawn_Models1.3dmf",
        modelPath: "models",
        modelIndex: (isNight ? 13 : 1) + params.p0,
        scale: 0.6,
        rotationY: aim * (Math.PI / 2),
        citations,
      },
    ],
  );
}

function buildGrassMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const levelGroup = getBugdomLevelGroup(options.levelNum);

  const modelPart =
    levelGroup === "forest"
      ? {
          partId: "grass",
          modelFile: "Forest_Models.3dmf",
          modelPath: "models" as const,
          modelIndex: 2 + params.p0,
          scale: BUGDOM_GRASS_SCALE,
          citations: [
            cite("src/Items/Items.c", 198, "AddGrass add routine", "item-add-routine", 251),
            cite("src/Items/Items.c", 214, "Forest grass uses FOREST_MObjType_Grass + parm[0]", "model-index", 216),
            cite("src/Items/Items.c", 237, "Grass scale is GRASS_SCALE", "scale", 237),
          ],
        }
      : levelGroup === "night"
        ? {
            partId: "grass",
            modelFile: "Night_Models.3dmf",
            modelPath: "models" as const,
            modelIndex: 9 + params.p0,
            scale: BUGDOM_GRASS_SCALE,
            citations: [
              cite("src/Items/Items.c", 198, "AddGrass add routine", "item-add-routine", 251),
              cite("src/Items/Items.c", 219, "Night grass uses NIGHT_MObjType_Grass + parm[0]", "model-index", 221),
              cite("src/Items/Items.c", 237, "Grass scale is GRASS_SCALE", "scale", 237),
            ],
          }
        : {
            partId: "grass",
            modelFile: "Lawn_Models2.3dmf",
            modelPath: "models" as const,
            modelIndex: params.p0,
            scale: BUGDOM_GRASS_SCALE,
            citations: [
              cite("src/Items/Items.c", 198, "AddGrass add routine", "item-add-routine", 251),
              cite("src/Items/Items.c", 209, "Lawn grass uses LAWN2_MObjType_Grass + parm[0]", "model-index", 211),
              cite("src/Items/Items.c", 237, "Grass scale is GRASS_SCALE", "scale", 237),
            ],
          };

  const staticAnalysisIssues: StaticAnalysisIssue[] =
    options.levelNum === undefined
      ? [
          {
            severity: "warning",
            message: "Grass defaults to lawn assets without a level number.",
          },
        ]
      : [];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations: modelPart.citations,
      semanticCitations: modelPart.citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Selects the grass mesh variant within the active level group.",
          values: [
            { value: 0, label: "Primary grass" },
            { value: 1, label: "Secondary grass" },
          ],
        },
      },
      staticAnalysisIssues,
    },
    [modelPart],
  );
}

function buildCloverMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const citations = [
    cite("src/Items/Items.c", 152, "AddClover add routine", "item-add-routine", 189),
    cite("src/Items/Items.c", 166, "Clover uses LAWN2_MObjType_Clover + parm[0]", "model-index", 166),
    cite("src/Items/Items.c", 172, "Clover uses STATUS_BIT_NULLSHADER", "model-group", 172),
    cite("src/Items/Items.c", 176, "Clover scale is CLOVER_SCALE + RandomFloat()*.1f", "scale", 176),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Selects one of the two clover meshes.",
          values: [
            { value: 0, label: "Clover A" },
            { value: 1, label: "Clover B" },
          ],
        },
      },
    },
    [
      {
        partId: "clover",
        modelFile: "Lawn_Models2.3dmf",
        modelPath: "models",
        modelIndex: 6 + params.p0,
        scale: 0.2,
        citations,
      },
    ],
  );
}

function buildWeedMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const citations = [
    cite("src/Items/Items.c", 256, "AddWeed add routine", "item-add-routine", 285),
    cite("src/Items/Items.c", 262, "Weed uses LAWN2_MObjType_Weed + parm[0]", "model-index", 262),
    cite("src/Items/Items.c", 268, "Weed uses STATUS_BIT_NULLSHADER", "model-group", 268),
    cite("src/Items/Items.c", 272, "Weed scale is WEED_SCALE", "scale", 272),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "integer",
          summary: "Offsets the weed mesh index from LAWN2_MObjType_Weed.",
          min: 0,
        },
      },
    },
    [
      {
        partId: "weed",
        modelFile: "Lawn_Models2.3dmf",
        modelPath: "models",
        modelIndex: 2 + params.p0,
        scale: BUGDOM_WEED_SCALE,
        citations,
      },
    ],
  );
}

function buildSunflowerMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Items.c", 292, "AddSunFlower add routine", "item-add-routine", 317),
    cite("src/Items/Items.c", 298, "Sunflower uses LAWN2_MObjType_Sunflower", "model-index", 298),
    cite("src/Items/Items.c", 302, "Sunflower uses STATUS_BIT_NULLSHADER", "model-group", 302),
    cite("src/Items/Items.c", 306, "Sunflower scale is .15", "scale", 306),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations,
      semanticCitations: citations,
    },
    [
      {
        partId: "sunflower",
        modelFile: "Lawn_Models2.3dmf",
        modelPath: "models",
        modelIndex: 5,
        scale: 0.15,
        citations,
      },
    ],
  );
}

function buildCosmoMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Items.c", 325, "AddCosmo add routine", "item-add-routine", 352),
    cite("src/Items/Items.c", 331, "Cosmo uses LAWN2_MObjType_Cosmo", "model-index", 331),
    cite("src/Items/Items.c", 335, "Cosmo uses STATUS_BIT_NULLSHADER", "model-group", 335),
    cite("src/Items/Items.c", 339, "Cosmo scale is COSMO_SCALE + RandomFloat()*.05f", "scale", 339),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations,
      semanticCitations: citations,
    },
    [
      {
        partId: "cosmo",
        modelFile: "Lawn_Models2.3dmf",
        modelPath: "models",
        modelIndex: 3,
        scale: BUGDOM_FLOWER_SCALE,
        citations,
      },
    ],
  );
}

function buildPoppyMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Items.c", 358, "AddPoppy add routine", "item-add-routine", 383),
    cite("src/Items/Items.c", 363, "Poppy uses LAWN2_MObjType_Poppy", "model-index", 363),
    cite("src/Items/Items.c", 367, "Poppy uses STATUS_BIT_NULLSHADER", "model-group", 367),
    cite("src/Items/Items.c", 371, "Poppy scale is POPPY_SCALE + RandomFloat()*.05f", "scale", 371),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      lightingMode: "unlit",
      citations,
      semanticCitations: citations,
    },
    [
      {
        partId: "poppy",
        modelFile: "Lawn_Models2.3dmf",
        modelPath: "models",
        modelIndex: 4,
        scale: BUGDOM_FLOWER_SCALE,
        citations,
      },
    ],
  );
}

function buildPondGrassMapping(
  options: BugdomMappingOptions,
): UniversalItemModelMapping {
  const params = getParams(options);
  const citations = [
    cite("src/Items/Items.c", 949, "AddPondGrass add routine", "item-add-routine", 982),
    cite("src/Items/Items.c", 956, "Pond grass validates parm[0] range 0-2", "param-domain", 957),
    cite("src/Items/Items.c", 961, "Pond grass uses POND_MObjType_PondGrass + parm[0]", "model-index", 962),
    cite("src/Items/Items.c", 970, "Pond grass scale is randomized around 0.25", "scale", 970),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Selects the pond grass mesh variant.",
          values: [
            { value: 0, label: "Pond grass 1" },
            { value: 1, label: "Pond grass 2" },
            { value: 2, label: "Pond grass 3" },
          ],
        },
      },
    },
    [
      {
        partId: "pond-grass",
        modelFile: "Pond_Models.3dmf",
        modelPath: "models",
        modelIndex: 4 + params.p0,
        scale: 0.3,
        citations,
      },
    ],
  );
}

function buildReedMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const citations = [
    cite("src/Items/Items.c", 987, "AddReed add routine", "item-add-routine", 1022),
    cite("src/Items/Items.c", 994, "Reed validates parm[0] range 0-1", "param-domain", 995),
    cite("src/Items/Items.c", 998, "Reed uses POND_MObjType_Reed + parm[0]", "model-index", 999),
    cite("src/Items/Items.c", 1007, "Reed scale is 0.4", "scale", 1007),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Selects the reed mesh variant.",
          values: [
            { value: 0, label: "Short reed" },
            { value: 1, label: "Tall reed" },
          ],
        },
      },
    },
    [
      {
        partId: "reed",
        modelFile: "Pond_Models.3dmf",
        modelPath: "models",
        modelIndex: 7 + params.p0,
        scale: BUGDOM_REED_SCALE,
        citations,
      },
    ],
  );
}

function buildHoneycombPlatformMapping(
  options: BugdomMappingOptions,
): UniversalItemModelMapping {
  const params = getParams(options);
  const flags = getFlags(options);
  const isMetal = (params.p0 & 1) !== 0;
  const isSmall = (flags & (1 << 1)) !== 0;
  const citations = [
    cite("src/Items/Triggers.c", 440, "AddHoneycombPlatform add routine", "item-add-routine", 500),
    cite("src/Items/Triggers.c", 443, "Material and size derive from parm[0] and parm[3]", "param-domain", 444),
    cite("src/Items/Triggers.c", 451, "Platform elevation derives from parm[1]", "position", 454),
    cite("src/Items/Triggers.c", 458, "Platform model index toggles brick vs steel", "model-index", 474),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "bitset",
          summary: "Platform material bit.",
          bits: [{ index: 0, label: "Steel platform" }],
        },
        p1: {
          kind: "integer",
          summary: "Platform elevation; zero falls back to 11.",
          min: 0,
        },
        flags: {
          kind: "bitset",
          summary: "Platform behavior flags.",
          bits: [
            { index: 0, label: "Resurface after falling" },
            { index: 1, label: "Use small scale" },
          ],
        },
      },
    },
    [
      {
        partId: "platform",
        modelFile: "BeeHive_Models.3dmf",
        modelPath: "models",
        modelIndex: isMetal ? 1 : 0,
        scale: isSmall ? HONEYCOMB_PLATFORM_SCALE_SMALL : HONEYCOMB_PLATFORM_SCALE,
        positionOffset: [0, -(params.p1 === 0 ? 11 : params.p1) * 50, 0],
        citations,
      },
    ],
  );
}

function buildDetonatorMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const flags = getFlags(options);
  const isPlunged = (flags & ITEM_FLAGS_USER1) !== 0;
  const citations = [
    cite("src/Items/Triggers.c", 603, "AddDetonator add routine", "item-add-routine", 682),
    cite("src/Items/Triggers.c", 612, "Detonator plunger state uses ITEM_FLAGS_USER1", "param-domain", 612),
    cite("src/Items/Triggers.c", 625, "Detonator box color uses parm[1]", "model-index", 632),
    cite("src/Items/Triggers.c", 651, "Plunger child offset depends on plunge state", "child-object", 655),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "integer",
          summary: "Detonator ID for linked trigger logic.",
          min: 0,
        },
        p1: {
          kind: "enum",
          summary: "Detonator box color.",
          values: [
            { value: 0, label: "Green" },
            { value: 1, label: "Orange" },
            { value: 2, label: "Purple" },
            { value: 3, label: "Red" },
            { value: 4, label: "Teal" },
          ],
        },
        flags: {
          kind: "bitset",
          summary: "Detonator state flags.",
          bits: [{ index: 0, label: "Plunger already down" }],
        },
      },
    },
    [
      {
        partId: "box",
        modelFile: "BeeHive_Models.3dmf",
        modelPath: "models",
        modelIndex: 4 + params.p1,
        scale: DETONATOR_SCALE,
        citations,
      },
      {
        partId: "plunger",
        modelFile: "BeeHive_Models.3dmf",
        modelPath: "models",
        modelIndex: 9,
        scale: DETONATOR_SCALE,
        positionOffset: [0, isPlunged ? -PLUNGER_DOWN_Y_OFFSET : -10, 0],
        citations,
      },
    ],
  );
}

function buildHoneyTubeMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const params = getParams(options);
  const remappedType = params.p0 === 1 ? 2 : params.p0;
  const scale = 3 * (((params.p2 * 0.5) + 1));
  const citations = [
    cite("src/Items/Items2.c", 768, "AddHoneyTube add routine", "item-add-routine", 805),
    cite("src/Items/Items2.c", 774, "Honey tube remaps parm[0] value 1 to 2", "model-index", 776),
    cite("src/Items/Items2.c", 781, "Honey tube scale derives from parm[2]", "scale", 793),
    cite("src/Items/Items2.c", 792, "Honey tube rotation derives from parm[1]", "rotation", 793),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "enum",
          summary: "Tube shape selector; source remaps value 1 to 2.",
          values: [
            { value: 0, label: "Bent tube" },
            { value: 1, label: "Remapped to straight tube" },
            { value: 2, label: "Straight tube" },
            { value: 3, label: "Taper tube" },
          ],
        },
        p1: {
          kind: "rotation",
          summary: "Tube orientation (0-3 quarter turns).",
          divisions: 4,
        },
        p2: {
          kind: "scale",
          summary: "Tube size multiplier.",
          multiplier: 1.5,
          offset: 3,
        },
      },
    },
    [
      {
        partId: "tube",
        modelFile: "BeeHive_Models.3dmf",
        modelPath: "models",
        modelIndex: 20 + remappedType,
        scale,
        rotationY: params.p1 * (Math.PI / 2),
        citations,
      },
    ],
  );
}

function buildWaterValveMapping(options: BugdomMappingOptions): UniversalItemModelMapping {
  const flags = getFlags(options);
  const citations = [
    cite("src/Items/Triggers.c", 1321, "AddWaterValve add routine", "item-add-routine", 1390),
    cite("src/Items/Triggers.c", 1330, "Valve openness uses ITEM_FLAGS_USER1", "param-domain", 1330),
    cite("src/Items/Triggers.c", 1340, "Valve box model selection", "model-index", 1347),
    cite("src/Items/Triggers.c", 1377, "Valve handle is a chained child object", "child-object", 1385),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "integer",
          summary: "Valve ID for linked trigger logic.",
          min: 0,
        },
        flags: {
          kind: "bitset",
          summary: "Valve state flags.",
          bits: [{ index: 0, label: "Already open" }],
        },
      },
      staticAnalysisIssues:
        flags === 0
          ? []
          : [],
    },
    [
      {
        partId: "box",
        modelFile: "AntHill_Models.3dmf",
        modelPath: "models",
        modelIndex: 0,
        scale: 0.25,
        citations,
      },
      {
        partId: "handle",
        modelFile: "AntHill_Models.3dmf",
        modelPath: "models",
        modelIndex: 1,
        scale: 0.25,
        positionOffset: [0, 100, 0],
        citations,
      },
    ],
  );
}

function buildTreeMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Items.c", 432, "AddTree add routine", "item-add-routine", 538),
    cite("src/Items/Items.c", 445, "Tree uses the forest tree model", "model-file", 446),
    cite("src/Headers/mobjtypes.h", 115, "Forest tree enum offset", "model-index", 117),
    cite("src/Items/Items.c", 454, "Tree scale is TREE_SCALE", "scale"),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      staticAnalysisIssues: [
        {
          severity: "warning",
          message: "Bugdom 1 terrain trees are forest-only; rendering them outside the forest level is source-inaccurate.",
        },
      ],
    },
    [
      {
        partId: "tree",
        modelFile: "Forest_Models.3dmf",
        modelPath: "models",
        modelIndex: 1,
        scale: BUGDOM_TREE_SCALE,
        citations,
      },
    ],
  );
}

function buildCheckpointMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Triggers2.c", 60, "AddCheckpoint add routine", "item-add-routine", 139),
    cite("src/Items/Triggers2.c", 77, "Checkpoint uses the global straw model", "model-file", 84),
    cite("src/Headers/mobjtypes.h", 259, "Global straw enum offset", "model-index", 261),
    cite("src/Items/Triggers2.c", 84, "Checkpoint scale is CHECKPOINT_SCALE", "scale"),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
      paramDomains: {
        p0: {
          kind: "integer",
          summary: "Checkpoint number.",
          min: 0,
        },
        p1: {
          kind: "rotation",
          summary: "Respawn facing (0-3 quarter turns).",
          divisions: 4,
        },
      },
      staticAnalysisIssues: [
        {
          severity: "warning",
          message: "The droplet child only appears for unfinished checkpoints; the editor preview renders the always-present straw base.",
        },
      ],
    },
    [
      {
        partId: "straw",
        modelFile: "Global_Models1.3dmf",
        modelPath: "models",
        modelIndex: 7,
        scale: BUGDOM_CHECKPOINT_SCALE,
        citations,
      },
    ],
  );
}

function buildRollingBoulderMapping(): UniversalItemModelMapping {
  const citations = [
    cite("src/Items/Traps.c", 965, "AddRollingBoulder add routine", "item-add-routine", 996),
    cite("src/Items/Traps.c", 968, "Rolling boulder uses the global throw-rock mesh", "model-file", 972),
    cite("src/Headers/mobjtypes.h", 259, "Throw-rock enum offset", "model-index"),
    cite("src/Items/Traps.c", 971, "Rolling boulder scale is BOULDER_SCALE", "scale"),
  ];

  return mergePrimaryPart(
    {
      verificationStatus: "verified",
      citations,
      semanticCitations: citations,
    },
    [
      {
        partId: "boulder",
        modelFile: "Global_Models1.3dmf",
        modelPath: "models",
        modelIndex: 6,
        scale: BUGDOM_BOULDER_SCALE,
        citations,
      },
    ],
  );
}

export function getBugdomSourceDerivedMapping(
  itemType: number,
  options: BugdomMappingOptions,
): UniversalItemModelMapping | undefined {
  switch (itemType) {
    case ItemType.Rock:
      return buildRockMapping(options);
    case ItemType.Clover:
      return buildCloverMapping(options);
    case ItemType.Weed:
      return buildWeedMapping(options);
    case ItemType.SunFlower:
      return buildSunflowerMapping();
    case ItemType.Cosmo:
      return buildCosmoMapping();
    case ItemType.Poppy:
      return buildPoppyMapping();
    case ItemType.Tree:
      return buildTreeMapping();
    case ItemType.Checkpoint:
      return buildCheckpointMapping();
    case ItemType.LawnDoor:
      return buildLawnDoorMapping(options);
    case ItemType.Grass:
      return buildGrassMapping(options);
    case ItemType.RollingBoulder:
      return buildRollingBoulderMapping();
    case ItemType.HoneycombPlatform:
      return buildHoneycombPlatformMapping(options);
    case ItemType.Detonator:
      return buildDetonatorMapping(options);
    case ItemType.HoneyTube:
      return buildHoneyTubeMapping(options);
    case ItemType.PondGrass:
      return buildPondGrassMapping(options);
    case ItemType.Reed:
      return buildReedMapping(options);
    case ItemType.WaterValve:
      return buildWaterValveMapping(options);
    default:
      return undefined;
  }
}
