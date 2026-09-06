import { Game } from "@/data/globals/globals";

export interface MetadataRule {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly value: string;
  readonly defaultValue?: string;
  readonly source: string;
  readonly citations: readonly MetadataCitation[];
  readonly status: "resolved" | "derived" | "migration-needed";
  readonly editable: boolean;
  readonly control: MetadataControl;
  readonly group?: MetadataRuleGroup;
  readonly groupRole?: MetadataRuleGroupRole;
}

export type MetadataRuleGroupRole = "preset" | "determined";

export interface MetadataRuleGroup {
  readonly id: string;
  readonly label: string;
  readonly presetKey: string;
  readonly determinedValues: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface MetadataCitation {
  readonly file: string;
  readonly line: number;
  readonly endLine?: number;
}

export interface MetadataSliderValue {
  readonly value: number;
  readonly label: string;
}

export type MetadataControl =
  | { readonly kind: "text" }
  | { readonly kind: "checkbox" }
  | {
      readonly kind: "slider";
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly gameValues?: readonly MetadataSliderValue[];
    }
  | {
      readonly kind: "select";
      readonly options: readonly string[];
      readonly optionLabels?: Readonly<Record<string, string>>;
      readonly optionDescriptions?: Readonly<Record<string, string>>;
    };

const metadataValueLabels: Readonly<Record<string, string>> = {
  "source-default": "Use the game’s original value",
  "level-specific": "Use the level-specific value",
  "target-practice": "Target practice",
  "rocket-and-robot": "Rocket and robot",
  "terrain-or-water": "Terrain or water surface",
  "no-fuel-required": "No fuel required",
  "boss-defeated": "Boss defeated",
  "always-open": "Always open",
  "tractor-beam-active": "While the tractor beam is active",
  "player-landed": "After the player has landed",
  "fire-ice": "Fire Ice",
  "fog-only": "Fog only",
  "blob-boss": "Blob Boss",
  "jungle-boss": "Jungle Boss",
  "brain-boss": "Brain Boss",
  adventure: "Adventure",
  "level1": "Level 1",
  "level2": "Level 2",
  "level3": "Level 3",
  "race1": "Race 1",
  "race2": "Race 2",
  "battle1": "Battle 1",
  "battle2": "Battle 2",
  "flag1": "Capture the Flag 1",
  "flag2": "Capture the Flag 2",
  adventure1: "Adventure 1 movement",
  race: "Race",
  battle: "Battle",
  car: "Car",
  submarine: "Submarine",
  "scroll-both": "Scroll horizontally and vertically",
  "scroll-v": "Scroll vertically",
  snow: "Snow particles",
  underwater: "Underwater tint",
  water: "Water",
  tar: "Tar",
  ice: "Ice",
  standard: "Standard",
  custom: "Custom values",
  scandinavia: "Scandinavia",
  aztec: "Aztec",
  coliseum: "Coliseum",
};

const mightyMikeSceneOptionLabels: Readonly<Record<string, string>> = {
  "source-default": "Use original game behavior",
  jurassic: "Jurassic — Prehistoric Plaza",
  candy: "Candy — Candy Cane Lane",
  fairy: "Fairy — Fairy Tale Trail",
  clown: "Clown — Magic Funhouse",
  bargain: "Bargain — Bargain Bin",
};

function getMightyMikeOptionDescriptions(
  key: string,
): Readonly<Record<string, string>> {
  const sceneDescriptions: Readonly<Record<string, string>> = {
    "source-default": "Keep the original behavior selected from this map's scene number.",
    jurassic: "Use the Prehistoric Plaza scene profile for this setting.",
    candy: "Use the Candy Cane Lane scene profile for this setting.",
    fairy: "Use the Fairy Tale Trail scene profile for this setting.",
    clown: "Use the Magic Funhouse scene profile for this setting.",
    bargain: "Use the Bargain Bin scene profile for this setting.",
  };
  const settingDescriptions: Readonly<Record<string, string>> = {
    "scene.sound": "Selects the music and sound-effect tables used during play.",
    "scene.cinema": "Selects the overhead-map intro music, destination coordinates, and scene transition presentation.",
    "scene.infobar": "Selects the scene-specific HUD artwork and key/status display treatment.",
    "scene.bonus": "Selects the scene-specific bonus-round rules and bonus presentation after an area is completed.",
    "scene.progression": "Selects the scene profile used by scene-specific terminal and completion checks; it does not advance areas by itself.",
    "scene.bunnyCounts": "Selects which scene's bunny-count table is read and written for the current area.",
    "scene.weaponUnlocks": "Selects the scene threshold used when deciding which bonus weapons may appear.",
    "area.traps": "Selects which scene-specific enemy is spawned by an appear-zone trap.",
    "area.doors": "Selects whether opening a keyed door uses the Jurassic/Clown door sound treatment.",
    "area.character": "Selects the scene-specific player transformations, including the fairy witch and bargain spaceship cases.",
    "area.projectiles": "Selects how enemy bullets behave when they hit the player, including Clown pass-through and Fairy poison-apple handling.",
  };
  const settingDescription = settingDescriptions[key] ?? "Selects the behavior profile used by this setting.";
  return Object.fromEntries(
    Object.entries(sceneDescriptions).map(([value, profileDescription]) => [
      value,
      `${settingDescription} ${profileDescription}`,
    ]),
  );
}

export function getMetadataValueLabel(value: string, key?: string): string {
  if (key === "level.mode") {
    const nanosaurModeLabels: Readonly<Record<string, string>> = {
      adventure: "Adventure — exploration",
      race: "Race — checkpoints and finishing order",
      battle: "Battle — player-versus-player combat",
      "capture-the-flag": "Capture the Flag — team flag play",
    };
    const nanosaurModeLabel = nanosaurModeLabels[value];
    if (nanosaurModeLabel) return nanosaurModeLabel;
  }
  if (key === "level.mapView") {
    const nanosaurMapLabels: Readonly<Record<string, string>> = {
      level1: "Adventure 1 map view",
      level2: "Adventure 2 map view",
      level3: "Adventure 3 map view",
      race1: "Race 1 map view",
      race2: "Race 2 map view",
      flag1: "Capture the Flag 1 map view",
      flag2: "Capture the Flag 2 map view",
      battle1: "Battle 1 map view",
      battle2: "Battle 2 map view",
    };
    const nanosaurMapLabel = nanosaurMapLabels[value];
    if (nanosaurMapLabel) return nanosaurMapLabel;
  }
  if (key === "level.items") {
    const nanosaurItemLabels: Readonly<Record<string, string>> = {
      forest: "Forest scenery and items",
      desert: "Desert scenery and items",
      swamp: "Swamp scenery and items",
    };
    const nanosaurItemLabel = nanosaurItemLabels[value];
    if (nanosaurItemLabel) return nanosaurItemLabel;
  }
  const nanosaurItemBehaviorLabels: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    "level.minePlacement": { standard: "Level-default mine placement", forest: "Forest mine placement" },
    "level.doorMotion": { limited: "Stop at the open position", continuous: "Keep spinning after opening" },
    "level.turretRange": { standard: "Normal firing range", adventure1: "Shorter firing range" },
    "level.flightHeight": { standard: "Normal maximum altitude", adventure1: "Adventure 1 altitude cap" },
    "level.raceMarkers": { standard: "Ordinary line markers", race: "Race checkpoints" },
  };
  const nanosaurItemBehaviorLabel = nanosaurItemBehaviorLabels[key ?? ""]?.[value];
  if (nanosaurItemBehaviorLabel) return nanosaurItemBehaviorLabel;
  if (key === "level.intro") {
    const nanosaurIntroLabels: Readonly<Record<string, string>> = {
      none: "Hide both continuation options",
      level1: "Show “Entering Level 2”",
      level2: "Show “Entering Level 3”",
    };
    const nanosaurIntroLabel = nanosaurIntroLabels[value];
    if (nanosaurIntroLabel) return nanosaurIntroLabel;
  }
  if (key === "level.biome" || key === "level.rendering") {
    const nanosaurEnvironmentLabels: Readonly<Record<string, string>> = {
      forest: key === "level.rendering" ? "Forest sky and lighting" : "Forest environment",
      desert: key === "level.rendering" ? "Desert sky and lighting" : "Desert environment",
      swamp: key === "level.rendering" ? "Swamp sky and lighting" : "Swamp environment",
    };
    const nanosaurEnvironmentLabel = nanosaurEnvironmentLabels[value];
    if (nanosaurEnvironmentLabel) return nanosaurEnvironmentLabel;
  }
  if (key === "area.mode") {
    const billyModeLabels: Readonly<Record<string, string>> = {
      "source-default": "Use this area's default",
      duel: "Duel",
      shootout: "Shootout",
      stampede: "Stampede",
      "target-practice": "Target practice",
    };
    const billyModeLabel = billyModeLabels[value];
    if (billyModeLabel) return billyModeLabel;
  }
  if (key?.startsWith("scene.") || key?.startsWith("area.")) {
    const mightyMikeLabel = mightyMikeSceneOptionLabels[value];
    if (mightyMikeLabel) return mightyMikeLabel;
  }
  const knownLabel = metadataValueLabels[value];
  if (knownLabel) return knownLabel;
  return value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function getMetadataRuleValueLabel(rule: MetadataRule, value: string): string {
  if (rule.key === "level.id" && value === "0") return "Level 1 (slot 0)";
  if (rule.control.kind === "select") return rule.control.optionLabels?.[value] ?? getMetadataValueLabel(value, rule.key);
  return getMetadataValueLabel(value);
}

const nanosaur2OptionDescriptions: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "level.mode": {
    adventure: "Run the exploration rules used by Adventure levels.",
    race: "Run checkpoint timing and finishing-order rules for a race.",
    battle: "Run player-versus-player combat rules for a battle.",
    "capture-the-flag": "Run team flag objectives and flag-capture rules.",
  },
  "level.biome": {
    forest: "Use the Forest environment family for shared environmental assets.",
    desert: "Use the Desert environment family for shared environmental assets.",
    swamp: "Use the Swamp environment family for shared environmental assets.",
  },
  "level.mapView": {
    level1: "Use the Adventure 1 overhead-map frame and zoom in the Infobar.",
    level2: "Use the Adventure 2 overhead-map frame and zoom in the Infobar.",
    level3: "Use the Adventure 3 overhead-map frame and zoom in the Infobar.",
    race1: "Use the Race 1 overhead-map frame and zoom in the Infobar.",
    race2: "Use the Race 2 overhead-map frame and zoom in the Infobar.",
    flag1: "Use the Capture the Flag 1 overhead-map frame and zoom in the Infobar.",
    flag2: "Use the Capture the Flag 2 overhead-map frame and zoom in the Infobar.",
    battle1: "Use the Battle 1 overhead-map frame and zoom in the Infobar.",
    battle2: "Use the Battle 2 overhead-map frame and zoom in the Infobar.",
  },
  "level.items": {
    forest: "Create Forest grass, rocks, mines, turrets, and doors.",
    desert: "Create the Desert versions of scenery and interactive items.",
    swamp: "Create the Swamp versions of scenery and interactive items.",
  },
  "level.minePlacement": {
    standard: "Use the normal mine-chain offsets for Desert and Swamp mine geometry.",
    forest: "Use the shorter Forest mine-chain offsets and Forest light position.",
  },
  "level.doorMotion": {
    limited: "Stop Forest Doors when they reach their fully open position.",
    continuous: "Allow Forest Doors to keep spinning after they open, as in Adventure 3.",
  },
  "level.turretRange": {
    standard: "Use the normal distance at which turrets begin firing.",
    adventure1: "Reduce the turret firing distance to two-thirds of normal.",
  },
  "level.flightHeight": {
    standard: "Allow the normal maximum player flight altitude.",
    adventure1: "Cap flight at terrain height plus the Adventure 1 altitude allowance.",
  },
  "level.raceMarkers": {
    standard: "Handle crossed line markers with ordinary item behavior.",
    race: "Treat crossed line markers as race checkpoints and update race progress.",
  },
  "level.intro": {
    none: "Hide both level-transition choices in the post-save continuation menu.",
    level1: "Show the “Entering Level 2” continuation choice after saving.",
    level2: "Show the “Entering Level 3” continuation choice after saving.",
  },
  "level.rendering": {
    forest: "Use Forest sky, fog, and lighting values.",
    desert: "Use Desert sky, fog, and lighting values.",
    swamp: "Use Swamp sky, fog, and lighting values.",
  },
};

function getNanosaur2Control(key: string, options: readonly string[]): MetadataControl {
  return {
    kind: "select",
    options,
    optionDescriptions: nanosaur2OptionDescriptions[key],
  };
}

function getNanosaur2PresetControl(key: string, options: readonly string[]): MetadataControl {
  const control = getNanosaur2Control(key, options);
  if (control.kind !== "select") return control;
  return {
    ...control,
    options: [...control.options, "custom"],
    optionLabels: {
      ...control.optionLabels,
      custom: "Custom rendering values",
    },
    optionDescriptions: {
      ...control.optionDescriptions,
      custom: "Use the original environment as a starting point, then edit the individual rendering values below.",
    },
  };
}

export function getMetadataCitations(source: string): readonly MetadataCitation[] {
  return source.split(";").flatMap((part) => {
    const trimmedPart = part.trim();
    const separatorIndex = trimmedPart.lastIndexOf(":");
    if (separatorIndex <= 0) return [];
    const file = trimmedPart.slice(0, separatorIndex).trim();
    if (!file) return [];
    return trimmedPart.slice(separatorIndex + 1).split(",").flatMap((range) => {
      const match = range.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!match) return [];
      const line = Number.parseInt(match[1] ?? "", 10);
      const endLineText = match[2];
      const endLine = endLineText ? Number.parseInt(endLineText, 10) : undefined;
      if (!Number.isInteger(line)) return [];
      return [{ file, line, ...(endLine ? { endLine } : {}) }];
    });
  });
}

function getMetadataControl(key: string): MetadataControl {
  switch (key) {
    case "level.gravity":
      return { kind: "slider", min: 0, max: 8000, step: 100 };
    case "level.tileSlipperiness":
      return { kind: "slider", min: 0, max: 1, step: 0.01 };
    case "level.terrainFamily":
      return {
        kind: "select",
        options: ["lawn", "pond", "forest", "hive", "night", "anthill"],
        optionLabels: {
          lawn: "Lawn — garden ground and lawn items",
          pond: "Pond — water and mosquito rules",
          forest: "Forest — beach/flight forest rules",
          hive: "Hive — bee and honey-comb rules",
          night: "Night — firefly and night lighting rules",
          anthill: "Anthill — ant, liquid, and anthill rules",
        },
        optionDescriptions: {
          lawn: "Use garden ground, lawn item, and lawn rendering rules.",
          pond: "Use pond water, mosquito, and water-bug rules.",
          forest: "Use forest traps, dragonfly, and forest camera rules.",
          hive: "Use bee, hive item, and honey-comb rules.",
          night: "Use firefly, night item, and night lighting rules.",
          anthill: "Use ant, roach, anthill liquid, and anthill trigger rules.",
        },
      };
    case "level.area":
      return {
        kind: "select",
        options: ["training", "lawn-area", "beach", "flight", "hive-area", "queen-bee", "ant-hill", "ant-king"],
        optionLabels: {
          training: "Training — Lawn family, area 0",
          "lawn-area": "Lawn — Lawn family, area 1",
          beach: "Beach — Forest family, area 0",
          flight: "Flight — Forest family, area 1",
          "hive-area": "Bee Hive — Hive family, area 0",
          "queen-bee": "Queen Bee — Hive family, area 1",
          "ant-hill": "Ant Hill — Anthill family, area 0",
          "ant-king": "Ant King — Anthill family, area 1",
        },
        optionDescriptions: {
          training: "Use the first Lawn-area variant, including training setup.",
          "lawn-area": "Use the second Lawn-area variant.",
          beach: "Use the first Forest-area variant for the beach ride.",
          flight: "Use the second Forest-area variant for the flight attack.",
          "hive-area": "Use the first Hive-area variant for the Bee Hive.",
          "queen-bee": "Use the second Hive-area variant for the Queen Bee.",
          "ant-hill": "Use the first Anthill-area variant.",
          "ant-king": "Use the second Anthill-area variant for the Ant King.",
        },
      };
    case "level.flyingBeeSetup":
      return { kind: "select", options: ["source-default", "hive"], optionLabels: { "source-default": "Original flying-bee setup", hive: "Hive flying bees — keyed activation, limits, and lower spawn height" }, optionDescriptions: { "source-default": "Keep flying-bee setup selected by the original level number.", hive: "Use keyed activation, Hive bee limits, and the lower flying-bee spawn height." } };
    case "level.workerBeeSetup":
      return { kind: "select", options: ["source-default", "hive"], optionLabels: { "source-default": "Original worker-bee setup", hive: "Hive worker bees — keyed activation" }, optionDescriptions: { "source-default": "Keep worker-bee setup selected by the original level number.", hive: "Use the Hive keyed worker-bee activation rules." } };
    case "level.beeFlightRegeneration":
      return { kind: "select", options: ["source-default", "flight"], optionLabels: { "source-default": "Original defeated-bee behavior", flight: "Flight attack — defeated flying bees can return" }, optionDescriptions: { "source-default": "Keep the original level-number decision about whether the bee returns.", flight: "Keep the flying bee linked to its terrain item so it can regenerate after defeat." } };
    case "level.queenBeeRegeneration":
      return { kind: "select", options: ["source-default", "queen-bee"], optionLabels: { "source-default": "Original defeated-bee behavior", "queen-bee": "Queen Bee — defeated worker bees can return" }, optionDescriptions: { "source-default": "Keep the original level-number decision about whether the worker bee returns.", "queen-bee": "Keep the worker bee linked to its terrain item so it can return after defeat." } };
    case "level.antKing":
      return { kind: "select", options: ["source-default", "ant-king"], optionLabels: { "source-default": "Original Ant King check", "ant-king": "Ant King — load the king and enable Ant King interactions" }, optionDescriptions: { "source-default": "Keep Ant King loading and interactions tied to the original level number.", "ant-king": "Load the Ant King skeleton and enable Ant King item and player interactions." } };
    case "level.beachNutRegeneration":
      return { kind: "select", options: ["source-default", "beach"], optionLabels: { "source-default": "Original nut regeneration", beach: "Beach — nuts do not regenerate" }, optionDescriptions: { "source-default": "Keep the original level-number decision for nut regeneration.", beach: "Prevent nuts created during the Beach ride from regenerating." } };
    case "level.dragonflyRide":
      return { kind: "select", options: ["source-default", "beach", "flight"], optionLabels: { "source-default": "Original Dragonfly ride rules", beach: "Beach — low-height bat attack", flight: "Flight — high-altitude bat attack" }, optionDescriptions: { "source-default": "Keep the original level-number decision for Dragonfly ride attacks.", beach: "Spawn bats when the Dragonfly reaches the Beach height threshold.", flight: "Spawn bats when the Dragonfly reaches the higher Flight height threshold." } };
    case "level.splineItems":
      return { kind: "select", options: ["source-default", "hive"], optionLabels: { "source-default": "Original spline-surface check", hive: "Hive — place liquid-overlapping spline items on the flat surface" }, optionDescriptions: { "source-default": "Keep the original level-number decision for spline item height.", hive: "Place spline items over liquid at the detected flat liquid surface instead of normal terrain height." } };
    case "presentation.levelIntro":
      return { kind: "select", options: ["source-default", "flight"], optionLabels: { "source-default": "Original level introduction", flight: "Flight — use the Flight introduction" }, optionDescriptions: { "source-default": "Keep the original level-number decision for the level introduction.", flight: "Use the Flight-specific introduction and its Dragonfly presentation." } };
    case "presentation.infobar":
      return { kind: "select", options: ["source-default", "flight", "queen-bee", "ant-king"], optionLabels: { "source-default": "Original Infobar display", flight: "Flight — show Flight status", "queen-bee": "Queen Bee — show Queen Bee health", "ant-king": "Ant King — show Ant King health" }, optionDescriptions: { "source-default": "Keep the original level-number decision for Infobar and health display.", flight: "Show the Flight-specific health and status display.", "queen-bee": "Show the Queen Bee health display.", "ant-king": "Show the Ant King health display." } };
    case "level.bugdom2Area":
      return { kind: "select", options: ["gnome-garden", "sidewalk", "fido", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park"] };
    case "level.saucers":
      return { kind: "checkbox" };
    case "area.mode":
      return { kind: "select", options: ["duel", "shootout", "stampede", "target-practice"] };
    case "level.mode":
      return { kind: "select", options: ["adventure", "race", "battle", "capture-the-flag"] };
    case "scene.sound":
    case "scene.cinema":
    case "scene.infobar":
    case "scene.bonus":
    case "scene.progression":
    case "scene.bunnyCounts":
    case "scene.weaponUnlocks":
    case "area.traps":
    case "area.doors":
    case "area.character":
    case "area.projectiles":
      return {
        kind: "select",
        options: ["source-default", "jurassic", "candy", "fairy", "clown", "bargain"],
        optionLabels: mightyMikeSceneOptionLabels,
        optionDescriptions: getMightyMikeOptionDescriptions(key),
      };
    default:
      return { kind: "text" };
  }
}

function getBugdomTerrainFamily(levelIndex: number): string {
  switch (levelIndex) {
    case 2: return "pond";
    case 3:
    case 4: return "forest";
    case 5:
    case 6: return "hive";
    case 7: return "night";
    case 8:
    case 9: return "anthill";
    default: return "lawn";
  }
}

function getBugdomArea(levelIndex: number): string {
  switch (levelIndex) {
    case 1: return "lawn-area";
    case 3: return "beach";
    case 4: return "flight";
    case 6: return "queen-bee";
    case 8: return "ant-hill";
    case 9: return "ant-king";
    default: return levelIndex === 5 ? "hive-area" : "training";
  }
}

function getCroMagMusic(levelIndex: number): string {
  switch (levelIndex) {
    case 1: return "jungle";
    case 2:
    case 16: return "ice";
    case 3:
    case 11:
    case 13: return "crete";
    case 4:
    case 15: return "china";
    case 5: return "egypt";
    case 6:
    case 9: return "europe";
    case 7: return "viking";
    case 8:
    case 14: return "atlantis";
    default: return "desert";
  }
}

function getCroMagSky(levelIndex: number): string {
  switch (levelIndex) {
    case 1:
    case 10: return "jungle";
    case 2:
    case 16: return "ice";
    case 3:
    case 13:
    case 12:
    case 15: return "crete";
    case 4: return "china";
    case 5:
    case 14: return "egypt";
    case 6: return "europe";
    case 7:
    case 9: return "scandinavia";
    case 8: return "atlantis";
    case 11: return "coliseum";
    default: return "desert";
  }
}

const croMagOptionDescriptions: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "track.mode": {
    "source-default": "Keep the race or battle mode selected by the original game mode.",
    race: "Use race scoring, lap timing, and race-record rules.",
    battle: "Use battle scoring instead of race scoring and lap timing.",
  },
  "track.waterAnimation": {
    none: "Keep water textures still during play.",
    "scroll-both": "Animate water by scrolling its texture horizontally and vertically.",
    "scroll-v": "Animate water by scrolling its texture vertically only.",
  },
  "track.surfaceEffects": {
    none: "Do not emit the snow particles updated each frame.",
    snow: "Emit snow particles during play.",
  },
  "track.vehicle": {
    car: "Initialize the player with the normal car setup and car movement.",
    submarine: "Initialize the player with the submarine setup and submarine movement.",
  },
  "track.music": {
    desert: "Play the Desert soundtrack when the track starts.",
    jungle: "Play the Jungle soundtrack when the track starts.",
    atlantis: "Play the Atlantis soundtrack when the track starts.",
    china: "Play the China soundtrack when the track starts.",
    egypt: "Play the Egypt soundtrack when the track starts.",
    crete: "Play the Crete soundtrack when the track starts.",
    ice: "Play the Ice soundtrack when the track starts.",
    europe: "Play the Europe soundtrack when the track starts.",
    viking: "Play the Viking soundtrack when the track starts.",
  },
  "track.lighting": {
    standard: "Use the ordinary track lighting setup.",
    ice: "Use the Ice lighting preset, including its light direction and ambient color.",
    atlantis: "Use the Atlantis lighting preset for the underwater track.",
  },
  "track.sky": {
    desert: "Use the Desert clear-sky color behind the sky dome.",
    jungle: "Use the Jungle clear-sky color behind the sky dome.",
    ice: "Use the Ice clear-sky color behind the sky dome.",
    crete: "Use the Crete clear-sky color behind the sky dome.",
    china: "Use the China clear-sky color behind the sky dome.",
    egypt: "Use the Egypt clear-sky color behind the sky dome.",
    europe: "Use the Europe clear-sky color behind the sky dome.",
    scandinavia: "Use the Scandinavia clear-sky color behind the sky dome.",
    atlantis: "Use the Atlantis clear-sky color behind the sky dome.",
    aztec: "Use the Aztec clear-sky color behind the sky dome.",
    coliseum: "Use the Coliseum clear-sky color behind the sky dome.",
  },
  "track.liquidMaterial": {
    water: "Create normal water spray when vehicle wheels disturb liquid.",
    tar: "Suppress normal water spray and use the Tar Pits liquid behavior.",
  },
  "track.campfire": {
    ice: "Create the Ice campfire model for campfire terrain items.",
    scandinavia: "Create the Scandinavia campfire model for campfire terrain items.",
  },
  "track.startLineCollision": {
    standard: "Use the ordinary bridge-support collision boxes.",
    crete: "Use rotated collision boxes for the Crete starting-line objects.",
    jungle: "Use Jungle starting-line collision and obstacle-avoidance behavior.",
    none: "Create the starting-line object without collision boxes, as on Atlantis.",
  },
  "track.startLineMovement": {
    standard: "Keep the starting line stationary.",
    atlantis: "Move the starting line using the Atlantis start-line movement behavior.",
  },
  "track.objectTint": {
    standard: "Keep boat objects at their normal color.",
    underwater: "Apply the blue underwater color filter to Atlantis boat objects.",
  },
};

function getOptionDescriptionsForKey(
  key: string,
): Readonly<Record<string, string>> | undefined {
  return croMagOptionDescriptions[key] ?? ottoOptionDescriptions[key];
}

function getMetadataLabel(key: string): string {
  const name = key.split(".").at(-1) ?? key;
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const metadataAuditLabels: Readonly<Record<string, string>> = {
  "level.realId": "Level identity",
  "level.id": "Level identity",
  "level.mainDispatch": "Level dispatch and transitions",
  "level.tunnelStart": "Tunnel entry point",
  "level.sentinel": "Level-table safety check",
  "level.fileBounds": "Level-file safety check",
  "track.id": "Track identity",
  "track.liquids": "Water and liquid behavior",
  "track.triggers": "Track-specific triggers",
  "track.objects": "Track object behavior",
  "track.player": "Track-specific player behavior",
  "track.vehicleSelection": "Vehicle-selection restrictions",
  "track.progression": "Track progression",
  "track.presentation": "Track presentation",
  "track.raceRecords": "Race records",
  "track.modeRules": "Game-mode rules",
  "track.loader": "Track resources",
  "track.bounds": "Track-file safety check",
  "scene.id": "Scene identity",
  "area.id": "Area identity",
  "scene.map": "Scene and area map",
  "scene.tables": "Scene and area tables",
  "area.tables": "Area tables",
  "identity.bounds": "Scene and area safety check",
  "family.pond": "Pond behavior coverage",
  "family.forest": "Forest behavior coverage",
  "family.hive": "Hive behavior coverage",
  "family.night": "Night behavior coverage",
  "family.lawn": "Lawn behavior coverage",
  "family.anthill": "Anthill behavior coverage",
  "family.indexedTables": "Family-indexed game tables",
  "family.fenceAvailability": "Fence availability",
  "family.liquidAvailability": "Liquid availability",
  "family.itemMotion": "Family-specific item behavior",
  "family.enemyTypes": "Family-specific enemy behavior",
  "family.rendering": "Family-specific rendering",
  "family.camera": "Family-specific camera behavior",
  "level.persistence": "Level file and save identity",
  "level.bounds": "Level bounds check",
};

const metadataAuditDescriptions: Readonly<Record<string, string>> = {
  "level.realId": "The original level identity used for indexed resources and progression. It is shown as context and remains tied to the opened level.",
  "level.id": "The original level identity used for indexed resources and progression. It is shown as context and is not an editable behavior setting.",
  "level.mainDispatch": "The original level dispatch selects the main loop, transition, and special level lifecycle. Individual supported behavior overrides appear above where they have an independent user-facing effect.",
  "level.tunnelStart": "Tunnel entry coordinates are derived from the selected tunnel level and authored loading data. They are not an independent metadata setting.",
  "level.sentinel": "This safety branch protects title-screen and table lookups from a non-gameplay sentinel value. It is not gameplay behavior.",
  "level.fileBounds": "This safety check prevents an out-of-range level from being used as an indexed resource. It is not an editable level property.",
  "track.id": "The opened track identity selects authored geometry, resources, records, and progression. Track behavior overrides are listed separately where safe.",
  "track.liquids": "Water heights, liquid resources, and liquid behavior remain coupled to the authored track resource; only supported water behavior controls are editable above.",
  "track.triggers": "Some triggers depend on authored track objects and resources. They remain read-only unless a distinct safe behavior is exposed above.",
  "track.objects": "Track objects use authored tables and item parameters. Their resource identity and table indices remain fixed to prevent mismatched geometry and models.",
  "track.player": "Some player behavior depends on authored vehicle, liquid, and track resources. Independently supported vehicle behavior is exposed above.",
  "track.vehicleSelection": "The original track can restrict vehicle choices. This remains tied to track identity and is not an independent player-vehicle setting.",
  "track.progression": "Track progression and startup state remain tied to the authored track and game mode. Presentation-only controls are listed separately.",
  "track.presentation": "Track names, maps, and records use authored identity tables. They are shown as context rather than exposed as unsafe resource selectors.",
  "track.raceRecords": "Race records are indexed by the original track identity and remain attached to that track’s saved data.",
  "track.modeRules": "Game-mode rules depend on the selected mode, track geometry, and multiplayer state. Only independently supported mode behavior is editable above.",
  "track.loader": "The track loader selects authored terrain and model resources. Resource identity is read-only to prevent incompatible item and geometry combinations.",
  "track.bounds": "This safety check prevents an out-of-range track from being used as an indexed resource. It is not an editable track property.",
  "scene.id": "The original scene identity selects authored Mighty Mike scene resources and progression. Scene behavior overrides are listed separately.",
  "area.id": "The original area identity selects the opened map and area data. It remains fixed while supported scene and area behaviors can be overridden above.",
  "scene.map": "The scene and area map resource is authored data and remains fixed so collision, coordinates, and item placement stay compatible.",
  "scene.tables": "Scene and area coordinate and bunny-count tables are authored data. Their resource identity remains fixed; supported presentation and behavior overrides are listed above.",
  "area.tables": "Area-specific shape, coordinate, and bunny-count tables are authored data and remain fixed to the opened map.",
  "identity.bounds": "This safety check keeps scene and area indices within their valid table ranges.",
  "family.pond": "Pond levels use water-bug movement, mosquito behavior, liquid geometry, and pond-specific item rules. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.forest": "Forest levels use forest traps, items, Dragonfly behavior, and camera framing. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.hive": "Hive levels use bee, hive-item, trap, trigger, and player rules. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.night": "Night levels use firefly, night-item, trigger, and camera rules. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.lawn": "Lawn levels use the ordinary item, trigger, and renderer rules. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.anthill": "Anthill levels use ant, roach, liquid, and trigger rules. The row documents the original family coverage; use the individual controls above for supported overrides.",
  "family.indexedTables": "The original family selects indexed file, introduction, player, item, fence, and liquid tables. These resources stay tied to level identity to avoid incompatible assets.",
  "family.fenceAvailability": "Fence availability is selected by the original terrain family and controls which fence types can be created. It is not an independent behavior setting.",
  "family.liquidAvailability": "Liquid availability, textures, tessellation, and heights are selected by the original terrain family. They stay coupled to the terrain resource.",
  "family.itemMotion": "Family-specific item movement and type tables are selected by the original terrain family. Independent item behaviors appear above when they are safe to override.",
  "family.enemyTypes": "Family-indexed enemy object types are selected by the original terrain family. The row is context for the supported enemy controls above.",
  "family.rendering": "Cyclorama, lens flare, ceiling, light, fog, and active-range setup is selected by the original terrain family. Supported presentation controls appear above.",
  "family.camera": "Night and forest camera behavior is selected by the original terrain family. Supported camera behavior appears above when it has an independent effect.",
  "level.persistence": "The original level identity determines the level file and save-data slot. This remains fixed so edited behavior does not accidentally load or overwrite another level's data.",
  "level.bounds": "This safety check prevents an out-of-range level value from indexing level resources. It is not gameplay behavior and cannot be overridden.",
};

function isReadOnlyMetadataKey(key: string): boolean {
  const bugdomAuditOnlyKeys = new Set([
    "family.pond", "family.forest", "family.hive", "family.night",
    "family.lawn", "family.anthill", "family.indexedTables",
    "family.fenceAvailability", "family.liquidAvailability",
    "family.itemMotion", "family.enemyTypes", "family.rendering",
    "family.camera",
  ]);
  if (bugdomAuditOnlyKeys.has(key)) return true;
  if (key.startsWith("track.")) {
    return ![
      "track.mode", "track.waterAnimation", "track.surfaceEffects", "track.vehicle",
      "track.music", "track.lighting", "track.sky", "track.liquidMaterial", "track.campfire",
      "track.startLineCollision", "track.startLineMovement", "track.objectTint",
    ].includes(key);
  }
  return key.endsWith(".id")
    || key === "level.assetIdentity"
    || key === "level.mainDispatch"
    || key === "level.persistence"
    || key.endsWith(".realId")
    || key.endsWith(".bounds")
    || key.endsWith(".fileBounds")
    || key.endsWith(".sentinel")
    || key.endsWith(".rawIds")
    || key === "identity.bounds"
    || key === "scene.map"
    || key === "scene.tables"
    || key === "area.tables"
    || key === "level.art"
    || key === "level.terrain"
    || key === "level.tunnelStart"
    || key === "level.playerStart"
    || key === "level.itemState"
    || key === "level.unsupported";
}

function getCatalogControl(key: string): MetadataControl {
  if (key.includes("availability") || key.includes("enabled") || key.includes("saucers")) {
    return { kind: "checkbox" };
  }
  if (key.includes("mode") || key.includes("profile") || key.includes("family") || key.includes("type") || key.includes("selection")) {
    return { kind: "select", options: ["source-default", "level-specific", "disabled"] };
  }
  return { kind: "select", options: ["source-default", "level-specific", "custom"] };
}

const rule = (
  key: string,
  value: string,
  source: string,
  status: MetadataRule["status"] = "derived",
): MetadataRule => ({
  key,
  label: isReadOnlyMetadataKey(key)
    ? metadataAuditLabels[key] ?? getMetadataLabel(key)
    : getMetadataLabel(key),
  description: isReadOnlyMetadataKey(key)
    ? metadataAuditDescriptions[key] ?? "This read-only row documents an authored or derived runtime value. It remains fixed because it has no safe independent user-facing override."
    : `Selects the ${getMetadataLabel(key).toLowerCase()} used by this level.`,
  value: isReadOnlyMetadataKey(key) ? value : "source-default",
  source,
  citations: getMetadataCitations(source),
  status,
  editable: !isReadOnlyMetadataKey(key),
  control: isReadOnlyMetadataKey(key) ? getMetadataControl(key) : getCatalogControl(key),
});

const editableRule = (
  key: string,
  label: string,
  description: string,
  value: string,
  source: string,
  control: MetadataControl,
  defaultValue = value,
  group?: MetadataRuleGroup,
  groupRole?: MetadataRuleGroupRole,
): MetadataRule => ({
  key,
  label,
  description,
  value,
  defaultValue,
  source,
  citations: getMetadataCitations(source),
  status: "resolved",
  editable: true,
  ...(group ? { group } : {}),
  ...(groupRole ? { groupRole } : {}),
  control: control.kind === "select" && control.optionDescriptions === undefined
    ? { ...control, optionDescriptions: getOptionDescriptionsForKey(key) }
    : control,
});

const auditRule = (
  key: string,
  label: string,
  description: string,
  value: string,
  source: string,
): MetadataRule => ({
  key,
  label,
  description,
  value,
  source,
  citations: getMetadataCitations(source),
  status: "resolved",
  editable: false,
  control: getMetadataControl(key),
});

function getOttoLightingProfile(levelIndex: number): string {
  switch (levelIndex) {
    case 2: return "blob-boss";
    case 3: return "apocalypse";
    case 5: return "jungle";
    case 6: return "jungle-boss";
    case 7: return "fire-ice";
    case 8: return "saucer";
    case 9: return "brain-boss";
    default: return "standard";
  }
}

function getOttoEnvironmentProfile(levelIndex: number): string {
  switch (levelIndex) {
    case 1: return "blob";
    case 2: return "blob-boss";
    case 3: return "apocalypse";
    case 4: return "cloud";
    case 5: return "jungle";
    case 7: return "fire-ice";
    case 8: return "saucer";
    case 9: return "brain-boss";
    default: return "standard";
  }
}

interface OttoEnvironmentDefaults {
  readonly viewDistance: number;
  readonly background: readonly [number, number, number];
  readonly lensFlare: boolean;
}

function getOttoEnvironmentDefaults(levelIndex: number): OttoEnvironmentDefaults {
  return getOttoEnvironmentDefaultsForProfile(getOttoEnvironmentProfile(levelIndex));
}

function getOttoEnvironmentDefaultsForProfile(profile: string): OttoEnvironmentDefaults {
  switch (profile) {
    case "blob": return { viewDistance: 0.6, background: [0.8, 0.6, 0.8], lensFlare: true };
    case "blob-boss": return { viewDistance: 1, background: [0.17, 0.05, 0.29], lensFlare: false };
    case "apocalypse": return { viewDistance: 1, background: [0, 0, 0], lensFlare: false };
    case "cloud": return { viewDistance: 1, background: [0.686, 0.137, 0.431], lensFlare: false };
    case "jungle": return { viewDistance: 1, background: [0.6, 0.6, 0.3], lensFlare: false };
    case "fire-ice": return { viewDistance: 1, background: [0, 0, 0], lensFlare: false };
    case "saucer": return { viewDistance: 0.8, background: [0.2, 0.4, 0.7], lensFlare: false };
    case "brain-boss": return { viewDistance: 0.7, background: [0.1, 0, 0], lensFlare: false };
    default: return { viewDistance: 1, background: [0.1, 0.5, 0.1], lensFlare: true };
  }
}

interface OttoLightingDefaults {
  readonly sunDirection: readonly [number, number, number];
  readonly ambient: readonly [number, number, number];
  readonly fillColor: readonly [number, number, number];
}

function getOttoLightingDefaults(levelIndex: number): OttoLightingDefaults {
  return getOttoLightingDefaultsForProfile(getOttoLightingProfile(levelIndex));
}

function getOttoLightingDefaultsForProfile(profile: string): OttoLightingDefaults {
  switch (profile) {
    case "blob-boss": return { sunDirection: [0.5, -0.35, 0.8], ambient: [0.2, 0.2, 0.2], fillColor: [0.9, 0.9, 0.85] };
    case "apocalypse": return { sunDirection: [0.5, -0.6, 0.8], ambient: [0.2, 0.2, 0.2], fillColor: [0.6, 0.6, 0.7] };
    case "jungle": return { sunDirection: [0.5, -0.8, 0.8], ambient: [0.3, 0.3, 0.3], fillColor: [0.9, 0.9, 0.85] };
    case "jungle-boss": return { sunDirection: [0.1, -0.5, -1], ambient: [0.3, 0.3, 0.3], fillColor: [0.9, 0.9, 0.85] };
    case "fire-ice": return { sunDirection: [0.5, -1, 0], ambient: [0.3, 0.3, 0.2], fillColor: [0.7, 0.6, 0.6] };
    case "saucer": return { sunDirection: [0.5, -0.35, -0.8], ambient: [0.3, 0.25, 0.25], fillColor: [0.9, 0.9, 0.85] };
    case "brain-boss": return { sunDirection: [-0.5, -0.7, 0.8], ambient: [0.3, 0.3, 0.3], fillColor: [0.9, 0.9, 0.85] };
    default: return { sunDirection: [0.5, -0.35, 0.8], ambient: [0.4, 0.4, 0.36], fillColor: [0.9, 0.9, 0.85] };
  }
}

function getOttoEnvironmentDeterminedValues(
  profile: string,
): Readonly<Record<string, string>> {
  const defaults = getOttoEnvironmentDefaultsForProfile(profile);
  return {
    "level.environmentViewDistance": String(defaults.viewDistance),
    "level.environmentBackgroundR": String(defaults.background[0]),
    "level.environmentBackgroundG": String(defaults.background[1]),
    "level.environmentBackgroundB": String(defaults.background[2]),
    "level.environmentLensFlare": String(defaults.lensFlare),
  };
}

function getOttoLightingDeterminedValues(
  profile: string,
): Readonly<Record<string, string>> {
  const defaults = getOttoLightingDefaultsForProfile(profile);
  return {
    "level.lightingSunX": String(defaults.sunDirection[0]),
    "level.lightingSunY": String(defaults.sunDirection[1]),
    "level.lightingSunZ": String(defaults.sunDirection[2]),
    "level.lightingAmbientR": String(defaults.ambient[0]),
    "level.lightingAmbientG": String(defaults.ambient[1]),
    "level.lightingAmbientB": String(defaults.ambient[2]),
    "level.lightingFillR": String(defaults.fillColor[0]),
    "level.lightingFillG": String(defaults.fillColor[1]),
    "level.lightingFillB": String(defaults.fillColor[2]),
  };
}

const ottoEnvironmentGroup: MetadataRuleGroup = {
  id: "otto-environment",
  label: "Environment",
  presetKey: "level.environment",
  determinedValues: {
    standard: getOttoEnvironmentDeterminedValues("standard"),
    blob: getOttoEnvironmentDeterminedValues("blob"),
    "blob-boss": getOttoEnvironmentDeterminedValues("blob-boss"),
    apocalypse: getOttoEnvironmentDeterminedValues("apocalypse"),
    cloud: getOttoEnvironmentDeterminedValues("cloud"),
    jungle: getOttoEnvironmentDeterminedValues("jungle"),
    "fire-ice": getOttoEnvironmentDeterminedValues("fire-ice"),
    saucer: getOttoEnvironmentDeterminedValues("saucer"),
    "brain-boss": getOttoEnvironmentDeterminedValues("brain-boss"),
  },
};

const ottoLightingGroup: MetadataRuleGroup = {
  id: "otto-lighting",
  label: "Lighting",
  presetKey: "level.lighting",
  determinedValues: {
    standard: getOttoLightingDeterminedValues("standard"),
    "blob-boss": getOttoLightingDeterminedValues("blob-boss"),
    apocalypse: getOttoLightingDeterminedValues("apocalypse"),
    jungle: getOttoLightingDeterminedValues("jungle"),
    "jungle-boss": getOttoLightingDeterminedValues("jungle-boss"),
    "fire-ice": getOttoLightingDeterminedValues("fire-ice"),
    saucer: getOttoLightingDeterminedValues("saucer"),
    "brain-boss": getOttoLightingDeterminedValues("brain-boss"),
  },
};

interface Bugdom2RenderingDefaults {
  readonly background: readonly [number, number, number];
  readonly fog: boolean;
  readonly fogStart: number;
  readonly fogEnd: number;
  readonly lensFlare: boolean;
  readonly terrainScale: number;
  readonly fieldOfView: number;
}

interface MetadataPresetProfile {
  readonly key: string;
  readonly label: string;
}

function getPresetSliderControl<T>(
  profiles: readonly MetadataPresetProfile[],
  getDefaults: (profile: string) => T,
  getValue: (defaults: T) => number,
  min: number,
  max: number,
  step: number,
): MetadataControl {
  return {
    kind: "slider",
    min,
    max,
    step,
    gameValues: profiles.map((profile) => ({
      value: getValue(getDefaults(profile.key)),
      label: profile.label,
    })),
  };
}

function getBugdom2RenderingDefaults(profile: string): Bugdom2RenderingDefaults {
  switch (profile) {
    case "sidewalk": return { background: [0.9, 0.9, 0.9], fog: true, fogStart: 0.5, fogEnd: 1.2, lensFlare: true, terrainScale: 1, fieldOfView: 1.2 };
    case "fido": return { background: [0.12, 0.08, 0.08], fog: true, fogStart: 0.1, fogEnd: 0.95, lensFlare: false, terrainScale: 1, fieldOfView: 1.2 };
    case "playroom": return { background: [0, 0, 0], fog: false, fogStart: 0, fogEnd: 0.7, lensFlare: false, terrainScale: 1, fieldOfView: 1.2 };
    case "closet": return { background: [0, 0, 0.1], fog: true, fogStart: 0.2, fogEnd: 0.95, lensFlare: false, terrainScale: 1, fieldOfView: 1.2 };
    case "garbage": return { background: [0.1, 0.2, 0.1], fog: true, fogStart: 0.7, fogEnd: 1.1, lensFlare: true, terrainScale: 1, fieldOfView: 1.2 };
    case "balsa": return { background: [0, 0, 0], fog: false, fogStart: 0, fogEnd: 1, lensFlare: false, terrainScale: 1.6, fieldOfView: 0.9 };
    case "park": return { background: [1, 1, 1], fog: true, fogStart: 0, fogEnd: 1, lensFlare: true, terrainScale: 1, fieldOfView: 1.2 };
    default: return { background: [0, 0.4, 0], fog: true, fogStart: 0.7, fogEnd: 1, lensFlare: true, terrainScale: 1, fieldOfView: 1.2 };
  }
}

interface Bugdom2LightingDefaults {
  readonly ambient: readonly [number, number, number];
  readonly fillDirection1: readonly [number, number, number];
  readonly fillColor1: readonly [number, number, number];
  readonly fillDirection2: readonly [number, number, number];
  readonly fillColor2: readonly [number, number, number];
  readonly fillCount: "one" | "two";
}

function getBugdom2LightingDefaults(profile: string): Bugdom2LightingDefaults {
  switch (profile) {
    case "fido": return { ambient: [0.2, 0.1, 0.1], fillDirection1: [-0.5, -0.2, 0.5], fillColor1: [1, 1, 0.8], fillDirection2: [0.4, -0.1, -0.5], fillColor2: [0.5, 0.5, 0.4], fillCount: "two" };
    case "sidewalk": return { ambient: [0.4, 0.4, 0.3], fillDirection1: [0.8, -0.5, -0.8], fillColor1: [0.9, 0.9, 0.85], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
    case "playroom": return { ambient: [0.35, 0.35, 0.3], fillDirection1: [1, -0.4, 1], fillColor1: [1, 0.7, 0.7], fillDirection2: [-1, -0.2, -0.5], fillColor2: [0.7, 0.7, 1], fillCount: "two" };
    case "closet": return { ambient: [0.2, 0.2, 0.3], fillDirection1: [0.3, -0.6, -0.5], fillColor1: [0.25, 0.25, 0.4], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
    case "garbage": return { ambient: [0.3, 0.3, 0.3], fillDirection1: [-0.5, -0.5, -0.8], fillColor1: [0.8, 0.9, 0.8], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
    case "balsa": return { ambient: [0.3, 0.3, 0.3], fillDirection1: [0.8, -0.6, -0.9], fillColor1: [1, 1, 0.9], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
    case "park": return { ambient: [0.4, 0.4, 0.3], fillDirection1: [0.8, -0.35, -0.2], fillColor1: [0.9, 0.9, 0.8], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
    default: return { ambient: [0.5, 0.5, 0.4], fillDirection1: [0.4, -0.5, -0.8], fillColor1: [0.9, 0.9, 0.85], fillDirection2: [0, 0, 0], fillColor2: [0, 0, 0], fillCount: "one" };
  }
}

function getBugdom2RenderingDeterminedValues(profile: string): Readonly<Record<string, string>> {
  const defaults = getBugdom2RenderingDefaults(profile);
  return {
    "level.renderingFog": String(defaults.fog),
    "level.renderingBackgroundR": String(defaults.background[0]),
    "level.renderingBackgroundG": String(defaults.background[1]),
    "level.renderingBackgroundB": String(defaults.background[2]),
    "level.renderingFogStart": String(defaults.fogStart),
    "level.renderingFogEnd": String(defaults.fogEnd),
    "level.renderingLensFlare": String(defaults.lensFlare),
    "level.renderingTerrainScale": String(defaults.terrainScale),
    "level.renderingFieldOfView": String(defaults.fieldOfView),
  };
}

function getBugdom2LightingDeterminedValues(profile: string): Readonly<Record<string, string>> {
  const defaults = getBugdom2LightingDefaults(profile);
  return {
    "level.lightingAmbientR": String(defaults.ambient[0]),
    "level.lightingAmbientG": String(defaults.ambient[1]),
    "level.lightingAmbientB": String(defaults.ambient[2]),
    "level.lightingFillCount": defaults.fillCount,
    "level.lightingFill1X": String(defaults.fillDirection1[0]),
    "level.lightingFill1Y": String(defaults.fillDirection1[1]),
    "level.lightingFill1Z": String(defaults.fillDirection1[2]),
    "level.lightingFill1R": String(defaults.fillColor1[0]),
    "level.lightingFill1G": String(defaults.fillColor1[1]),
    "level.lightingFill1B": String(defaults.fillColor1[2]),
    "level.lightingFill2X": String(defaults.fillDirection2[0]),
    "level.lightingFill2Y": String(defaults.fillDirection2[1]),
    "level.lightingFill2Z": String(defaults.fillDirection2[2]),
    "level.lightingFill2R": String(defaults.fillColor2[0]),
    "level.lightingFill2G": String(defaults.fillColor2[1]),
    "level.lightingFill2B": String(defaults.fillColor2[2]),
  };
}

const bugdom2RenderingGroup: MetadataRuleGroup = {
  id: "bugdom2-rendering",
  label: "Rendering",
  presetKey: "level.rendering",
  determinedValues: Object.fromEntries([
    "gnome-garden", "sidewalk", "fido", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park",
  ].map((profile) => [profile, getBugdom2RenderingDeterminedValues(profile)])),
};

const bugdom2VisualProfiles: readonly MetadataPresetProfile[] = [
  { key: "gnome-garden", label: "Gnome Garden" },
  { key: "sidewalk", label: "Sidewalk" },
  { key: "fido", label: "Fido" },
  { key: "playroom", label: "Playroom" },
  { key: "closet", label: "Closet" },
  { key: "garbage", label: "Garbage" },
  { key: "balsa", label: "Balsa" },
  { key: "park", label: "Park" },
];

const bugdom2LightingGroup: MetadataRuleGroup = {
  id: "bugdom2-lighting",
  label: "World lighting",
  presetKey: "level.lighting",
  determinedValues: Object.fromEntries([
    "gnome-garden", "sidewalk", "fido", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park",
  ].map((profile) => [profile, getBugdom2LightingDeterminedValues(profile)])),
};

interface CroMagLightingDefaults {
  readonly ambient: readonly [number, number, number];
  readonly fillDirection: readonly [number, number, number];
  readonly fillColor: readonly [number, number, number];
}

function getCroMagLightingDefaults(profile: string): CroMagLightingDefaults {
  switch (profile) {
    case "ice": return { ambient: [0.7, 0.7, 0.7], fillDirection: [1, -0.1, 1], fillColor: [1, 1, 1] };
    case "atlantis": return { ambient: [0.5, 0.5, 0.7], fillDirection: [0, -1, 0], fillColor: [0.9, 0.9, 1] };
    default: return { ambient: [0.6, 0.6, 0.6], fillDirection: [1, -0.2, 1], fillColor: [1, 1, 1] };
  }
}

function getCroMagSkyColor(profile: string): readonly [number, number, number] {
  const colors: Readonly<Record<string, readonly [number, number, number]>> = {
    desert: [153 / 255, 171 / 255, 237 / 255], jungle: [82 / 255, 148 / 255, 198 / 255],
    ice: [115 / 255, 198 / 255, 1], crete: [44 / 255, 73 / 255, 195 / 255],
    china: [179 / 255, 153 / 255, 91 / 255], egypt: [222 / 255, 181 / 255, 99 / 255],
    europe: [16 / 255, 16 / 255, 74 / 255], scandinavia: [74 / 255, 90 / 255, 148 / 255],
    atlantis: [5 / 255, 160 / 255, 190 / 255], aztec: [82 / 255, 148 / 255, 198 / 255],
    coliseum: [61 / 255, 87 / 255, 198 / 255],
  };
  return colors[profile] ?? colors.desert ?? [0.6, 0.67, 0.93];
}

function getCroMagLightingDeterminedValues(profile: string): Readonly<Record<string, string>> {
  const defaults = getCroMagLightingDefaults(profile);
  return {
    "track.lightingSunX": String(defaults.fillDirection[0]),
    "track.lightingSunY": String(defaults.fillDirection[1]),
    "track.lightingSunZ": String(defaults.fillDirection[2]),
    "track.lightingAmbientR": String(defaults.ambient[0]),
    "track.lightingAmbientG": String(defaults.ambient[1]),
    "track.lightingAmbientB": String(defaults.ambient[2]),
    "track.lightingFillR": String(defaults.fillColor[0]),
    "track.lightingFillG": String(defaults.fillColor[1]),
    "track.lightingFillB": String(defaults.fillColor[2]),
  };
}

function getCroMagSkyDeterminedValues(profile: string): Readonly<Record<string, string>> {
  const color = getCroMagSkyColor(profile);
  return {
    "track.skyRed": String(color[0]),
    "track.skyGreen": String(color[1]),
    "track.skyBlue": String(color[2]),
  };
}

const croMagLightingGroup: MetadataRuleGroup = {
  id: "cromag-lighting",
  label: "Lighting",
  presetKey: "track.lighting",
  determinedValues: {
    standard: getCroMagLightingDeterminedValues("standard"),
    ice: getCroMagLightingDeterminedValues("ice"),
    atlantis: getCroMagLightingDeterminedValues("atlantis"),
  },
};

const croMagSkyGroup: MetadataRuleGroup = {
  id: "cromag-sky",
  label: "Sky color",
  presetKey: "track.sky",
  determinedValues: {
    desert: getCroMagSkyDeterminedValues("desert"),
    jungle: getCroMagSkyDeterminedValues("jungle"),
    ice: getCroMagSkyDeterminedValues("ice"),
    crete: getCroMagSkyDeterminedValues("crete"),
    china: getCroMagSkyDeterminedValues("china"),
    egypt: getCroMagSkyDeterminedValues("egypt"),
    europe: getCroMagSkyDeterminedValues("europe"),
    scandinavia: getCroMagSkyDeterminedValues("scandinavia"),
    atlantis: getCroMagSkyDeterminedValues("atlantis"),
    aztec: getCroMagSkyDeterminedValues("aztec"),
    coliseum: getCroMagSkyDeterminedValues("coliseum"),
  },
};

const croMagLightingProfiles: readonly MetadataPresetProfile[] = [
  { key: "standard", label: "Standard" },
  { key: "ice", label: "Ice" },
  { key: "atlantis", label: "Atlantis" },
];

const croMagSkyProfiles: readonly MetadataPresetProfile[] = [
  { key: "desert", label: "Desert" },
  { key: "jungle", label: "Jungle and Aztec" },
  { key: "ice", label: "Ice" },
  { key: "crete", label: "Crete, Spiral, Celtic, and Maze" },
  { key: "china", label: "China" },
  { key: "egypt", label: "Egypt and Tar Pits" },
  { key: "europe", label: "Europe" },
  { key: "scandinavia", label: "Scandinavia and Stonehenge" },
  { key: "atlantis", label: "Atlantis" },
  { key: "aztec", label: "Aztec" },
  { key: "coliseum", label: "Coliseum" },
];

interface Nanosaur2RenderingDefaults {
  readonly background: readonly [number, number, number];
  readonly fogStart: number;
  readonly fogEnd: number;
  readonly ambient: readonly [number, number, number];
  readonly sunDirection: readonly [number, number, number];
  readonly fillColor: readonly [number, number, number];
  readonly lensFlare: boolean;
}

function getNanosaur2RenderingDefaults(profile: string): Nanosaur2RenderingDefaults {
  switch (profile) {
    case "desert": return { background: [0.968, 0.537, 0.278], fogStart: 0.4, fogEnd: 0.95, ambient: [0.45, 0.45, 0.45], sunDirection: [0.4, -0.3, 0.2], fillColor: [0.6, 0.6, 0.6], lensFlare: true };
    case "swamp": return { background: [0.568, 0.243, 0.125], fogStart: 0.4, fogEnd: 0.95, ambient: [0.45, 0.45, 0.45], sunDirection: [0.4, -0.3, 0.2], fillColor: [0.6, 0.6, 0.6], lensFlare: true };
    default: return { background: [0.43, 0.33, 0.7], fogStart: 0.35, fogEnd: 0.95, ambient: [0.4, 0.4, 0.4], sunDirection: [0.4, -0.5, 0.5], fillColor: [0.7, 0.7, 0.7], lensFlare: true };
  }
}

function getNanosaur2RenderingDeterminedValues(profile: string): Readonly<Record<string, string>> {
  const defaults = getNanosaur2RenderingDefaults(profile);
  return {
    "level.renderingBackgroundR": String(defaults.background[0]),
    "level.renderingBackgroundG": String(defaults.background[1]),
    "level.renderingBackgroundB": String(defaults.background[2]),
    "level.renderingFogStart": String(defaults.fogStart),
    "level.renderingFogEnd": String(defaults.fogEnd),
    "level.renderingAmbientR": String(defaults.ambient[0]),
    "level.renderingAmbientG": String(defaults.ambient[1]),
    "level.renderingAmbientB": String(defaults.ambient[2]),
    "level.renderingSunX": String(defaults.sunDirection[0]),
    "level.renderingSunY": String(defaults.sunDirection[1]),
    "level.renderingSunZ": String(defaults.sunDirection[2]),
    "level.renderingFillR": String(defaults.fillColor[0]),
    "level.renderingFillG": String(defaults.fillColor[1]),
    "level.renderingFillB": String(defaults.fillColor[2]),
    "level.renderingLensFlare": String(defaults.lensFlare),
  };
}

const nanosaur2RenderingGroup: MetadataRuleGroup = {
  id: "nanosaur2-rendering",
  label: "Rendering",
  presetKey: "level.rendering",
  determinedValues: {
    forest: getNanosaur2RenderingDeterminedValues("forest"),
    desert: getNanosaur2RenderingDeterminedValues("desert"),
    swamp: getNanosaur2RenderingDeterminedValues("swamp"),
  },
};

const nanosaur2RenderingProfiles: readonly MetadataPresetProfile[] = [
  { key: "forest", label: "Forest" },
  { key: "desert", label: "Desert" },
  { key: "swamp", label: "Swamp" },
];

function getBugdom2RenderingRules(profile: string): readonly MetadataRule[] {
  const defaults = getBugdom2RenderingDefaults(profile);
  return [
    editableRule("level.renderingFog", "Fog enabled", "When enabled, distant geometry fades into the configured fog range. When disabled, the scene keeps the selected clear color without distance fog.", String(defaults.fog), "System/Main.c:599-741", { kind: "checkbox" }, String(defaults.fog), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingBackgroundR", "Background red", "Sets the red channel of the color used to clear the area behind the terrain and sky.", String(defaults.background[0]), "System/Main.c:599-741", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.background[0], 0, 1, 0.01), String(defaults.background[0]), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingBackgroundG", "Background green", "Sets the green channel of the color used to clear the area behind the terrain and sky.", String(defaults.background[1]), "System/Main.c:599-741", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.background[1], 0, 1, 0.01), String(defaults.background[1]), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingBackgroundB", "Background blue", "Sets the blue channel of the color used to clear the area behind the terrain and sky.", String(defaults.background[2]), "System/Main.c:599-741", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.background[2], 0, 1, 0.01), String(defaults.background[2]), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingFogStart", "Fog starts at", "Sets where fog begins as a multiplier of the active view distance. A smaller value makes distant geometry fade sooner.", String(defaults.fogStart), "System/Main.c:599-741", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.fogStart, 0, 2, 0.01), String(defaults.fogStart), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingFogEnd", "Fog ends at", "Sets where fog reaches full strength as a multiplier of the active view distance. A larger value keeps distant geometry visible farther away.", String(defaults.fogEnd), "System/Main.c:599-741", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.fogEnd, 0, 2, 0.01), String(defaults.fogEnd), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingLensFlare", "Lens flare", "Controls whether the sun-facing lens-flare effect is drawn in this area.", String(defaults.lensFlare), "System/Main.c:599-741", { kind: "checkbox" }, String(defaults.lensFlare), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingTerrainScale", "Terrain scale", "Scales terrain geometry before it is placed in the world. Balsa uses 1.6; the other areas use 1.0.", String(defaults.terrainScale), "System/Main.c:580-599", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.terrainScale, 0.5, 2, 0.01), String(defaults.terrainScale), bugdom2RenderingGroup, "determined"),
    editableRule("level.renderingFieldOfView", "Field of view", "Sets the camera field of view. The normal Bugdom 2 view is 1.2; Balsa narrows it to 0.9 for flight.", String(defaults.fieldOfView), "System/Main.c:585; System/Main.c:686-699", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2RenderingDefaults, (value) => value.fieldOfView, 0.5, 1.5, 0.01), String(defaults.fieldOfView), bugdom2RenderingGroup, "determined"),
  ];
}

function getBugdom2LightingRules(profile: string): readonly MetadataRule[] {
  const defaults = getBugdom2LightingDefaults(profile);
  return [
    editableRule("level.lightingAmbientR", "Ambient red", "Sets the red channel of the light applied evenly to the whole scene.", String(defaults.ambient[0]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.ambient[0], 0, 1, 0.01), String(defaults.ambient[0]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingAmbientG", "Ambient green", "Sets the green channel of the light applied evenly to the whole scene.", String(defaults.ambient[1]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.ambient[1], 0, 1, 0.01), String(defaults.ambient[1]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingAmbientB", "Ambient blue", "Sets the blue channel of the light applied evenly to the whole scene.", String(defaults.ambient[2]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.ambient[2], 0, 1, 0.01), String(defaults.ambient[2]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFillCount", "Active fill lights", "Chooses whether the renderer uses one or two directional fill lights. Fido and Playroom use two; the other area presets use one.", defaults.fillCount, "System/Main.c:753-880", { kind: "select", options: ["one", "two"], optionLabels: { one: "One fill light", two: "Two fill lights" }, optionDescriptions: { one: "Use only the primary directional fill light.", two: "Use both directional fill lights." } }, defaults.fillCount, bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1X", "Primary light direction X", "Sets the horizontal X component of the primary directional light.", String(defaults.fillDirection1[0]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection1[0], -1, 1, 0.01), String(defaults.fillDirection1[0]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1Y", "Primary light direction Y", "Sets the vertical Y component of the primary directional light.", String(defaults.fillDirection1[1]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection1[1], -1, 1, 0.01), String(defaults.fillDirection1[1]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1Z", "Primary light direction Z", "Sets the depth Z component of the primary directional light.", String(defaults.fillDirection1[2]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection1[2], -1, 1, 0.01), String(defaults.fillDirection1[2]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1R", "Primary light red", "Sets the red channel of the primary directional light.", String(defaults.fillColor1[0]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor1[0], 0, 1, 0.01), String(defaults.fillColor1[0]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1G", "Primary light green", "Sets the green channel of the primary directional light.", String(defaults.fillColor1[1]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor1[1], 0, 1, 0.01), String(defaults.fillColor1[1]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill1B", "Primary light blue", "Sets the blue channel of the primary directional light.", String(defaults.fillColor1[2]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor1[2], 0, 1, 0.01), String(defaults.fillColor1[2]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2X", "Secondary light direction X", "Sets the horizontal X component of the secondary directional light.", String(defaults.fillDirection2[0]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection2[0], -1, 1, 0.01), String(defaults.fillDirection2[0]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2Y", "Secondary light direction Y", "Sets the vertical Y component of the secondary directional light.", String(defaults.fillDirection2[1]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection2[1], -1, 1, 0.01), String(defaults.fillDirection2[1]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2Z", "Secondary light direction Z", "Sets the depth Z component of the secondary directional light.", String(defaults.fillDirection2[2]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillDirection2[2], -1, 1, 0.01), String(defaults.fillDirection2[2]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2R", "Secondary light red", "Sets the red channel of the secondary directional light.", String(defaults.fillColor2[0]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor2[0], 0, 1, 0.01), String(defaults.fillColor2[0]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2G", "Secondary light green", "Sets the green channel of the secondary directional light.", String(defaults.fillColor2[1]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor2[1], 0, 1, 0.01), String(defaults.fillColor2[1]), bugdom2LightingGroup, "determined"),
    editableRule("level.lightingFill2B", "Secondary light blue", "Sets the blue channel of the secondary directional light.", String(defaults.fillColor2[2]), "System/Main.c:753-880", getPresetSliderControl(bugdom2VisualProfiles, getBugdom2LightingDefaults, (value) => value.fillColor2[2], 0, 1, 0.01), String(defaults.fillColor2[2]), bugdom2LightingGroup, "determined"),
  ];
}

function getCroMagLightingRules(profile: string): readonly MetadataRule[] {
  const defaults = getCroMagLightingDefaults(profile);
  return [
    editableRule("track.lightingSunX", "Fill light direction X", "Sets the horizontal X component of the track’s directional fill light.", String(defaults.fillDirection[0]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillDirection[0], -1, 1, 0.01), String(defaults.fillDirection[0]), croMagLightingGroup, "determined"),
    editableRule("track.lightingSunY", "Fill light direction Y", "Sets the vertical Y component of the track’s directional fill light.", String(defaults.fillDirection[1]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillDirection[1], -1, 1, 0.01), String(defaults.fillDirection[1]), croMagLightingGroup, "determined"),
    editableRule("track.lightingSunZ", "Fill light direction Z", "Sets the depth Z component of the track’s directional fill light.", String(defaults.fillDirection[2]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillDirection[2], -1, 1, 0.01), String(defaults.fillDirection[2]), croMagLightingGroup, "determined"),
    editableRule("track.lightingAmbientR", "Ambient red", "Sets the red channel of the light applied evenly to the whole track.", String(defaults.ambient[0]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.ambient[0], 0, 1, 0.01), String(defaults.ambient[0]), croMagLightingGroup, "determined"),
    editableRule("track.lightingAmbientG", "Ambient green", "Sets the green channel of the light applied evenly to the whole track.", String(defaults.ambient[1]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.ambient[1], 0, 1, 0.01), String(defaults.ambient[1]), croMagLightingGroup, "determined"),
    editableRule("track.lightingAmbientB", "Ambient blue", "Sets the blue channel of the light applied evenly to the whole track.", String(defaults.ambient[2]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.ambient[2], 0, 1, 0.01), String(defaults.ambient[2]), croMagLightingGroup, "determined"),
    editableRule("track.lightingFillR", "Fill light red", "Sets the red channel of the track’s directional fill light.", String(defaults.fillColor[0]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillColor[0], 0, 1, 0.01), String(defaults.fillColor[0]), croMagLightingGroup, "determined"),
    editableRule("track.lightingFillG", "Fill light green", "Sets the green channel of the track’s directional fill light.", String(defaults.fillColor[1]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillColor[1], 0, 1, 0.01), String(defaults.fillColor[1]), croMagLightingGroup, "determined"),
    editableRule("track.lightingFillB", "Fill light blue", "Sets the blue channel of the track’s directional fill light.", String(defaults.fillColor[2]), "System/Main.c:1216-1248", getPresetSliderControl(croMagLightingProfiles, getCroMagLightingDefaults, (value) => value.fillColor[2], 0, 1, 0.01), String(defaults.fillColor[2]), croMagLightingGroup, "determined"),
  ];
}

function getCroMagSkyRules(profile: string): readonly MetadataRule[] {
  const color = getCroMagSkyColor(profile);
  return [
    editableRule("track.skyRed", "Sky red", "Sets the red channel of the clear color behind the track’s sky dome.", String(color[0]), "System/Main.c:1251-1280", getPresetSliderControl(croMagSkyProfiles, getCroMagSkyColor, (value) => value[0], 0, 1, 0.01), String(color[0]), croMagSkyGroup, "determined"),
    editableRule("track.skyGreen", "Sky green", "Sets the green channel of the clear color behind the track’s sky dome.", String(color[1]), "System/Main.c:1251-1280", getPresetSliderControl(croMagSkyProfiles, getCroMagSkyColor, (value) => value[1], 0, 1, 0.01), String(color[1]), croMagSkyGroup, "determined"),
    editableRule("track.skyBlue", "Sky blue", "Sets the blue channel of the clear color behind the track’s sky dome.", String(color[2]), "System/Main.c:1251-1280", getPresetSliderControl(croMagSkyProfiles, getCroMagSkyColor, (value) => value[2], 0, 1, 0.01), String(color[2]), croMagSkyGroup, "determined"),
  ];
}

function getNanosaur2RenderingRules(profile: string): readonly MetadataRule[] {
  const defaults = getNanosaur2RenderingDefaults(profile);
  return [
    editableRule("level.renderingBackgroundR", "Background red", "Sets the red channel of the clear color behind the level’s sky and terrain.", String(defaults.background[0]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.background[0], 0, 1, 0.01), String(defaults.background[0]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingBackgroundG", "Background green", "Sets the green channel of the clear color behind the level’s sky and terrain.", String(defaults.background[1]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.background[1], 0, 1, 0.01), String(defaults.background[1]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingBackgroundB", "Background blue", "Sets the blue channel of the clear color behind the level’s sky and terrain.", String(defaults.background[2]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.background[2], 0, 1, 0.01), String(defaults.background[2]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingFogStart", "Fog starts at", "Sets where fog begins as a multiplier of the camera view distance.", String(defaults.fogStart), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.fogStart, 0, 2, 0.01), String(defaults.fogStart), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingFogEnd", "Fog ends at", "Sets where fog reaches full strength as a multiplier of the camera view distance.", String(defaults.fogEnd), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.fogEnd, 0, 2, 0.01), String(defaults.fogEnd), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingAmbientR", "Ambient red", "Sets the red channel of the light applied evenly to the level.", String(defaults.ambient[0]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.ambient[0], 0, 1, 0.01), String(defaults.ambient[0]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingAmbientG", "Ambient green", "Sets the green channel of the light applied evenly to the level.", String(defaults.ambient[1]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.ambient[1], 0, 1, 0.01), String(defaults.ambient[1]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingAmbientB", "Ambient blue", "Sets the blue channel of the light applied evenly to the level.", String(defaults.ambient[2]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.ambient[2], 0, 1, 0.01), String(defaults.ambient[2]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingSunX", "Sun direction X", "Sets the horizontal X component of the level’s directional light.", String(defaults.sunDirection[0]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.sunDirection[0], -1, 1, 0.01), String(defaults.sunDirection[0]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingSunY", "Sun direction Y", "Sets the vertical Y component of the level’s directional light.", String(defaults.sunDirection[1]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.sunDirection[1], -1, 1, 0.01), String(defaults.sunDirection[1]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingSunZ", "Sun direction Z", "Sets the depth Z component of the level’s directional light.", String(defaults.sunDirection[2]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.sunDirection[2], -1, 1, 0.01), String(defaults.sunDirection[2]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingFillR", "Fill light red", "Sets the red channel of the level’s fill light.", String(defaults.fillColor[0]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.fillColor[0], 0, 1, 0.01), String(defaults.fillColor[0]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingFillG", "Fill light green", "Sets the green channel of the level’s fill light.", String(defaults.fillColor[1]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.fillColor[1], 0, 1, 0.01), String(defaults.fillColor[1]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingFillB", "Fill light blue", "Sets the blue channel of the level’s fill light.", String(defaults.fillColor[2]), "System/Main.c:446-492", getPresetSliderControl(nanosaur2RenderingProfiles, getNanosaur2RenderingDefaults, (value) => value.fillColor[2], 0, 1, 0.01), String(defaults.fillColor[2]), nanosaur2RenderingGroup, "determined"),
    editableRule("level.renderingLensFlare", "Lens flare", "Controls whether the level’s sun-facing lens-flare effect is drawn.", String(defaults.lensFlare), "System/Main.c:446-492", { kind: "checkbox" }, String(defaults.lensFlare), nanosaur2RenderingGroup, "determined"),
  ];
}

function getBillyAreaMode(levelIndex: number): string {
  switch (levelIndex) {
    case 1:
    case 7:
      return "shootout";
    case 3:
    case 9:
      return "stampede";
    case 5:
    case 11:
      return "target-practice";
    default:
      return "duel";
  }
}

const billyAreaModeDescriptions: Readonly<Record<string, string>> = {
  "source-default": "Keep the activity assigned to this area by the original game.",
  duel: "Play the one-on-one frontier duel and use duel completion rules.",
  shootout: "Play the gunfight against enemy outlaws and use shootout completion rules.",
  stampede: "Play the mounted stampede challenge and use its finish-line completion rules.",
  "target-practice": "Play the target-shooting challenge and use its target-count completion rules.",
};

function mightyMikeSceneValue(levelIndex: number): string {
  const scenes = ["jurassic", "candy", "fairy", "clown", "bargain"];
  return scenes[Math.floor(levelIndex / 3)] ?? "source-default";
}

const bugdom2AreaOptions = [
  "gnome-garden",
  "sidewalk",
  "fido",
  "plumbing",
  "playroom",
  "closet",
  "gutter",
  "garbage",
  "balsa",
  "park",
] as const;

function getBugdom2Area(levelIndex: number): string {
  return bugdom2AreaOptions[levelIndex] ?? "gnome-garden";
}

function getBugdom2AreaControl(): MetadataControl {
  return {
    kind: "select",
    options: bugdom2AreaOptions,
    optionDescriptions: getBugdom2BehaviorOptionDescriptions("level.bugdom2Area"),
  };
}

const bugdom2BehaviorOptions: Readonly<Record<string, readonly string[]>> = {
  "level.bugdom2Area": bugdom2AreaOptions,
  "level.fido": ["source-default", "fido"],
  "level.cyclorama": ["source-default", "playroom", "gutter", "park"],
  "level.itemObjects": ["source-default", "gnome-garden", "sidewalk", "playroom", "garbage", "park"],
  "level.traps": ["source-default", "gnome-garden", "sidewalk"],
  "level.water": ["source-default", "garbage", "park"],
  "level.terrain": ["source-default", "balsa"],
  "level.player": ["source-default", "balsa", "garbage"],
  "level.camera": ["source-default", "plumbing", "gutter", "balsa"],
  "level.intro": bugdom2AreaOptions,
  "level.infobar": bugdom2AreaOptions,
  "level.enemyPlant": ["source-default", "gnome-garden", "sidewalk"],
  "level.frog": ["source-default", "park", "balsa"],
  "level.snake": ["source-default", "park"],
  "level.dragonfly": ["source-default", "balsa"],
  "level.objects": ["source-default", "balsa"],
  "level.particles": ["source-default", "balsa"],
  "level.rideBall": ["source-default", "playroom", "sidewalk"],
  "level.specialItems": ["source-default", "gnome-garden", "sidewalk", "playroom", "closet", "park", "garbage"],
  "level.powerups": ["source-default", "balsa"],
  "level.trapRanges": ["source-default", "sidewalk"],
  "level.fileScale": ["source-default", "park"],
  "level.tunnel": ["source-default", "plumbing", "gutter"],
  "level.areaUpdate": ["source-default", "gnome-garden", "playroom", "garbage", "park"],
  "level.rendering": bugdom2AreaOptions,
  "level.lighting": bugdom2AreaOptions,
  "level.autoFade": ["source-default", "fido", "balsa", "closet"],
  "level.levelInit": bugdom2AreaOptions,
  "level.completion": ["source-default", "gnome-garden", "sidewalk", "playroom", "closet"],
  "level.mapPowerup": ["source-default", "closet"],
};

const bugdom2BehaviorOptionLabels: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "level.fido": {
    "source-default": "Use original enemy behavior",
    fido: "Enable Fido enemy rules",
  },
  "level.cyclorama": {
    "source-default": "Use original cyclorama rules",
    playroom: "Playroom cyclorama",
    gutter: "Gutter cyclorama",
    park: "Park cyclorama",
  },
  "level.itemObjects": {
    "source-default": "Use original object rules",
    "gnome-garden": "Gnome Garden objects",
    sidewalk: "Sidewalk objects",
    playroom: "Playroom objects",
    garbage: "Garbage objects",
    park: "Park objects",
  },
  "level.traps": {
    "source-default": "Use original trap rules",
    "gnome-garden": "Gnome Garden traps",
    sidewalk: "Sidewalk traps",
  },
  "level.water": {
    "source-default": "Use original water behavior",
    garbage: "Garbage flooding water",
    park: "Park deep water",
  },
  "level.camera": {
    "source-default": "Use original camera behavior",
    plumbing: "Plumbing tunnel camera",
    gutter: "Gutter tunnel camera",
    balsa: "Balsa flight camera",
  },
  "level.intro": {
    "source-default": "Use original level intro",
  },
  "level.infobar": {
    "source-default": "Use original Infobar",
  },
  "level.frog": {
    "source-default": "Use original frog behavior",
    park: "Park fish behavior",
    balsa: "Balsa frog behavior",
  },
  "level.dragonfly": {
    "source-default": "Use original dragonfly behavior",
    balsa: "Balsa flight behavior",
  },
  "level.rideBall": {
    "source-default": "Use original ride-ball behavior",
    playroom: "Playroom baseball",
    sidewalk: "Sidewalk ride ball",
  },
  "level.powerups": {
    "source-default": "Use original power-up behavior",
    balsa: "Balsa power-ups",
  },
  "level.fileScale": {
    "source-default": "Use original terrain scale",
    park: "Park extended terrain height",
  },
  "level.tunnel": {
    "source-default": "Use original tunnel behavior",
    plumbing: "Plumbing sewer tunnel",
    gutter: "Gutter tunnel",
  },
  "level.areaUpdate": {
    "source-default": "Use original per-frame updates",
    "gnome-garden": "Gnome Garden sprinklers",
    playroom: "Playroom slot cars",
    garbage: "Garbage rising water",
    park: "Park fog updates",
  },
  "level.rendering": {
    "source-default": "Use original view setup",
    "gnome-garden": "Gnome Garden view setup",
    sidewalk: "Sidewalk view setup",
    fido: "Fido view setup",
    plumbing: "Plumbing view setup",
    playroom: "Playroom view setup",
    closet: "Closet view setup",
    gutter: "Gutter view setup",
    garbage: "Garbage view setup",
    balsa: "Balsa flight view setup",
    park: "Park view setup",
  },
  "level.lighting": {
    "source-default": "Use original lighting",
    "gnome-garden": "Gnome Garden lighting",
    sidewalk: "Sidewalk lighting",
    fido: "Fido lighting",
    plumbing: "Plumbing lighting",
    playroom: "Playroom lighting",
    closet: "Closet lighting",
    gutter: "Gutter lighting",
    garbage: "Garbage lighting",
    balsa: "Balsa flight lighting",
    park: "Park lighting",
  },
  "level.autoFade": {
    "source-default": "Use original auto-fade",
    fido: "Fido auto-fade rules",
    balsa: "Balsa auto-fade rules",
    closet: "Closet auto-fade rules",
  },
  "level.levelInit": {
    "source-default": "Use original level initialization",
    "gnome-garden": "Gnome Garden initialization",
    sidewalk: "Sidewalk initialization",
    fido: "Fido initialization",
    plumbing: "Plumbing initialization",
    playroom: "Playroom initialization",
    closet: "Closet initialization",
    gutter: "Gutter initialization",
    garbage: "Garbage initialization",
    balsa: "Balsa flight initialization",
    park: "Park initialization",
  },
  "level.completion": {
    "source-default": "Use original completion markers",
  },
  "level.mapPowerup": {
    "source-default": "Use original map power-up",
    closet: "Closet paper map",
  },
};

const bugdom2BehaviorEffects: Readonly<Record<string, string>> = {
  "level.bugdom2Area": "selects the area-specific loader, gameplay loop, and completion branches",
  "level.fido": "controls Fido flea/tick spawning, cleanup, and level completion",
  "level.cyclorama": "selects the level-specific cyclorama model and placement",
  "level.itemObjects": "selects the area-specific post and pebble model variants",
  "level.traps": "selects the sprinkler trap models and setup rules",
  "level.water": "controls the water height adjustment and render ordering",
  "level.terrain": "selects terrain movement and Balsa-flight movement",
  "level.player": "selects player damage/reset handling and terrain setup",
  "level.camera": "selects the tunnel, Balsa-flight, or normal camera update",
  "level.intro": "selects the level-specific intro scene and subtitle timing",
  "level.infobar": "selects the Infobar counters and map presentation",
  "level.enemyPlant": "selects the pollen-spore model family used by evil plants",
  "level.frog": "selects Park fish handling and Balsa frog jump/hit behavior",
  "level.snake": "selects whether snake defeat handling uses the Park fish sequence",
  "level.dragonfly": "selects Balsa flight scale, movement, collision, and hit behavior",
  "level.objects": "selects Balsa-specific object shadow rotation and scaling",
  "level.particles": "selects Balsa-specific particle placement and behavior",
  "level.rideBall": "selects the ride-ball asset and where riding is allowed",
  "level.specialItems": "selects area-specific doors, bricks, posts, and item interactions",
  "level.powerups": "selects Balsa-specific power-up timing and handling",
  "level.trapRanges": "selects the wider Sidewalk firecracker trigger range",
  "level.fileScale": "selects the Park height-map scale adjustment",
  "level.tunnel": "selects Plumbing sewer versus Gutter tunnel loading and movement",
  "level.areaUpdate": "selects which special systems update every frame",
  "level.rendering": "selects view distance, fog, active range, and terrain scale setup",
  "level.lighting": "selects sun direction, fill lights, and ambient lighting",
  "level.autoFade": "selects which level-specific objects use auto-fade",
  "level.levelInit": "selects special counters, enemy setup, and level-start dialogs",
  "level.completion": "selects the line-marker completion and trigger behavior",
  "level.mapPowerup": "selects the Closet paper-map replacement for the map power-up",
};

function getBugdom2BehaviorOptionDescriptions(
  key: string,
): Readonly<Record<string, string>> | undefined {
  const options = bugdom2BehaviorOptions[key];
  const effect = bugdom2BehaviorEffects[key];
  if (!options || !effect) return undefined;

  const labels = bugdom2BehaviorOptionLabels[key];
  return Object.fromEntries(options.map((option) => {
    const label = labels?.[option] ?? getMetadataValueLabel(option);
    const description = option === "source-default"
      ? "Keeps the original game branch for the selected level."
      : `The ${label} option ${effect}.`;
    return [option, description];
  }));
}

function getBugdom2BehaviorControl(key: string): MetadataControl {
  const optionLabels = bugdom2BehaviorOptionLabels[key];
  const optionDescriptions = getBugdom2BehaviorOptionDescriptions(key) ?? {
    "source-default": "Keep the behavior selected by the original level number.",
  };
  return {
    kind: "select",
    options: bugdom2BehaviorOptions[key] ?? ["source-default"],
    ...(optionLabels ? { optionLabels } : {}),
    optionDescriptions,
  };
}

function getBugdom2PresetControl(key: string): MetadataControl {
  const control = getBugdom2BehaviorControl(key);
  if (control.kind !== "select") return control;
  return {
    ...control,
    options: [...control.options, "custom"],
    optionLabels: {
      ...control.optionLabels,
      custom: key === "level.lighting" ? "Custom lighting values" : "Custom rendering values",
    },
    optionDescriptions: {
      ...control.optionDescriptions,
      custom: key === "level.lighting"
        ? "Use the original area lighting as a starting point, then edit the individual light values below."
        : "Use the original area rendering as a starting point, then edit the individual rendering values below.",
    },
  };
}

const ottoOptionDescriptions: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "level.environment": { standard: "Use the ordinary view distance, fog, background color, and lens-flare settings.", blob: "Use the Blob World view distance, fog, background color, and lens-flare settings.", "blob-boss": "Use the Blob Boss view distance, fog, background color, and lens-flare settings.", apocalypse: "Use the Apocalypse view distance, fog, background color, and lens-flare settings.", cloud: "Use the Cloud view distance, fog, background color, and lens-flare settings.", jungle: "Use the Jungle view distance, fog, background color, and lens-flare settings.", "fire-ice": "Use the Fire Ice view distance, fog, background color, and lens-flare settings.", saucer: "Use the Saucer view distance, fog, background color, and lens-flare settings.", "brain-boss": "Use the Brain Boss view distance, fog, background color, and lens-flare settings.", custom: "Use the original level preset as a starting point, then enable individual environment values below as needed." },
  "level.sky": { standard: "Render the ordinary sky and horizon.", apocalypse: "Render the glowing Apocalypse sky and horizon edge." },
  "level.blobDeformation": { none: "Do not add Blob World terrain deformation.", blob: "Add the two ordinary Blob World jello deformations.", "blob-boss": "Add the larger Blob Boss jello deformations." },
  "level.camera": { standard: "Use the ordinary camera height and tracking.", "blob-boss": "Use the lower Blob Boss camera treatment." },
  "level.lighting": {
    standard: "Use the ordinary sun direction, ambient light, and fill-light color.", "blob-boss": "Use the Blob Boss sun direction, ambient light, and fill-light color.", apocalypse: "Use the Apocalypse sun direction, ambient light, and fill-light color.", jungle: "Use the Jungle sun direction, ambient light, and fill-light color.", "jungle-boss": "Use the Jungle Boss sun direction, ambient light, and fill-light color.", "fire-ice": "Use the Fire Ice sun direction, ambient light, and fill-light color.", saucer: "Use the Saucer sun direction, ambient light, and fill-light color.", "brain-boss": "Use the Brain Boss sun direction, ambient light, and fill-light color.", custom: "Use the original level preset as a starting point, then enable individual lighting values below as needed.",
  },
  "level.autoFade": { standard: "Use the ordinary object visibility distance.", "fog-only": "Use the Fog Only visibility distance.", apocalypse: "Use the Apocalypse visibility distance.", saucer: "Use the Saucer visibility distance." },
  "level.player": { "rocket-and-robot": "Start with the normal rocket and robot sequence.", robot: "Start directly with the robot.", saucer: "Start with the saucer." },
  "level.introTiming": { normal: "Use the regular level-name reveal and introduction duration.", short: "Use the shorter Brain Boss level-name reveal and introduction duration." },
  "level.introShips": { standard: "Show the normal group of intro saucers.", saucer: "Show the single ice saucer used by the Saucer intro.", none: "Do not show intro ships." },
  "level.startingFuel": { empty: "Start without fuel, requiring fuel collection before normal flight.", full: "Start with a full fuel tank." },
  "level.rocketScale": { normal: "Use the regular exit-rocket model size.", small: "Use the compact exit-rocket model size." },
  "level.jungleWeapons": { standard: "Create the ordinary weapon set.", jungle: "Create the Jungle weapon set and behavior." },
  "level.flytrapTargeting": { enabled: "Let Venus flytraps acquire and aim at the player.", disabled: "Prevent automatic Jungle Boss flytrap targeting." },
  "level.splineSurface": { "terrain-or-water": "Draw spline items on the world’s terrain or water surface.", flat: "Draw spline items on the fixed Blob Boss surface." },
  "level.blobPlatforms": { standard: "Use ordinary falling-platform handling.", "blob-boss": "Use Blob Boss slime-platform models and heights." },
  "level.transport": { standard: "Use the ordinary transport behavior.", "rocket-sled": "Use the Cloud level rocket-sled presentation and impact behavior." },
  "level.zipLineStyle": { "fire-ice": "Create Fire Ice zip-line posts, ropes, and item setup.", apocalypse: "Create Apocalypse zip-line posts, ropes, and item setup." },
  "level.rocketExitTrigger": { "player-landed": "Make the landing rocket the exit after the player lands.", "tractor-beam-active": "Make the landing rocket the exit while the tractor beam is active." },
  "level.rocketFuel": { required: "Require a full fuel tank before opening the exit door.", "not-required": "Allow the exit door to open without fuel." },
};

const ottoOptionLabels: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "level.environment": { standard: "Standard environment", blob: "Blob World environment", "blob-boss": "Blob Boss environment", apocalypse: "Apocalypse environment", cloud: "Cloud environment", jungle: "Jungle environment", "fire-ice": "Fire Ice environment", saucer: "Saucer environment", "brain-boss": "Brain Boss environment", custom: "Custom environment values" },
  "level.lighting": { standard: "Standard lighting", "blob-boss": "Blob Boss lighting", apocalypse: "Apocalypse lighting", jungle: "Jungle lighting", "jungle-boss": "Jungle Boss lighting", "fire-ice": "Fire Ice lighting", saucer: "Saucer lighting", "brain-boss": "Brain Boss lighting", custom: "Custom lighting values" },
  "level.blobDeformation": { none: "None", blob: "Blob World", "blob-boss": "Blob Boss" },
  "level.introShips": { standard: "Normal intro saucers", saucer: "Single ice saucer", none: "No intro ships" },
  "level.rocketFuel": { required: "Fuel required", "not-required": "Fuel not required" },
};

function getOttoControl(key: string, options: readonly string[]): MetadataControl {
  const descriptions = ottoOptionDescriptions[key] ?? Object.fromEntries(options.map((option) => [
    option,
    option === "source-default"
      ? "Keep the behavior selected by the original level number."
      : `Apply the ${getMetadataValueLabel(option)} setting for this level.`,
  ]));
  return {
    kind: "select",
    options,
    ...(ottoOptionLabels[key] ? { optionLabels: ottoOptionLabels[key] } : {}),
    optionDescriptions: descriptions,
  };
}

export function getRuntimeMetadataRules(game: Game, levelIndex: number): readonly MetadataRule[] {
  switch (game) {
    case Game.BILLY_FRONTIER:
      return [
        editableRule("area.mode", "Activity", "Choose which activity runs for this area. This changes gameplay dispatch and its completion rules, but does not change the area’s terrain, characters, environment, or save slot.", "source-default", "System/Main.c:232-266,445-474; Screens/Infobar.c:176-192", { kind: "select", options: ["source-default", "duel", "shootout", "stampede", "target-practice"], optionDescriptions: billyAreaModeDescriptions }, getBillyAreaMode(levelIndex)),
      ];
    case Game.BUGDOM:
      return [
        rule("level.realId", "Level identity", "System/Main.c:453-456", "resolved"),
        editableRule("level.terrainFamily", "Terrain family", "Choose the ruleset used by enemies, items, liquids, fences, the camera, and rendering. Lawn keeps the ordinary grassy rules; Pond enables water-bug and mosquito behavior; Forest enables forest traps and dragonflies; Hive enables bee and hive rules; Night enables firefly rules; Anthill enables ant, roach, and anthill liquid rules. This does not change the terrain file or level identity.", getBugdomTerrainFamily(levelIndex), "System/Main.c:51-62,305-311; System/File.c:868-904,1081-1088", getMetadataControl("level.terrainFamily"), getBugdomTerrainFamily(levelIndex)),
        editableRule("level.area", "Area variant", "Choose the sub-area rules used inside the selected terrain family. Training, Lawn Area, Beach, Flight, Hive Area, Queen Bee, Ant Hill, and Ant King change the relevant item, enemy, ride, camera, or presentation branches. This does not change the real level number, terrain file, or save progression.", getBugdomArea(levelIndex), "System/Main.c:51-62,305-311; System/File.c:868-904,1081-1088", getMetadataControl("level.area"), getBugdomArea(levelIndex)),
        editableRule("level.flyingBeeSetup", "Flying-bee setup", "Choose whether flying bees use the Hive setup. Hive enables keyed flying-bee activation, Hive-specific bee limits, and the lower Hive spawn height; the original value keeps flying-bee setup tied to the current level. This does not change worker-bee setup, terrain family, or resource identity.", levelIndex === 5 ? "hive" : "source-default", "Enemies/Enemy_Bee_Flying.c:82-111", getMetadataControl("level.flyingBeeSetup"), levelIndex === 5 ? "hive" : "source-default"),
        editableRule("level.workerBeeSetup", "Worker-bee setup", "Choose whether worker bees use the Hive setup. Hive enables keyed worker-bee activation; the original value keeps worker-bee setup tied to the current level. This does not change flying-bee limits, flying-bee height, terrain family, or resource identity.", levelIndex === 5 ? "hive" : "source-default", "Enemies/Enemy_WorkerBee.c:101", getMetadataControl("level.workerBeeSetup"), levelIndex === 5 ? "hive" : "source-default"),
        editableRule("level.beeFlightRegeneration", "Flight bee regeneration", "Choose whether defeated flying bees return during play. Flight enables the regeneration timer used by the Flight level; the original value preserves the level’s existing regeneration rule. This does not control worker bees on the Queen Bee level.", levelIndex === 4 ? "flight" : "source-default", "Enemies/Enemy_Bee_Flying.c:531", getMetadataControl("level.beeFlightRegeneration"), levelIndex === 4 ? "flight" : "source-default"),
        editableRule("level.queenBeeRegeneration", "Queen Bee regeneration", "Choose whether worker bees return after they are defeated. Queen Bee enables the worker-bee regeneration behavior; the original value preserves the current level’s rule. This does not change flying-bee regeneration on the Flight level.", levelIndex === 6 ? "queen-bee" : "source-default", "Enemies/Enemy_WorkerBee.c:624", getMetadataControl("level.queenBeeRegeneration"), levelIndex === 6 ? "queen-bee" : "source-default"),
        editableRule("level.antKing", "Ant King gameplay setup", "Choose whether Ant King initialization is active. Ant King selects the Ant King item, player, and resource setup; the original value keeps the current level’s setup. This does not change the real level number or progression.", levelIndex === 9 ? "ant-king" : "source-default", "System/File.c:1724; Items/Triggers2.c:459; Player/Player_Bug.c:1199", getMetadataControl("level.antKing"), levelIndex === 9 ? "ant-king" : "source-default"),
        editableRule("level.beachNutRegeneration", "Beach nut regeneration", "Choose whether nuts created during the Beach ride can regenerate. Beach prevents those nuts from returning; the original value keeps the current level’s item regeneration rule. This does not control Dragonfly bat attacks or select the terrain resource.", levelIndex === 3 ? "beach" : "source-default", "Items/Triggers.c:273", getMetadataControl("level.beachNutRegeneration"), levelIndex === 3 ? "beach" : "source-default"),
        editableRule("level.dragonflyRide", "Dragonfly ride attacks", "Choose which Dragonfly ride attack pattern is used. Beach spawns bats at the lower Beach height threshold; Flight spawns bats only after the Dragonfly reaches the higher Flight altitude; the original value keeps the current level’s ride pattern. This does not control nut regeneration or select the terrain resource.", levelIndex === 3 ? "beach" : levelIndex === 4 ? "flight" : "source-default", "Ride/DragonFly.c:343-349", getMetadataControl("level.dragonflyRide"), levelIndex === 3 ? "beach" : levelIndex === 4 ? "flight" : "source-default"),
        editableRule("level.splineItems", "Spline item surface", "Choose how hive spline items are placed vertically. Hive applies the flat surface used by hive spline items; the original value preserves the current level’s placement. This does not change spline identity or terrain resources.", levelIndex === 5 ? "hive" : "source-default", "Terrain/SplineItems.c:455", getMetadataControl("level.splineItems"), levelIndex === 5 ? "hive" : "source-default"),
        rule("family.pond", "pond water, mosquito, liquid, and water-bug rules", "Enemies/Enemy_Mosquito.c:289-615; Items/Items.c:406-419; Items/Liquids.c:168-296; Ride/WaterBug.c:63"),
        rule("family.forest", "forest traps, items, dragonfly, and camera rules", "Items/Traps.c:528; Items/Items.c:438-548; Ride/DragonFly.c:78; QD3D/Camera.c:606"),
        rule("family.hive", "hive enemies, items, traps, triggers, and player rules", "Enemies/Enemy_Bee_Flying.c:111; Items/Items2.c:78-831; Items/Traps.c:1150; Items/Triggers.c:244-609; Player/Player_Bug.c:523-831"),
        rule("family.night", "night firefly, item, trigger, and camera rules", "Enemies/Enemy_FireFly.c:84; Items/Items2.c:94-249; Items/Triggers.c:972; QD3D/Camera.c:114"),
        rule("family.lawn", "lawn item, trigger, and renderer rules", "Items/Items.c:158-207; Items/Items2.c:999; Items/Triggers.c:772-969; QD3D/Renderer.c:535"),
        rule("family.anthill", "anthill enemy, item, liquid, and trigger rules", "Enemies/Enemy_Ant.c:650; Enemies/Enemy_Roach.c:567; Items/Items.c:1239; Items/Liquids.c:287-440; Items/Triggers.c:1327"),
        rule("family.indexedTables", "family-indexed file, intro, player, item, fence, and liquid tables", "System/File.c:1176-1341; Screens/LevelIntro.c:113-335; Player/Player_Bug.c:789; Terrain/Fences.c:230-302"),
        rule("family.fenceAvailability", "fence availability mask", "Terrain/Fences.c:230-302"),
        rule("family.liquidAvailability", "liquid availability, texture, tessellation, and height", "Items/Liquids.c:162-440"),
        rule("family.itemMotion", "family-specific item movement and type tables", "Items/Items.c:143-207,406-991,1239; Items/Items2.c:72-831,999"),
        rule("family.enemyTypes", "family-indexed spider and enemy object types", "Enemies/Enemy_Spider.c:145-657; Enemies/Enemy_Mosquito.c:289-615"),
        rule("family.rendering", "cyclorama, lens flare, ceiling, light, fog, and active-range settings", "System/Main.c:453-465,511,551-564; QD3D/Renderer.c:535"),
        rule("family.camera", "night and forest camera behavior", "QD3D/Camera.c:114,606"),
        editableRule("presentation.levelIntro", "Level introduction", "Choose which level-introduction screen is shown. Flight uses the Flight-specific introduction; the original value keeps the introduction selected by the real level. This does not change the Infobar, gameplay resources, save identity, or terminal progression.", levelIndex === 4 ? "flight" : "source-default", "Screens/LevelIntro.c:156-305", getMetadataControl("presentation.levelIntro"), levelIndex === 4 ? "flight" : "source-default"),
        editableRule("presentation.infobar", "Infobar presentation", "Choose which health and status display is shown during play. Flight shows Flight status, Queen Bee shows Queen Bee health, and Ant King shows Ant King health; the original value keeps the Infobar selected by the real level. This does not change the level introduction, gameplay resources, save identity, or terminal progression.", levelIndex === 4 ? "flight" : levelIndex === 6 ? "queen-bee" : levelIndex === 9 ? "ant-king" : "source-default", "Screens/Infobar.c:1199-1220", getMetadataControl("presentation.infobar"), levelIndex === 4 ? "flight" : levelIndex === 6 ? "queen-bee" : levelIndex === 9 ? "ant-king" : "source-default"),
      ];
    case Game.BUGDOM_2:
      return [
        rule("level.id", "Level identity", "Headers/main.h; System/Main.c:270-284", "resolved"),
        editableRule("level.bugdom2Area", "Gameplay area", "Choose the gameplay area whose enemy, item, trap, water, terrain, player, camera, and presentation rules are used. For example, Balsa enables flight-style movement and Park enables its water and animal rules. This does not change the level number, save slot, or indexed asset files.", getBugdom2Area(levelIndex), "Headers/main.h:16-28; System/LoadLevel.c:244-276", getBugdom2AreaControl()),
        editableRule("level.fido", "Fido enemy rules", "Choose whether the Fido-specific tick and flea rules are active. Fido enables the Fido enemy spawn, cleanup, and defeat behavior; the original value preserves the current level’s enemy rules. This does not change terrain or model resources.", "source-default", "Enemies/Enemy_Tick.c:782; Enemies/Enemy_Flea.c:137-900", getBugdom2BehaviorControl("level.fido")),
        rule("level.tunnelStart", levelIndex === 3 || levelIndex === 6 ? "tunnel entry coordinates" : "not applicable", "Player/Player.c:207-236", "derived"),
        editableRule("level.cyclorama", "Cyclorama setup", "Selects the level-specific cyclorama model and placement setup. The original value keeps the current level’s backdrop setup.", "source-default", "Items/Items.c:83-119", getBugdom2BehaviorControl("level.cyclorama")),
        editableRule("level.itemObjects", "Item object models", "Selects the area-specific post and pebble model variants created from terrain items. The original value keeps the current level’s object models.", "source-default", "Items/Items.c:563-632", getBugdom2BehaviorControl("level.itemObjects")),
        editableRule("level.traps", "Trap setup area", "Choose which area’s trap placement and trap models are initialized. Gnome Garden and Sidewalk select their distinct trap layouts and model families; the original value keeps the current level’s trap setup.", "source-default", "Items/Traps.c:97-191", getBugdom2BehaviorControl("level.traps")),
        editableRule("level.water", "Water behavior area", "Choose the water rules used when water starts and updates. Garbage uses the flooding behavior and Park uses its deep-water behavior; the original value keeps the current level’s water rules. This does not replace the authored water resource.", "source-default", "Terrain/Water.c:239-299", getBugdom2BehaviorControl("level.water")),
        editableRule("level.terrain", "Terrain movement", "Choose whether Balsa flight terrain movement is active. Balsa enables the plane-specific terrain movement branch; the original value keeps the current level’s terrain movement. This does not change the terrain resource.", "source-default", "Player/Player_Terrain.c:168; Terrain/Terrain2.c:580", getBugdom2BehaviorControl("level.terrain")),
        editableRule("level.completion", "Completion markers", "Selects how terrain line markers trigger completion or special events. The original value keeps the current level’s marker handling.", "source-default", "Player/Player_Terrain.c:1984-2025", getBugdom2BehaviorControl("level.completion")),
        editableRule("level.player", "Player setup", "Choose Balsa and Garbage player damage/reset handling. Balsa selects plane reset handling and Garbage resets the rising-water state; the original value keeps the current level’s player setup. Tunnel movement is controlled separately by Tunnel behavior.", "source-default", "Player/Player.c:223-236,480-496", getBugdom2BehaviorControl("level.player")),
        editableRule("level.camera", "Camera area", "Choose the camera rules used for the current area. Plumbing and Gutter select tunnel camera framing, while Balsa selects the flight camera; the original value keeps the current level’s camera behavior.", "source-default", "3D/Camera.c:398-410,817", getBugdom2BehaviorControl("level.camera")),
        editableRule("level.intro", "Level intro", "Choose the area-specific intro scene and non-English subtitle timing. The selected area changes the opening presentation only; it does not change gameplay, save identity, or progression.", "source-default", "Screens/MiscScreens.c:157-216", getBugdom2BehaviorControl("level.intro")),
        editableRule("level.infobar", "Infobar", "Choose the area-specific counters and map artwork shown during play. The selected area changes the HUD presentation only; it does not change gameplay, save identity, or progression.", "source-default", "Screens/Infobar.c:297-730", getBugdom2BehaviorControl("level.infobar")),
        editableRule("level.enemyPlant", "Evil plant area", "Choose where evil-plant enemies are enabled. Gnome Garden and Sidewalk enable the corresponding plant behavior; the original value keeps the current level’s enemy setup.", "source-default", "Enemies/Enemy_EvilPlant.c:661", getBugdom2BehaviorControl("level.enemyPlant")),
        editableRule("level.frog", "Frog behavior area", "Choose the frog rules used during play. Park selects fish-eaten behavior and Balsa selects the Balsa frog behavior; the original value keeps the current level’s frog rules.", "source-default", "Enemies/Enemy_Frog.c:68-292", getBugdom2BehaviorControl("level.frog")),
        editableRule("level.snake", "Snake behavior area", "Choose whether Park snake behavior is active. Park enables the fish-eaten snake response; the original value keeps the current level’s snake rules.", "source-default", "Enemies/Enemy_Snake.c:626", getBugdom2BehaviorControl("level.snake")),
        editableRule("level.dragonfly", "Dragonfly behavior area", "Choose the dragonfly rules used during flight and regeneration. Balsa enables those flight-specific rules; the original value keeps the current level’s dragonfly behavior.", "source-default", "Enemies/Enemy_DragonFly.c:125-566", getBugdom2BehaviorControl("level.dragonfly")),
        editableRule("level.objects", "Object shadows", "Selects Balsa-specific shadow rotation and scaling for objects. The original value keeps the current level’s shadow behavior.", "source-default", "System/Objects2.c:533-540", getBugdom2BehaviorControl("level.objects")),
        editableRule("level.particles", "Particle behavior area", "Choose whether Balsa particle behavior is active. Balsa enables its special particle effects; the original value keeps the current level’s particle rules.", "source-default", "Effects/Particles.c:913", getBugdom2BehaviorControl("level.particles")),
        editableRule("level.rideBall", "Ride-ball area", "Choose where the ride ball is enabled. Playroom and Sidewalk select their ride-ball behavior; the original value keeps the current level’s availability. This does not change the ride-ball asset.", "source-default", "Player/RideBall.c:132", getBugdom2BehaviorControl("level.rideBall")),
        editableRule("level.specialItems", "Special item area", "Choose the area-specific branches for special items. Sidewalk, Playroom, Closet, Park, Garbage, and Gnome Garden select their matching item behavior; the original value keeps the current level’s item rules.", "source-default", "Items/Items.c:973-1013,1248", getBugdom2BehaviorControl("level.specialItems")),
        editableRule("level.powerups", "Balsa power-ups", "Selects the Balsa-specific power-up timing and handling. The original value keeps the current level’s Balsa power-up behavior.", "source-default", "Items/Powerups.c:165-531", getBugdom2BehaviorControl("level.powerups")),
        editableRule("level.mapPowerup", "Closet map power-up", "Selects whether the map power-up uses the Closet paper-map behavior. The original value keeps the current level’s map power-up.", "source-default", "Items/Powerups.c:313", getBugdom2BehaviorControl("level.mapPowerup")),
        editableRule("level.trapRanges", "Trap range area", "Choose the trap interaction range. Sidewalk enables its distinct trap-range calculation; the original value keeps the current level’s range.", "source-default", "Items/Traps.c:630", getBugdom2BehaviorControl("level.trapRanges")),
        editableRule("level.fileScale", "Terrain height scale area", "Choose whether Park’s terrain height scale adjustment is used. Park enables the extended terrain-height calculation; the original value keeps the current level’s scale. This does not change the level file identity.", "source-default", "System/File.c:678", getBugdom2BehaviorControl("level.fileScale")),
        editableRule("level.tunnel", "Tunnel area", "Choose the tunnel rules used for loading and movement. Plumbing selects the sewer tunnel and Gutter selects the gutter tunnel; the original value keeps the current level’s tunnel behavior.", "source-default", "System/LoadLevel.c:741-774; Player/Player_Tunnel.c:118-1065", getBugdom2BehaviorControl("level.tunnel")),
        editableRule("level.areaUpdate", "Per-frame area updates", "Choose which area-specific systems update every frame: Gnome Garden sprinklers, Playroom slot cars, Garbage rising water, or Park fog. The original value keeps the current level’s updates.", "source-default", "System/Main.c:463-481", getBugdom2BehaviorControl("level.areaUpdate")),
        ...([3, 6].includes(levelIndex) ? [] : [
          editableRule("level.rendering", "Rendering preset", "Choose the area’s original camera, fog, clear-color, lens-flare, terrain-scale, and field-of-view setup, or choose Custom rendering values to edit those values independently below.", getBugdom2Area(levelIndex), "System/Main.c:599-741", getBugdom2PresetControl("level.rendering"), getBugdom2Area(levelIndex), bugdom2RenderingGroup, "preset"),
          ...getBugdom2RenderingRules(getBugdom2Area(levelIndex)),
          editableRule("level.lighting", "Lighting preset", "Choose the area’s original ambient and directional-light setup, or choose Custom lighting values to edit each light independently below.", getBugdom2Area(levelIndex), "System/Main.c:753-880", getBugdom2PresetControl("level.lighting"), getBugdom2Area(levelIndex), bugdom2LightingGroup, "preset"),
          ...getBugdom2LightingRules(getBugdom2Area(levelIndex)),
        ]),
        editableRule("level.autoFade", "Object auto-fade", "Choose whether the level uses its no-fade object rules for Fido, Balsa, or Closet. The original value keeps the current level’s fade distances.", "source-default", "System/Main.c:909-918", getBugdom2BehaviorControl("level.autoFade")),
        editableRule("level.levelInit", "Level initialization", "Choose the area-specific counters, enemy setup, and special opening dialogs initialized at level start. The original value keeps the current level’s initialization.", "source-default", "System/Main.c:965-1000", getBugdom2BehaviorControl("level.levelInit")),
        rule("level.sentinel", "title-screen -1 sentinel is excluded from gameplay tables", "Items/Items2.c:237; Skeleton/SkeletonAnim.c:300-307"),
        rule("level.fileBounds", "saved level must be below NUM_LEVELS", "System/File.c:1292", "resolved"),
      ];
    case Game.CRO_MAG:
      return [
        rule("track.id", "Track identity", "System/Main.c:112-119", "resolved"),
        editableRule("track.mode", "Track rules", "Selects race or battle scoring and lap-timing rules. The original game mode is the default; this does not change the track's asset identity or progression slot.", "source-default", "Screens/RaceTimes.c:29-42; Screens/SelectTrack.c:194-205", { kind: "select", options: ["source-default", "race", "battle"], optionLabels: { "source-default": "Original game mode", race: "Race scoring", battle: "Battle scoring" }, optionDescriptions: croMagOptionDescriptions["track.mode"] }),
        editableRule("track.waterAnimation", "Water animation", "Selects how water surfaces move during play. This does not create water patches or change their heights.", levelIndex === 1 || levelIndex === 3 ? "scroll-both" : levelIndex === 5 ? "scroll-v" : "none", "Terrain/Liquids.c:196-213", { kind: "select", options: ["none", "scroll-both", "scroll-v"], optionLabels: { none: "No water animation", "scroll-both": "Scroll horizontally and vertically", "scroll-v": "Scroll vertically" }, optionDescriptions: croMagOptionDescriptions["track.waterAnimation"] }),
        editableRule("track.surfaceEffects", "Surface effects", "Controls whether snow particles are emitted each frame. This does not change terrain collision or the track resource.", levelIndex === 2 || levelIndex === 16 ? "snow" : "none", "System/Main.c:1184-1188", { kind: "select", options: ["none", "snow"], optionLabels: { none: "No snow particles", snow: "Emit snow particles" }, optionDescriptions: croMagOptionDescriptions["track.surfaceEffects"] }),
        editableRule("track.vehicle", "Player vehicle", "Selects the player vehicle setup. This does not change vehicle availability in the pre-race selection screen or scoreboard identity.", levelIndex === 8 ? "submarine" : "car", "Player/Player.c:204-211; Player/Player_Car.c:312-316", { kind: "select", options: ["car", "submarine"], optionLabels: { car: "Car", submarine: "Submarine" }, optionDescriptions: croMagOptionDescriptions["track.vehicle"] }),
        editableRule("track.music", "Music", "Selects the soundtrack family played when the track starts. This does not change track assets, records, or progression.", getCroMagMusic(levelIndex), "System/Main.c:1191-1212", { kind: "select", options: ["desert", "jungle", "atlantis", "china", "egypt", "crete", "ice", "europe", "viking"], optionLabels: { desert: "Desert soundtrack", jungle: "Jungle soundtrack", atlantis: "Atlantis soundtrack", china: "China soundtrack", egypt: "Egypt soundtrack", crete: "Crete soundtrack", ice: "Ice soundtrack", europe: "Europe soundtrack", viking: "Viking soundtrack" }, optionDescriptions: croMagOptionDescriptions["track.music"] }),
        editableRule("track.lighting", "Lighting preset", "Choose the original track lighting preset, or choose Custom lighting values to edit the directional light, ambient light, and fill color below.", levelIndex === 2 ? "ice" : levelIndex === 8 ? "atlantis" : "standard", "System/Main.c:1216-1248", { kind: "select", options: ["standard", "ice", "atlantis", "custom"], optionLabels: { standard: "Standard lighting", ice: "Ice lighting", atlantis: "Atlantis lighting", custom: "Custom lighting values" }, optionDescriptions: { ...croMagOptionDescriptions["track.lighting"], custom: "Use the original track lighting as a starting point, then edit each lighting value below." } }, levelIndex === 2 ? "ice" : levelIndex === 8 ? "atlantis" : "standard", croMagLightingGroup, "preset"),
        ...getCroMagLightingRules(levelIndex === 2 ? "ice" : levelIndex === 8 ? "atlantis" : "standard"),
        editableRule("track.sky", "Sky color preset", "Choose the original clear color behind the track’s sky dome, or choose Custom sky color to edit its red, green, and blue channels below.", getCroMagSky(levelIndex), "System/Main.c:1251-1280", { kind: "select", options: ["desert", "jungle", "ice", "crete", "china", "egypt", "europe", "scandinavia", "atlantis", "aztec", "coliseum", "custom"], optionLabels: { desert: "Desert sky", jungle: "Jungle sky", ice: "Ice sky", crete: "Crete sky", china: "China sky", egypt: "Egypt sky", europe: "Europe sky", scandinavia: "Scandinavia sky", atlantis: "Atlantis sky", aztec: "Aztec sky", coliseum: "Coliseum sky", custom: "Custom sky color" }, optionDescriptions: { ...croMagOptionDescriptions["track.sky"], custom: "Use the original track sky color as a starting point, then edit its color channels below." } }, getCroMagSky(levelIndex), croMagSkyGroup, "preset"),
        ...getCroMagSkyRules(getCroMagSky(levelIndex)),
        editableRule("track.liquidMaterial", "Liquid material", "Selects whether vehicle wheel debris uses water spray or the Tar Pits material behavior.", levelIndex === 14 ? "tar" : "water", "Player/Player_Car.c:3637-3640", { kind: "select", options: ["water", "tar"], optionLabels: { water: "Water spray", tar: "Tar spray" }, optionDescriptions: croMagOptionDescriptions["track.liquidMaterial"] }),
        editableRule("track.campfire", "Campfire type", "Selects the campfire model used by the shared campfire terrain item.", levelIndex === 2 ? "ice" : "scandinavia", "Items/Triggers.c:1076", { kind: "select", options: ["ice", "scandinavia"], optionLabels: { ice: "Ice campfire", scandinavia: "Scandinavia campfire" }, optionDescriptions: croMagOptionDescriptions["track.campfire"] }),
        editableRule("track.startLineCollision", "Starting-line collision", "Selects the collision boxes used by the starting-line object. This does not change the track model or authored start positions.", levelIndex === 3 ? "crete" : levelIndex === 8 ? "none" : levelIndex === 1 ? "jungle" : "standard", "Items/Items.c:150-263", { kind: "select", options: ["standard", "crete", "jungle", "none"], optionLabels: { standard: "Standard bridge collision", crete: "Crete rotated collision", jungle: "Jungle obstacle-avoidance collision", none: "No collision (Atlantis default)" }, optionDescriptions: croMagOptionDescriptions["track.startLineCollision"] }),
        editableRule("track.startLineMovement", "Starting-line movement", "Selects whether the starting-line object stays still or uses Atlantis movement. This does not change its collision boxes, track model, or authored start positions.", levelIndex === 8 ? "atlantis" : "standard", "Items/Items.c:150-263,269-284", { kind: "select", options: ["standard", "atlantis"], optionLabels: { standard: "Stationary", atlantis: "Atlantis moving start line" }, optionDescriptions: croMagOptionDescriptions["track.startLineMovement"] }),
        editableRule("track.objectTint", "Boat color", "Selects the blue underwater color filter applied to Atlantis boat objects. This does not change the boat model or collision.", levelIndex === 8 ? "underwater" : "standard", "Items/Items.c:681-687", { kind: "select", options: ["standard", "underwater"], optionLabels: { standard: "Normal boat color", underwater: "Underwater blue tint" }, optionDescriptions: croMagOptionDescriptions["track.objectTint"] }),
        rule("track.liquids", "track water heights and liquid behavior", "Terrain/Liquids.c:118-296"),
        rule("track.triggers", "Ice campfire and track-specific triggers", "Items/Triggers.c:1046"),
        rule("track.objects", "track-indexed object tables and type parameters", "Items/Items.c:297-356,459-575,635-740,702-719,1066-1072,1223-1320"),
        rule("track.player", "Atlantis and Tar Pits player/car behavior", "Player/Player.c:204; Player/Player_Car.c:302-3205,3478"),
        rule("track.vehicleSelection", "Atlantis vehicle exclusion", "Screens/SelectVehicle.c:137"),
        rule("track.progression", "Atlantis progression and per-track startup", "System/Main.c:408,1122-1357"),
        rule("track.presentation", "track map, records, and localized names", "Screens/Infobar.c:425,1754,1908"),
        rule("track.raceRecords", "track-indexed race records and today's records", "Screens/RaceTimes.c:132,199"),
        rule("track.modeRules", "practice, tournament, capture-the-flag, tag, survival, and multiplayer rules", "Screens/SelectTrack.c:93,194,295; Screens/Infobar.c:574-769; Terrain/Checkpoints.c:66-370; System/Main.c:196,1461"),
        rule("track.loader", "track model and terrain resources", "System/File.c:783-917"),
        rule("track.bounds", "track must be below NUM_TRACKS", "System/File.c:783-849", "resolved"),
      ];
    case Game.MIGHTY_MIKE:
      return [
        rule("scene.id", String(Math.floor(levelIndex / 3)), "Heart/Main.c:224-248", "resolved"),
        rule("area.id", String(levelIndex % 3), "Heart/Main.c:224-248", "resolved"),
        rule("scene.map", "scene/area map resource", "Heart/Main.c:247-248"),
        editableRule("scene.sound", "Music and sound set", "Choose which world’s music and sound-effect tables play. Jurassic, Candy, Fairy, Clown, and Bargain select the matching scene soundtrack and effects; the original value keeps the current scene’s set. This does not change the map or area identity.", mightyMikeSceneValue(levelIndex), "Drivers/Sound.c:561-591", getMetadataControl("scene.sound")),
        editableRule("scene.cinema", "World-map cinema", "Choose which scene’s world-map cinema and transition presentation is shown. The selected world changes the movie, camera path, and transition timing; the original value keeps the current scene’s presentation. This does not change area completion or save identity.", mightyMikeSceneValue(levelIndex), "Heart/Cinema.c:405,1160-1221", getMetadataControl("scene.cinema")),
        rule("scene.tables", "scene/area coordinate and bunny-count table entries", "Heart/Cinema.c:1128-1137,1649"),
        editableRule("scene.infobar", "Infobar display set", "Choose which world’s key icons, status art, and Infobar labels are displayed. The selected world changes presentation only; map collision, area identity, and progression remain unchanged.", mightyMikeSceneValue(levelIndex), "Heart/Infobar.c:464-497", getMetadataControl("scene.infobar")),
        editableRule("scene.bonus", "Bonus-screen behavior", "Choose which world’s bonus-screen rules run, including its bonus objects and scoring presentation. The original value keeps the current scene’s rules and completion state.", mightyMikeSceneValue(levelIndex), "Misc/Bonus.c:355-448", getMetadataControl("scene.bonus")),
        editableRule("scene.progression", "Progression presentation", "Choose which world’s progression presentation and terminal-screen rules are used. This changes the transition and ending presentation only; area and save bounds remain fixed.", mightyMikeSceneValue(levelIndex), "Heart/Cinema.c:1710-1724", getMetadataControl("scene.progression")),
        editableRule("scene.bunnyCounts", "Bunny-count rules", "Choose which world’s scene table supplies bunny-count persistence and display values. The current area index and map identity remain unchanged.", mightyMikeSceneValue(levelIndex), "Misc/Bonus.c:261; Heart/Cinema.c:1649", getMetadataControl("scene.bunnyCounts")),
        editableRule("scene.weaponUnlocks", "Bonus weapon unlocks", "Choose which world’s bonus weapon unlock rules are used. The selected world changes which bonus weapons become available; scene and area identity remain unchanged.", mightyMikeSceneValue(levelIndex), "Misc/Bonus.c:517", getMetadataControl("scene.weaponUnlocks")),
        editableRule("area.traps", "Trap enemy behavior", "Choose which enemy an appear-zone trap spawns. This does not change keyed-door sounds or other trap placement.", mightyMikeSceneValue(levelIndex), "Misc/Traps.c:99-123", getMetadataControl("area.traps")),
        editableRule("area.doors", "Door sound", "Choose the sound played when a keyed door opens. This does not change the key requirement, door animation, or trap enemy spawning.", mightyMikeSceneValue(levelIndex), "Misc/Triggers.c:507-533", getMetadataControl("area.doors")),
        editableRule("area.character", "Character transformations", "Choose the scene-specific player transformations, including becoming a spaceship in Bargain Bin and becoming a frog after a Fairy Tale witch hit. This does not change enemy-bullet handling.", mightyMikeSceneValue(levelIndex), "MeAndMo/MyGuy.c:1284-1306", getMetadataControl("area.character")),
        editableRule("area.projectiles", "Enemy projectile behavior", "Choose what happens when an enemy bullet hits the player: normal deletion, Clown pass-through, or Fairy poison-apple vaporization. This does not change player transformations.", mightyMikeSceneValue(levelIndex), "MeAndMo/MyGuy.c:1320-1338", getMetadataControl("area.projectiles")),
        rule("area.tables", "shape, coordinate, and bunny-count tables", "Heart/Cinema.c:1128-1137,1649"),
        rule("identity.bounds", "scene < MAX_SCENES and area < 3", "Heart/Main.c:224-248", "resolved"),
      ];
    case Game.NANOSAUR:
      return [
        auditRule("level.id", "Level identity", "Identifies the one playable Nanosaur 1 level. This is not selectable; the default is Level 1 (slot 0), and other values are rejected.", "0", "Headers/main.h:6-8"),
        auditRule("level.art", "Level 1 art resources", "Loads the art resources associated with Nanosaur 1's only level. This is read-only because there is no alternate Nanosaur 1 art set. Default: Level 1 art.", "Level 1 art", "System/Main.c:181; System/File.c:761"),
        auditRule("level.terrain", "Level 1 terrain resources", "Loads the Level1.ter terrain and Level1.trt tile resources. This is read-only because they define the single playable level. Default: Level 1 terrain.", "Level 1 terrain", "System/Main.c:181; System/File.c:761"),
        auditRule("level.playerStart", "Player starting point", "The player starts at the terrain's start-coordinate item. Edit that item in the Items tab; Meta does not override it. Default: the terrain start-coordinate item.", "Terrain start-coordinate item", "System/File.c:720-727; Terrain/Terrain2.c:161-184; Player/MyGuy.c:97-113"),
        auditRule("level.itemState", "Terrain item and egg state", "Eggs and terrain objects use state stored in the level's item data. Edit those items in the Items tab; Meta does not duplicate or override them. Default: the level item data.", "Level item data", "Terrain/Terrain2.c:190-241; Items/TimePortal.c:64-71,274-277"),
        auditRule("level.unsupported", "Unavailable game systems", "Nanosaur 1 has no native fence, water-body, or spline systems. There is no setting to enable them. Default: unavailable.", "Fences, water bodies, and splines unavailable", "Headers/main.h:5-8; Headers/terrain.h:14; Headers/terrain.h:221-222; System/File.c:761-778"),
      ];
    case Game.NANOSAUR_2:
      return [
        rule("level.id", "Level identity", "Headers/main.h; System/Main.c:192-242", "resolved"),
        rule("level.mainDispatch", "level loop, new-game, Adventure 3, and transition switches", "System/Main.c:192-242,343-492"),
        editableRule("level.mode", "Gameplay mode", "Choose how this level is played. Adventure is exploration, Race uses checkpoints and finishing order, Battle is player-versus-player combat, and Capture the Flag is team flag play. This changes gameplay rules, not the level’s terrain or map file.", levelIndex < 3 ? "adventure" : levelIndex < 5 ? "race" : levelIndex < 7 ? "battle" : "capture-the-flag", "System/Main.c:343-492", getNanosaur2Control("level.mode", ["adventure", "race", "battle", "capture-the-flag"])),
        editableRule("level.biome", "Environment", "Choose the environment theme used by the level’s terrain-art setup and shared environmental assets. Forest, Desert, and Swamp select the corresponding environment family. This does not change the map image, terrain file, or scenery item models; those are controlled separately below.", [0, 5, 8].includes(levelIndex) ? "forest" : [1, 4, 6].includes(levelIndex) ? "desert" : "swamp", "System/LoadLevel.c:70-180", getNanosaur2Control("level.biome", ["forest", "desert", "swamp"])),
        editableRule("level.mapView", "Map framing", "Choose which built-in overhead-map framing and zoom the Infobar uses. For example, choosing Race 1 uses the Race 1 framing. This changes the view window only—not the map image, terrain file, level number, or saved progression.", ["level1", "level2", "level3", "race1", "race2", "flag1", "flag2", "battle1", "battle2"][levelIndex] ?? "level1", "Screens/Infobar.c:951-1070", getNanosaur2Control("level.mapView", ["level1", "level2", "level3", "race1", "race2", "flag1", "flag2", "battle1", "battle2"])),
        editableRule("level.items", "Scenery and item set", "Choose the shared item-family models used by grass, rocks, air mines, turrets, and Forest Doors. Forest, Desert, and Swamp select a matching loaded model family; these model choices intentionally stay together so item constructors use the same resource bundle. Item-specific mine placement, turret range, and door motion are separate settings below.", [0, 5, 8].includes(levelIndex) ? "forest" : [1, 4, 6].includes(levelIndex) ? "desert" : "swamp", "Items/Bushes.c:57; Items/Items.c:204; Items/Mines.c:57-262; Items/Turrets.c:57-234; Items/ForestDoor.c:64-188", getNanosaur2Control("level.items", ["forest", "desert", "swamp"])),
        editableRule("level.minePlacement", "Mine placement", "Choose the biome-specific offsets for the mine chain and its light position. Forest uses the shorter Forest mine-chain offsets; Standard follows the level’s original Desert or Swamp placement. This does not change the mine model family or broader scenery and item set.", [0, 5, 8].includes(levelIndex) ? "forest" : "standard", "Items/Mines.c:235-256", getNanosaur2Control("level.minePlacement", ["standard", "forest"])),
        editableRule("level.doorMotion", "Forest Door motion", "Choose whether an opening Forest Door stops at its open position or continues spinning. Continuous keeps the door spinning after it opens; Limited clamps it at the open position. This changes door animation only.", levelIndex === 2 ? "continuous" : "limited", "Items/ForestDoor.c:64-188", getNanosaur2Control("level.doorMotion", ["limited", "continuous"])),
        editableRule("level.turretRange", "Turret firing range", "Choose how close the player must be before a turret fires. Adventure 1 reduces the firing distance to two-thirds of normal; Standard uses the full range. This changes turret targeting only.", levelIndex === 0 ? "adventure1" : "standard", "Items/Turrets.c:57-234", getNanosaur2Control("level.turretRange", ["standard", "adventure1"])),
        editableRule("level.flightHeight", "Maximum flight altitude", "Choose the player’s flight ceiling. Adventure 1 caps flight at terrain height plus its altitude allowance; Standard allows the normal maximum altitude. This does not change race checkpoints.", levelIndex === 0 ? "adventure1" : "standard", "Player/Player.c:1174", getNanosaur2Control("level.flightHeight", ["standard", "adventure1"])),
        editableRule("level.raceMarkers", "Race line markers", "Choose how crossed terrain line markers are handled. Race treats them as checkpoints and updates race progress; Standard uses ordinary line-marker handling. This does not change the selected gameplay mode.", levelIndex === 3 || levelIndex === 4 ? "race" : "standard", "Player/Player_Terrain.c:768", getNanosaur2Control("level.raceMarkers", ["standard", "race"])),
        editableRule("level.intro", "Save-game continuation menu", "Choose which continuation label is shown after saving: None hides both level-transition labels, Level 1 shows the “Entering Level 2” option, and Level 2 shows the “Entering Level 3” option. This affects the menu only—not level identity or progression.", levelIndex === 1 ? "level1" : levelIndex === 2 ? "level2" : "none", "Screens/LevelIntro.c:604", getNanosaur2Control("level.intro", ["none", "level1", "level2"])),
        editableRule("level.rendering", "Rendering preset", "Choose the Forest, Desert, or Swamp visual preset for the level’s visual atmosphere, or choose Custom rendering values to edit the clear color, fog, ambient light, directional light, fill color, and lens flare independently below.", [0, 5, 8].includes(levelIndex) ? "forest" : [1, 4, 6].includes(levelIndex) ? "desert" : "swamp", "System/Main.c:446-492", getNanosaur2PresetControl("level.rendering", ["forest", "desert", "swamp"]), [0, 5, 8].includes(levelIndex) ? "forest" : [1, 4, 6].includes(levelIndex) ? "desert" : "swamp", nanosaur2RenderingGroup, "preset"),
        ...getNanosaur2RenderingRules([0, 5, 8].includes(levelIndex) ? "forest" : [1, 4, 6].includes(levelIndex) ? "desert" : "swamp"),
        rule("level.persistence", "Level file and save identity", "System/File.c:1269"),
        rule("level.bounds", "Level bounds check", "System/Main.c:192-242; System/LoadLevel.c:70-180", "resolved"),
      ];
    case Game.OTTO_MATIC:
      return [
        auditRule("level.id", "Level identity (read-only)", "Identifies which original Otto Matic level resource is open. It stays tied to the level slot so authored assets, saves, and progression remain safe; behavior settings below can be overridden independently.", "Selected level resource", "Headers/main.h; System/GameMain.c:175-226"),
        auditRule("level.assetIdentity", "Level assets (read-only)", "The original level chooses its terrain, models, textures, skeletons, and other indexed assets. These resources are kept with the level identity because selecting another asset set could make item data unsafe.", "Original level asset set", "System/File.c:627-936"),
        editableRule("level.gravity", "Gravity", "Controls the downward acceleration used by the player and robot movement. Higher numbers make jumps fall faster; this setting does not change model scale or spline-human movement.", levelIndex === 2 ? "3900" : "5200", "System/GameMain.c:781-816; System/GameMain.c:872-874", { kind: "slider", min: 0, max: 8000, step: 100, gameValues: [{ value: 5200, label: "Normal gravity" }, { value: 3900, label: "Blob Boss low gravity" }] }),
        editableRule("level.tileSlipperiness", "Terrain slipperiness", "Controls how much the terrain reduces steering traction. Zero is the normal surface; the Blob World uses 0.10, which makes the ground more slippery.", levelIndex === 1 ? "0.1" : "0.0", "System/GameMain.c:781-788; System/GameMain.c:872-874", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0, label: "Normal terrain" }, { value: 0.1, label: "Blob World" }] }),
        editableRule("level.environment", "Environment preset", "Choose a named environment preset for the view distance, fog treatment, background color, and lens-flare treatment. The individual values below are read-only for named presets; choose Custom environment values to edit them independently.", getOttoEnvironmentProfile(levelIndex), "System/GameMain.c:559-663", getOttoControl("level.environment", ["standard", "blob", "blob-boss", "apocalypse", "cloud", "jungle", "fire-ice", "saucer", "brain-boss", "custom"]), getOttoEnvironmentProfile(levelIndex), ottoEnvironmentGroup, "preset"),
        editableRule("level.environmentViewDistance", "View distance", "Controls the camera’s far clipping distance as a multiplier of the normal world range. A value of 0.60 shows a shorter view, while 1.00 uses the ordinary range. This changes visibility distance only; it does not change fog color or terrain scale.", String(getOttoEnvironmentDefaults(levelIndex).viewDistance), "System/GameMain.c:559-663", { kind: "slider", min: 0.5, max: 1.1, step: 0.01, gameValues: [{ value: 0.6, label: "Blob World" }, { value: 0.7, label: "Blob Boss and Brain Boss" }, { value: 0.8, label: "Saucer" }, { value: 1, label: "Normal range" }] }, String(getOttoEnvironmentDefaults(levelIndex).viewDistance), ottoEnvironmentGroup, "determined"),
        editableRule("level.environmentBackgroundR", "Background red", "Controls the red channel of the cleared view background. Values range from 0.00 to 1.00. This changes the background color only; it does not recolor terrain or lighting.", String(getOttoEnvironmentDefaults(levelIndex).background[0]), "System/GameMain.c:559-663", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0, label: "Apocalypse and Fire Ice" }, { value: 0.1, label: "Standard and Brain Boss" }, { value: 0.17, label: "Blob Boss" }, { value: 0.2, label: "Saucer" }, { value: 0.6, label: "Jungle" }, { value: 0.686, label: "Cloud" }, { value: 0.8, label: "Blob World" }] }, String(getOttoEnvironmentDefaults(levelIndex).background[0]), ottoEnvironmentGroup, "determined"),
        editableRule("level.environmentBackgroundG", "Background green", "Controls the green channel of the cleared view background. Values range from 0.00 to 1.00. This changes the background color only; it does not recolor terrain or lighting.", String(getOttoEnvironmentDefaults(levelIndex).background[1]), "System/GameMain.c:559-663", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0, label: "Apocalypse, Fire Ice, and Brain Boss" }, { value: 0.05, label: "Blob Boss" }, { value: 0.137, label: "Cloud" }, { value: 0.4, label: "Saucer" }, { value: 0.5, label: "Standard" }, { value: 0.6, label: "Blob World and Jungle" }] }, String(getOttoEnvironmentDefaults(levelIndex).background[1]), ottoEnvironmentGroup, "determined"),
        editableRule("level.environmentBackgroundB", "Background blue", "Controls the blue channel of the cleared view background. Values range from 0.00 to 1.00. This changes the background color only; it does not recolor terrain or lighting.", String(getOttoEnvironmentDefaults(levelIndex).background[2]), "System/GameMain.c:559-663", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0, label: "Apocalypse and Fire Ice" }, { value: 0.1, label: "Standard and Brain Boss" }, { value: 0.29, label: "Blob Boss" }, { value: 0.3, label: "Jungle" }, { value: 0.431, label: "Cloud" }, { value: 0.7, label: "Saucer" }, { value: 0.8, label: "Blob World" }] }, String(getOttoEnvironmentDefaults(levelIndex).background[2]), ottoEnvironmentGroup, "determined"),
        editableRule("level.environmentLensFlare", "Sun lens flare", "Controls whether the sun lens flare is drawn in the 3D view. This is a presentation effect only; it does not change the sun direction or lighting of objects.", String(getOttoEnvironmentDefaults(levelIndex).lensFlare), "System/GameMain.c:559-663; 3D/Camera.c:73-84", { kind: "checkbox" }, String(getOttoEnvironmentDefaults(levelIndex).lensFlare), ottoEnvironmentGroup, "determined"),
        editableRule("level.sky", "Sky and horizon", "Choose the sky and horizon treatment. Standard renders the ordinary sky; Apocalypse renders its glowing sky and horizon edge behavior. This changes the background appearance, not terrain collision or level identity.", levelIndex === 3 ? "apocalypse" : "standard", "Effects/Sky.c:82-252", getOttoControl("level.sky", ["standard", "apocalypse"])),
        editableRule("level.cloudTwoSidedTerrain", "Two-sided Cloud terrain", "Keeps both sides of Cloud scaffolding polygons visible. This is a rendering choice only; it does not enable Cloud pits, cannons, or power-ups.", levelIndex === 4 ? "true" : "false", "Terrain/Terrain.c:164-174", { kind: "checkbox" }),
        editableRule("level.cloudBlankTiles", "Cloud blank-tile pits", "Treats blank Cloud terrain tiles as bottomless pits when calculating the terrain surface. This is separate from the enemy and player pit responses below.", levelIndex === 4 ? "true" : "false", "Terrain/Terrain.c:1325-1338", { kind: "checkbox" }),
        editableRule("level.cloudPits", "Cloud bottomless pits", "Enables the Cloud bottomless-pit checks used by enemies and the robot player. It does not change terrain rendering or cannon entry.", levelIndex === 4 ? "true" : "false", "Enemies/Enemy.c:311-323; Player/Player_Robot.c:1218-1229; Player/Player_Robot.c:2872-2878", { kind: "checkbox" }),
        editableRule("level.cloudCannon", "Cloud cannon entry", "Allows the player to enter a Cloud cannon when jumping near its entry point. It does not enable the Cloud terrain or electric-floor damage by itself.", levelIndex === 4 ? "true" : "false", "Player/Player_Robot.c:2860-2880", { kind: "checkbox" }),
        editableRule("level.cloudBalloonPowerups", "Cloud balloon power-ups", "Allows balloon power-up items to be created. Keep this enabled only when the level’s item data contains Cloud balloon items, because other levels do not have the required Cloud model resources.", levelIndex === 4 ? "true" : "false", "Items/Powerups.c:1643-1650", { kind: "checkbox" }),
        editableRule("level.cloudTransparentBlack", "Transparent black Cloud textures", "Treats black pixels as transparent while converting level textures. This is an asset-conversion option for Cloud scaffolding textures, not a terrain-collision setting.", levelIndex === 4 ? "true" : "false", "System/File.c:1702-1712", { kind: "checkbox" }),
        editableRule("level.fences", "Fence post sinking", "When enabled, fence posts are adjusted to the level’s normal terrain height. Disable it for levels whose fences must keep their authored vertical position.", levelIndex === 4 || levelIndex === 8 ? "false" : "true", "Terrain/Fences.c:314", { kind: "checkbox" }),
        editableRule("level.saucers", "Alien saucer encounters", "Allows the game to create enemy flying-saucer encounters. This is separate from Player type: changing it does not turn the player into a saucer or alter Human spline movement.", levelIndex === 2 || levelIndex === 8 || levelIndex === 9 ? "false" : "true", "Enemies/Saucer.c:85", { kind: "checkbox" }),
        editableRule("level.blobEffects", "Blob World animated effects", "Animates the Blob World bubble and arrow textures during play. This does not create Blob terrain deformation or Blob Boss systems.", levelIndex === 1 ? "true" : "false", "System/GameMain.c:491-496", { kind: "checkbox" }),
        editableRule("level.blobBossEffects", "Blob Boss animated effects", "Animates the Blob Boss platform and pipe textures and rotates its spinning platform. This does not create the boss machine or deformation by itself.", levelIndex === 2 ? "true" : "false", "System/GameMain.c:498-510", { kind: "checkbox" }),
        editableRule("level.cloudEffects", "Cloud animated effects", "Updates the Cloud zig-zag slats each frame. This does not enable Cloud terrain, cannons, or bumper cars.", levelIndex === 4 ? "true" : "false", "System/GameMain.c:512-514", { kind: "checkbox" }),
        editableRule("level.camera", "Camera behavior", "Choose the camera height and tracking rules. Standard uses the ordinary camera; Blob Boss uses the lower camera treatment for that world. This changes the view, not player movement or level resources.", levelIndex === 2 ? "blob-boss" : "standard", "3D/Camera.c:246-297; System/GameMain.c:443-527", getOttoControl("level.camera", ["standard", "blob-boss"])),
        editableRule("level.lighting", "Lighting preset", "Choose a named lighting preset for the sun direction, ambient light, and fill-light color. The individual values below are read-only for named presets; choose Custom lighting values to edit them independently.", getOttoLightingProfile(levelIndex), "System/GameMain.c:671-790", getOttoControl("level.lighting", ["standard", "blob-boss", "apocalypse", "jungle", "jungle-boss", "fire-ice", "saucer", "brain-boss", "custom"]), getOttoLightingProfile(levelIndex), ottoLightingGroup, "preset"),
        editableRule("level.lightingSunX", "Sun direction — horizontal", "Controls the horizontal component of the normalized world-light direction. The game normalizes the three sun-direction components together; changing this value changes the direction of object shading and the lens-flare source.", String(getOttoLightingDefaults(levelIndex).sunDirection[0]), "System/GameMain.c:671-790", { kind: "slider", min: -1, max: 1, step: 0.01, gameValues: [{ value: 0.5, label: "Most standard worlds" }, { value: 0.1, label: "Jungle Boss" }, { value: -0.5, label: "Brain Boss" }] }, String(getOttoLightingDefaults(levelIndex).sunDirection[0]), ottoLightingGroup, "determined"),
        editableRule("level.lightingSunY", "Sun direction — vertical", "Controls the vertical component of the normalized world-light direction. Negative values place the light above the world; the game normalizes the three components together.", String(getOttoLightingDefaults(levelIndex).sunDirection[1]), "System/GameMain.c:671-790", { kind: "slider", min: -1, max: 1, step: 0.01, gameValues: [{ value: -0.35, label: "Standard and Blob Boss" }, { value: -0.6, label: "Apocalypse" }, { value: -0.8, label: "Jungle" }, { value: -1, label: "Fire Ice" }] }, String(getOttoLightingDefaults(levelIndex).sunDirection[1]), ottoLightingGroup, "determined"),
        editableRule("level.lightingSunZ", "Sun direction — depth", "Controls the depth component of the normalized world-light direction. The game normalizes the three components together; changing this value changes which side of objects receives the world light.", String(getOttoLightingDefaults(levelIndex).sunDirection[2]), "System/GameMain.c:671-790", { kind: "slider", min: -1, max: 1, step: 0.01, gameValues: [{ value: 0.8, label: "Standard, Jungle, and Brain Boss" }, { value: -0.8, label: "Saucer" }, { value: -1, label: "Jungle Boss" }, { value: 0, label: "Fire Ice" }] }, String(getOttoLightingDefaults(levelIndex).sunDirection[2]), ottoLightingGroup, "determined"),
        editableRule("level.lightingAmbientR", "Ambient light — red", "Controls the red channel of the world’s ambient light. Values range from 0.00 to 1.00 and affect the base light on shaded objects, not the view background.", String(getOttoLightingDefaults(levelIndex).ambient[0]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.2, label: "Blob Boss and Apocalypse" }, { value: 0.3, label: "Jungle and boss worlds" }, { value: 0.4, label: "Standard" }] }, String(getOttoLightingDefaults(levelIndex).ambient[0]), ottoLightingGroup, "determined"),
        editableRule("level.lightingAmbientG", "Ambient light — green", "Controls the green channel of the world’s ambient light. Values range from 0.00 to 1.00 and affect the base light on shaded objects, not the view background.", String(getOttoLightingDefaults(levelIndex).ambient[1]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.2, label: "Blob Boss and Apocalypse" }, { value: 0.25, label: "Saucer" }, { value: 0.3, label: "Jungle and boss worlds" }, { value: 0.4, label: "Standard" }] }, String(getOttoLightingDefaults(levelIndex).ambient[1]), ottoLightingGroup, "determined"),
        editableRule("level.lightingAmbientB", "Ambient light — blue", "Controls the blue channel of the world’s ambient light. Values range from 0.00 to 1.00 and affect the base light on shaded objects, not the view background.", String(getOttoLightingDefaults(levelIndex).ambient[2]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.2, label: "Blob Boss and Apocalypse" }, { value: 0.25, label: "Saucer" }, { value: 0.3, label: "Jungle and boss worlds" }, { value: 0.36, label: "Standard" }] }, String(getOttoLightingDefaults(levelIndex).ambient[2]), ottoLightingGroup, "determined"),
        editableRule("level.lightingFillR", "Fill light — red", "Controls the red channel of the single fill light applied to world geometry. Values range from 0.00 to 1.00; this does not change ambient light or the sun direction.", String(getOttoLightingDefaults(levelIndex).fillColor[0]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.6, label: "Apocalypse" }, { value: 0.7, label: "Fire Ice" }, { value: 0.9, label: "Standard fill" }] }, String(getOttoLightingDefaults(levelIndex).fillColor[0]), ottoLightingGroup, "determined"),
        editableRule("level.lightingFillG", "Fill light — green", "Controls the green channel of the single fill light applied to world geometry. Values range from 0.00 to 1.00; this does not change ambient light or the sun direction.", String(getOttoLightingDefaults(levelIndex).fillColor[1]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.6, label: "Fire Ice" }, { value: 0.7, label: "Apocalypse" }, { value: 0.9, label: "Standard fill" }] }, String(getOttoLightingDefaults(levelIndex).fillColor[1]), ottoLightingGroup, "determined"),
        editableRule("level.lightingFillB", "Fill light — blue", "Controls the blue channel of the single fill light applied to world geometry. Values range from 0.00 to 1.00; this does not change ambient light or the sun direction.", String(getOttoLightingDefaults(levelIndex).fillColor[2]), "System/GameMain.c:671-790", { kind: "slider", min: 0, max: 1, step: 0.01, gameValues: [{ value: 0.6, label: "Fire Ice" }, { value: 0.7, label: "Apocalypse" }, { value: 0.85, label: "Standard fill" }] }, String(getOttoLightingDefaults(levelIndex).fillColor[2]), ottoLightingGroup, "determined"),
        editableRule("level.autoFade", "Object draw distance", "Choose how far objects remain visible before they fade or are culled. Standard uses the ordinary range; Fog Only, Apocalypse, and Saucer use their corresponding visibility ranges. This changes visibility, not object placement or collision.", levelIndex === 1 ? "fog-only" : levelIndex === 3 ? "apocalypse" : levelIndex === 8 ? "saucer" : "standard", "System/GameMain.c:701-735", getOttoControl("level.autoFade", ["standard", "fog-only", "apocalypse", "saucer"])),
        editableRule("level.blobDeformation", "Blob terrain deformation", "Selects the Blob terrain deformation strength. None leaves the terrain static, Blob World adds the ordinary waves, and Blob Boss adds its larger waves. Gravity and slipperiness are separate settings.", levelIndex === 1 ? "blob" : levelIndex === 2 ? "blob-boss" : "none", "System/GameMain.c:897-958", getOttoControl("level.blobDeformation", ["none", "blob", "blob-boss"])),
        editableRule("level.blobBossMachine", "Blob Boss machine", "Creates the Blob Boss machine at level start. This is independent from Blob Boss terrain deformation, gravity, camera, platform, and robot behavior.", levelIndex === 2 ? "true" : "false", "System/GameMain.c:927-934", { kind: "checkbox" }),
        editableRule("level.teleporters", "Teleporters", "Creates the Apocalypse teleporters at level start. This does not create Apocalypse space pods or zip-lines.", levelIndex === 3 ? "true" : "false", "System/GameMain.c:960-964", { kind: "checkbox" }),
        editableRule("level.spacePods", "Space pods", "Creates the Apocalypse space pods at level start. This does not create Apocalypse teleporters or zip-lines.", levelIndex === 3 ? "true" : "false", "System/GameMain.c:960-964", { kind: "checkbox" }),
        editableRule("level.bumperCars", "Cloud bumper cars", "Creates the Cloud bumper-car system at level start. This is independent from Cloud terrain and electric-floor behavior.", levelIndex === 4 ? "true" : "false", "System/GameMain.c:966-968", { kind: "checkbox" }),
        editableRule("level.jungleBoss", "Jungle Boss systems", "Creates the Jungle Boss gameplay systems at level start. This does not automatically enable Jungle weapons, flytrap targeting, or the bonus tractor beam.", levelIndex === 6 ? "true" : "false", "System/GameMain.c:970-972", { kind: "checkbox" }),
        editableRule("level.zipLines", "Zip-lines", "Creates zip-line systems at level start. The separate Zip-line style setting selects their visual and item variant.", levelIndex === 3 || levelIndex === 7 ? "true" : "false", "System/GameMain.c:960-964; System/GameMain.c:974-976", { kind: "checkbox" }),
        editableRule("level.brainBoss", "Brain Boss systems", "Creates the Brain Boss system at level start. This is independent from the Brain Alien death attack and the final-level save rule.", levelIndex === 9 ? "true" : "false", "System/GameMain.c:978-980", { kind: "checkbox" }),
        editableRule("level.player", "Starting vehicle", "Choose the vehicle sequence used when the player starts. Rocket and Robot creates the normal rocket and robot setup; Robot starts directly with the robot; Saucer starts with the saucer. This changes the starting setup, not terrain or save identity.", levelIndex === 8 ? "saucer" : levelIndex === 2 ? "robot" : "rocket-and-robot", "Player/Player.c:129-181", getOttoControl("level.player", ["rocket-and-robot", "robot", "saucer"])),
        editableRule("level.saucerMode", "Saucer gameplay mode", "Enables the player-saucer camera, human scaling and abduction behavior, saucer help, and HUD layout. It is separate from the starting vehicle and the exit-door behavior, so each can be changed independently.", levelIndex === 8 ? "true" : "false", "3D/Camera.c:246-344; Items/Humans.c:103-1110; Screens/Infobar.c:333-348; Player/Player.c:503", { kind: "checkbox" }),
        editableRule("level.rocketDoorStaysOpen", "Exit door stays open", "Keeps the open exit-rocket door from closing when the player moves away. This is the Saucer-level convenience behavior and is independent from player-saucer controls and exit-fuel gates.", levelIndex === 8 ? "true" : "false", "Player/Player.c:1513-1519", { kind: "checkbox" }),
        editableRule("level.startingFuel", "Starting fuel", "Choose how much fuel the player has at the start of the vehicle sequence. Empty requires fuel collection before normal flight; Full starts with a full tank. This does not change fuel use after starting.", levelIndex === 2 || levelIndex === 6 ? "full" : "empty", "Player/Player.c:150-152", getOttoControl("level.startingFuel", ["empty", "full"])),
        editableRule("level.rocketScale", "Rocket size", "Chooses the authored size of the exit rocket model. Small is the compact rocket used on the Saucer level; Normal uses the regular exit-rocket size.", levelIndex === 8 ? "small" : "normal", "Player/Player.c:129", getOttoControl("level.rocketScale", ["normal", "small"])),
        editableRule("level.jungleWeapons", "Jungle weapon set", "Choose which weapon initialization runs. Standard creates the ordinary weapon set; Jungle creates the Jungle weapon set and its related weapon behavior. This does not change the player vehicle or terrain.", levelIndex === 5 || levelIndex === 6 ? "jungle" : "standard", "Player/Player_Weapons.c:393", getOttoControl("level.jungleWeapons", ["standard", "jungle"])),
        editableRule("level.flytrapTargeting", "Flytrap targeting", "Controls whether Venus flytraps acquire and aim at the player automatically. Disabled prevents the Jungle Boss targeting behavior.", levelIndex === 6 ? "disabled" : "enabled", "Enemies/Jungle/Enemy_Flytrap.c:118", getOttoControl("level.flytrapTargeting", ["enabled", "disabled"])),
        editableRule("level.brainAlien", "Brain Alien death attack", "Enables the Brain Alien’s special Brain Boss atom-spew attack when it dies. It is normally enabled only on the Brain Boss level.", levelIndex === 9 ? "true" : "false", "Enemies/Enemy_BrainAlien.c:944", { kind: "checkbox" }),
        editableRule("level.cyclorama", "Cyclorama background", "Creates the large background cylinder behind the terrain. Disable it for levels that use an open or separately rendered environment.", levelIndex !== 1 && levelIndex !== 8 && levelIndex !== 9 ? "true" : "false", "Items/Items.c:79-106", { kind: "checkbox" }),
        editableRule("level.splineSurface", "Spline item surface", "Chooses the height used to draw spline items. Terrain or water surface follows the world; Flat places them on the fixed surface used by Blob Boss.", levelIndex === 2 ? "flat" : "terrain-or-water", "Terrain/SplineItems.c:580-589", getOttoControl("level.splineSurface", ["terrain-or-water", "flat"])),
        editableRule("level.blobPlatforms", "Blob Boss falling platforms", "Chooses whether falling slime platforms use their Blob Boss model and height behavior. Standard keeps ordinary platform handling.", levelIndex === 2 ? "blob-boss" : "standard", "Items/Triggers.c:1083-1095", getOttoControl("level.blobPlatforms", ["standard", "blob-boss"])),
        editableRule("level.reducedPowerupSparkles", "Reduced power-up sparkles", "Limits each power-up to four sparkles to reduce the Brain Boss level’s effect load. Disabled uses the normal sparkle count.", levelIndex === 9 ? "true" : "false", "Items/Powerups.c:666-669", { kind: "checkbox" }),
        editableRule("level.growthPowerups", "Growth power-ups", "Marks growth power-ups as valid for the level. The game rejects invalid growth-power-up placement, so enable this only where the level’s content expects it.", levelIndex === 5 ? "true" : "false", "Items/Powerups.c:1064-1065", { kind: "checkbox" }),
        editableRule("level.transport", "Transport type", "Chooses the transport presentation and impact behavior. Rocket sled selects the Cloud level’s sled; Standard uses the ordinary transport behavior.", levelIndex === 4 ? "rocket-sled" : "standard", "Items/RocketSled.c:57-508", getOttoControl("level.transport", ["standard", "rocket-sled"])),
        editableRule("level.zipLineStyle", "Zip-line style", "Choose the zip-line posts, ropes, and related art. Fire Ice creates the Fire Ice style; Apocalypse creates the Apocalypse style. This changes appearance and associated item setup, not the level’s terrain or save identity.", levelIndex === 3 ? "apocalypse" : "fire-ice", "Items/ZipLine.c:198-201; Items/ZipLine.c:423-426; Items/ZipLine.c:565-568", getOttoControl("level.zipLineStyle", ["fire-ice", "apocalypse"])),
        editableRule("level.rocketExit", "Landing rocket can become the exit", "Enables the landed transport rocket to remain as the level exit instead of departing. The exact trigger is selected below; this setting does not change the rocket model’s size.", levelIndex === 6 || levelIndex === 9 ? "true" : "false", "Player/Player.c:1187-1203", { kind: "checkbox" }),
        editableRule("level.rocketExitTrigger", "Landing rocket exit condition", "Defines when an enabled landing rocket becomes the exit: while the Jungle Boss tractor beam is active, or after the player has landed. The latter is the Brain Boss behavior and is also suitable for ordinary custom levels.", levelIndex === 6 ? "tractor-beam-active" : "player-landed", "Player/Player.c:1181-1196", getOttoControl("level.rocketExitTrigger", ["player-landed", "tractor-beam-active"])),
        editableRule("level.rocketFuel", "Exit fuel requirement", "Controls only whether the exit door requires a full fuel tank. It does not control the boss gate or tractor-beam gate, which are separate conditions below.", levelIndex === 6 || levelIndex === 8 ? "not-required" : "required", "Player/Player.c:1442-1463", getOttoControl("level.rocketFuel", ["required", "not-required"])),
        editableRule("level.rocketBossGate", "Exit boss gate", "Prevents the exit door from opening until the Brain Boss is defeated. This gate is independent from fuel and tractor-beam requirements.", levelIndex === 9 ? "true" : "false", "Player/Player.c:1450-1454", { kind: "checkbox" }),
        editableRule("level.rocketTractorBeamGate", "Exit tractor-beam gate", "Prevents the exit door from opening while the Jungle Boss tractor beam is active. This gate is independent from fuel and boss-defeat requirements.", levelIndex === 6 ? "true" : "false", "Player/Player.c:1439-1445", { kind: "checkbox" }),
        editableRule("level.exitHelp", "Exit help prompt", "Shows or hides the Enter Ship help prompt when the player reaches the exit rocket.", ![6, 8, 9].includes(levelIndex) ? "true" : "false", "Player/Player.c:876-896", { kind: "checkbox" }),
        editableRule("level.blobLandingWell", "Blob landing well", "Uses the Blob World landing-rocket behavior that checks whether the player has been sucked into the Blob well. This does not enable robot landing waves or the Blob bonus-screen presentation.", levelIndex === 1 ? "true" : "false", "Player/Player.c:1530-1533", { kind: "checkbox" }),
        editableRule("level.blobLandingDeformation", "Blob landing waves", "Creates the Blob World deformation wave when the robot lands hard on the terrain. This is independent from the player’s Blob landing well and the Blob bonus screen.", levelIndex === 1 ? "true" : "false", "Player/Player_Robot.c:1080-1086", { kind: "checkbox" }),
        editableRule("level.blobBonusScreen", "Blob bonus screen", "Uses the Blob World bonus-screen presentation: no ship dissolve, Blob camera framing, no stars, and the visible Blob interior. It does not enable Blob gameplay behavior during the level.", levelIndex === 1 ? "true" : "false", "Screens/BonusScreen.c:192-193; Screens/BonusScreen.c:283-293; Screens/BonusScreen.c:359-365; Screens/BonusScreen.c:430", { kind: "checkbox" }),
        editableRule("level.robotStartHeight", "Robot start height", "Starts the robot high above the terrain so it falls into the Blob Boss arena. It does not enable Blob Boss bounce damage or the Blob Boss machine.", levelIndex === 2 ? "true" : "false", "Player/Player_Robot.c:181-187", { kind: "checkbox" }),
        editableRule("level.robotBlobBounce", "Blob Boss robot bounce", "Enables the Blob Boss ground response that damages and bounces the robot. This is independent from the robot’s starting height.", levelIndex === 2 ? "true" : "false", "Player/Player_Robot.c:2693-2700", { kind: "checkbox" }),
        editableRule("level.robotElectricFloor", "Cloud electric floor", "Enables the robot’s Cloud electric-floor collision response. It does not enable Cloud terrain pits or cannon entry.", levelIndex === 4 ? "true" : "false", "Player/Player_Robot.c:2693-2710", { kind: "checkbox" }),
        editableRule("level.bonusTractorBeam", "Jungle bonus tractor beam", "Starts the Jungle bonus-screen tractor-beam sequence and resets the bonus score mode when enabled.", levelIndex === 5 ? "true" : "false", "Screens/BonusScreen.c:229-237", { kind: "checkbox" }),
        editableRule("level.introVisible", "Show level introduction", "Controls whether the level-intro sequence is shown at all. This does not control intro timing, glow, or ships.", levelIndex === 2 || levelIndex === 6 ? "false" : "true", "Screens/LevelIntros.c:82-97", { kind: "checkbox" }),
        editableRule("level.introTiming", "Introduction timing", "Controls how quickly the level name appears and how long the intro lasts. Short uses the Brain Boss timing; Normal uses the regular timing.", levelIndex === 9 ? "short" : "normal", "Screens/LevelIntros.c:84-97; Screens/LevelIntros.c:160-172", getOttoControl("level.introTiming", ["normal", "short"])),
        editableRule("level.introGlow", "Introduction cloud glow", "Adds the additive glow treatment to the intro planet’s cloud layer. This is independent from the level’s normal sky glow and from whether the intro is shown.", levelIndex === 3 ? "true" : "false", "Screens/LevelIntros.c:367-376", { kind: "checkbox" }),
        editableRule("level.introShips", "Introduction ships", "Chooses the ship display in the intro. Normal shows the standard group, Single ice saucer shows the Saucer intro ship, and None hides intro ships.", levelIndex === 8 ? "saucer" : levelIndex === 9 ? "none" : "standard", "Screens/LevelIntros.c:397-413", getOttoControl("level.introShips", ["standard", "saucer", "none"])),
        editableRule("level.finalLevel", "Final level", "Marks this level as the terminal level so the bonus screen skips the save-game prompt. This is progression state, not intro presentation.", levelIndex === 9 ? "true" : "false", "Screens/BonusScreen.c:213-223", { kind: "checkbox" }),
        editableRule("level.blobBossEnvMap", "Blob Boss environment map", "Enables the reflective environment-map material used by Blob Boss textures on G4-class hardware. Disable it when the hardware path cannot support that material.", levelIndex === 2 ? "true" : "false", "System/File.c:1491-1498", { kind: "checkbox" }),
      ];
    default:
      return [];
  }
}
