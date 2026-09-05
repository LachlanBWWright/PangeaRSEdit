import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS, getLevelIndex } from "@/editor/utils/gamePortConfig";
import { describe, expect, it } from "vitest";
import { getLevelMetadataDetails } from "./levelMetadata";
import { getMetadataResourceMode } from "./metadataResource";
import { metadataResourceTypeSchema } from "@/validation/levelDataSchemas";
import { getMetadataRuleValueLabel, getMetadataValueLabel } from "./levelMetadataRules";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function readNativeSourceTree(root: string): string {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return [readNativeSourceTree(path)];
      if (entry.name.endsWith(".c") || entry.name.endsWith(".h")) {
        return [readFileSync(path, "utf8")];
      }
      return [];
    })
    .join("\n");
}

describe("level metadata details", () => {
  it("connects every editable key to each native game source tree", () => {
    const gameRoots: readonly (readonly [Game, string])[] = [
      [Game.OTTO_MATIC, "../../../../../games/pangea-ports/games/OttoMatic-Android/src"],
      [Game.BUGDOM, "../../../../../games/pangea-ports/games/Bugdom-android/src"],
      [Game.BUGDOM_2, "../../../../../games/pangea-ports/games/Bugdom2-Android/Source"],
      [Game.NANOSAUR, "../../../../../games/pangea-ports/games/Nanosaur-android/src"],
      [Game.NANOSAUR_2, "../../../../../games/pangea-ports/games/Nanosaur2-Android/Source"],
      [Game.CRO_MAG, "../../../../../games/pangea-ports/games/CroMagRally-Android/Source"],
      [Game.BILLY_FRONTIER, "../../../../../games/pangea-ports/games/BillyFrontier-Android/Source"],
      [Game.MIGHTY_MIKE, "../../../../../games/pangea-ports/games/MightyMike-Android/src"],
    ];

    gameRoots.forEach(([game, root]) => {
      const nativeSource = readNativeSourceTree(join(__dirname, root));
      const editableKeys = new Set(
        GAME_PORT_CONFIGS[game].levels.flatMap((levelInfo, levelIndex) =>
          getLevelMetadataDetails(game, levelIndex, levelInfo).runtimeRules
            .filter((rule) => rule.editable)
            .map((rule) => rule.key),
        ),
      );

      editableKeys.forEach((key) => {
        expect(nativeSource, `${game} metadata key ${key}`).toContain(key);
      });
    });
  });

  it("provides a completed identity and runtime summary for every game", () => {
    const games = [
      Game.OTTO_MATIC,
      Game.BUGDOM,
      Game.BUGDOM_2,
      Game.NANOSAUR,
      Game.NANOSAUR_2,
      Game.CRO_MAG,
      Game.BILLY_FRONTIER,
      Game.MIGHTY_MIKE,
    ];

    games.forEach((game) => {
      const levelInfo = GAME_PORT_CONFIGS[game].levels[0];
      expect(levelInfo).toBeDefined();
      if (!levelInfo) return;
      const details = getLevelMetadataDetails(game, getLevelIndex(levelInfo), levelInfo);

      expect(details.identityLabel).not.toBe("");
      expect(details.identityValue).toBe(levelInfo.name);
      expect(details.family).not.toBe("");
      expect(details.startPolicy).not.toBe("");
      expect(details.nativeSystems).not.toBe("");
      expect(details.contextFields.length).toBeGreaterThan(0);
      expect(details.runtimeRules.length).toBeGreaterThan(0);
      details.runtimeRules.forEach((runtimeRule) => {
        expect(runtimeRule.key).not.toBe("");
        expect(runtimeRule.label).not.toBe(runtimeRule.key);
        expect(runtimeRule.description).not.toContain("Catalogued runtime branch");
        expect(runtimeRule.value).not.toBe("");
        expect(runtimeRule.source).not.toBe("");
      });
      expect(details.specialRules.length).toBeGreaterThan(0);
    });
  });

  it("describes every choice exposed by editable metadata controls", () => {
    const games = [
      Game.OTTO_MATIC,
      Game.BUGDOM,
      Game.BUGDOM_2,
      Game.NANOSAUR,
      Game.NANOSAUR_2,
      Game.CRO_MAG,
      Game.BILLY_FRONTIER,
      Game.MIGHTY_MIKE,
    ];

    games.forEach((game) => {
      GAME_PORT_CONFIGS[game].levels.forEach((levelInfo, levelIndex) => {
        const rules = getLevelMetadataDetails(game, levelIndex, levelInfo).runtimeRules;
        rules.filter((rule) => rule.editable).forEach((rule) => {
          if (rule.control.kind !== "select") return;
          const selectControl = rule.control;
          selectControl.options.forEach((option) => {
            expect(selectControl.optionDescriptions?.[option], `${game} ${levelIndex} ${rule.key} ${option}`).toBeTruthy();
            expect(selectControl.optionDescriptions?.[option]?.length, `${game} ${levelIndex} ${rule.key} ${option}`).toBeGreaterThan(20);
          });
        });
      });
    });
  });

  it("provides runtime rules for every configured level entry", () => {
    const games = [
      Game.OTTO_MATIC,
      Game.BUGDOM,
      Game.BUGDOM_2,
      Game.NANOSAUR,
      Game.NANOSAUR_2,
      Game.CRO_MAG,
      Game.BILLY_FRONTIER,
      Game.MIGHTY_MIKE,
    ];

    games.forEach((game) => {
      GAME_PORT_CONFIGS[game].levels.forEach((levelInfo) => {
        const details = getLevelMetadataDetails(game, getLevelIndex(levelInfo), levelInfo);
        expect(details.runtimeRules.length).toBeGreaterThan(0);
      });
    });
  });

  it("classifies Bugdom 2 tunnel levels without a terrain start", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM_2].levels.find(
      (level) => getLevelIndex(level) === 3,
    );
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.BUGDOM_2, 3, levelInfo);

    expect(details.family).toBe("Tunnel level");
    expect(details.startPolicy).toBe("Hard-coded tunnel entry");
    expect(details.contextFields).toEqual([
      { label: "Level family", value: "Plumbing/Gutter tunnel" },
      { label: "Asset rule", value: "Tunnel resources; no terrain start" },
    ]);
    expect(details.runtimeRules).toContainEqual(expect.objectContaining({
      key: "level.tunnelStart",
      value: "tunnel entry coordinates",
      editable: false,
    }));
  });

  it("exposes Bugdom 2 area profiles with stable serialized identifiers", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM_2].levels[3];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.BUGDOM_2, 3, levelInfo);
    expect(details.runtimeRules).toContainEqual(expect.objectContaining({
      key: "level.bugdom2Area",
      value: "plumbing",
      editable: true,
      control: expect.objectContaining({
        kind: "select",
        options: ["gnome-garden", "sidewalk", "fido", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park"],
      }),
    }));
  });

  it("gives Bugdom 2 behavior controls useful choices and explicit defaults", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM_2].levels[3];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const rules = getLevelMetadataDetails(Game.BUGDOM_2, 3, levelInfo).runtimeRules;
    const fidoRule = rules.find((rule) => rule.key === "level.fido");
    expect(fidoRule).toBeDefined();
    if (!fidoRule || fidoRule.control.kind !== "select") return;

    expect(fidoRule.defaultValue).toBe("source-default");
    expect(fidoRule.control.options).toEqual(["source-default", "fido"]);
    expect(getMetadataRuleValueLabel(fidoRule, "source-default")).toBe("Use original enemy behavior");
    expect(getMetadataRuleValueLabel(fidoRule, "fido")).toBe("Enable Fido enemy rules");

    rules.filter((rule) => rule.editable).forEach((rule) => {
      expect(rule.defaultValue).toBeDefined();
      expect(rule.description.length).toBeGreaterThan(20);
      if (rule.control.kind === "select") {
        const selectControl = rule.control;
        selectControl.options.forEach((option) => {
          expect(getMetadataRuleValueLabel(rule, option).length).toBeGreaterThan(0);
          expect(selectControl.optionDescriptions?.[option]).toBeDefined();
        });
      }
    });

    const editableKeys = rules.filter((rule) => rule.editable).map((rule) => rule.key);
    expect(editableKeys).toContain("level.intro");
    expect(editableKeys).toContain("level.infobar");
    expect(editableKeys).toContain("level.completion");
    expect(editableKeys).toContain("level.areaUpdate");
    expect(editableKeys).toContain("level.rendering");
    expect(editableKeys).toContain("level.lighting");
    expect(editableKeys).toContain("level.autoFade");
    expect(editableKeys).toContain("level.levelInit");
    expect(editableKeys).not.toContain("level.presentation");
    expect(editableKeys).not.toContain("level.mainDispatch");

    const ruleFor = (key: string) => rules.find((rule) => rule.key === key);
    expect(ruleFor("level.objects")?.control).toEqual(expect.objectContaining({
      options: ["source-default", "balsa"],
    }));
    expect(ruleFor("level.powerups")?.control).toEqual(expect.objectContaining({
      options: ["source-default", "balsa"],
    }));
    expect(ruleFor("level.mapPowerup")?.control).toEqual(expect.objectContaining({
      options: ["source-default", "closet"],
    }));
  });

  it("exposes Otto Matic gravity as a level property", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[2];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.OTTO_MATIC, 2, levelInfo);

    expect(details.runtimeRules).toContainEqual(expect.objectContaining({
      key: "level.gravity",
      value: "3900",
      label: "Gravity",
      editable: true,
      control: {
        kind: "slider",
        min: 0,
        max: 8000,
        step: 100,
        gameValues: [
          { value: 5200, label: "Normal gravity" },
          { value: 3900, label: "Blob Boss low gravity" },
        ],
      },
    }));
  });

  it("provides English value labels and Otto source citations", () => {
    expect(getMetadataValueLabel("rocket-and-robot")).toBe("Rocket and robot");
    expect(getMetadataValueLabel("blob-boss")).toBe("Blob Boss");

    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const gravityRule = getLevelMetadataDetails(
      Game.OTTO_MATIC,
      getLevelIndex(levelInfo),
      levelInfo,
    ).runtimeRules.find((rule) => rule.key === "level.gravity");

    expect(gravityRule?.citations).toEqual([
      { file: "System/GameMain.c", line: 781, endLine: 816 },
      { file: "System/GameMain.c", line: 872, endLine: 874 },
    ]);
    expect(gravityRule?.description).toContain("does not change model scale");
  });

  it("preserves the distinct Otto rocket-exit triggers", () => {
    const jungleLevel = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[6];
    const brainBossLevel = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[9];
    expect(jungleLevel).toBeDefined();
    expect(brainBossLevel).toBeDefined();
    if (!jungleLevel || !brainBossLevel) return;

    const jungleTrigger = getLevelMetadataDetails(Game.OTTO_MATIC, 6, jungleLevel).runtimeRules
      .find((rule) => rule.key === "level.rocketExitTrigger");
    const brainBossTrigger = getLevelMetadataDetails(Game.OTTO_MATIC, 9, brainBossLevel).runtimeRules
      .find((rule) => rule.key === "level.rocketExitTrigger");

    expect(jungleTrigger?.value).toBe("tractor-beam-active");
    expect(brainBossTrigger?.value).toBe("player-landed");
  });

  it("exposes every Otto runtime setting with a semantic control", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[2];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.OTTO_MATIC, 2, levelInfo);
    const editableRules = details.runtimeRules.filter((rule) => rule.editable);
    const expectedKeys = [
      "level.gravity",
      "level.tileSlipperiness",
      "level.environment",
      "level.sky",
      "level.cloudTwoSidedTerrain",
      "level.cloudBlankTiles",
      "level.cloudPits",
      "level.cloudCannon",
      "level.cloudBalloonPowerups",
      "level.cloudTransparentBlack",
      "level.fences",
      "level.saucers",
      "level.blobEffects",
      "level.blobBossEffects",
      "level.cloudEffects",
      "level.camera",
      "level.lighting",
      "level.autoFade",
      "level.blobDeformation",
      "level.blobBossMachine",
      "level.teleporters",
      "level.spacePods",
      "level.bumperCars",
      "level.jungleBoss",
      "level.zipLines",
      "level.brainBoss",
      "level.player",
      "level.saucerMode",
      "level.rocketDoorStaysOpen",
      "level.startingFuel",
      "level.rocketScale",
      "level.jungleWeapons",
      "level.flytrapTargeting",
      "level.brainAlien",
      "level.cyclorama",
      "level.splineSurface",
      "level.blobPlatforms",
      "level.reducedPowerupSparkles",
      "level.growthPowerups",
      "level.transport",
      "level.zipLineStyle",
      "level.rocketExit",
      "level.rocketExitTrigger",
      "level.rocketFuel",
      "level.rocketBossGate",
      "level.rocketTractorBeamGate",
      "level.rocketPersistence",
      "level.exitHelp",
      "level.blobLandingWell",
      "level.blobLandingDeformation",
      "level.blobBonusScreen",
      "level.robotStartHeight",
      "level.robotBlobBounce",
      "level.robotElectricFloor",
      "level.bonusTractorBeam",
      "level.introVisible",
      "level.introTiming",
      "level.introGlow",
      "level.introShips",
      "level.finalLevel",
      "level.blobBossEnvMap",
    ];

    expect(editableRules.map((rule) => rule.key)).toEqual(expectedKeys);
    expect(editableRules.map((rule) => rule.key)).not.toContain("level.effects");
    expect(editableRules.map((rule) => rule.key)).not.toContain("level.specialInit");
    expect(editableRules.every((rule) => rule.citations.length > 0)).toBe(true);
    expect(editableRules.every((rule) => rule.description.length > 40)).toBe(true);
    expect(editableRules.every((rule) => rule.control.kind !== "text")).toBe(true);
  });

  it("keeps Otto defaults aligned with independent native consumers", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[4];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.OTTO_MATIC, 4, levelInfo);
    const environmentRule = details.runtimeRules.find((rule) => rule.key === "level.environment");
    expect(environmentRule?.value).toBe("cloud");

    const sourceRoot = join(__dirname, "../../../../../games/pangea-ports/games/OttoMatic-Android/src");
    const nativeSource = [
      "3D/Camera.c",
      "Effects/Sky.c",
      "Enemies/Enemy.c",
      "Enemies/Enemy_BrainAlien.c",
      "Enemies/Jungle/Enemy_Flytrap.c",
      "Enemies/Saucer.c",
      "Items/Humans.c",
      "Items/Items.c",
      "Items/Powerups.c",
      "Items/RocketSled.c",
      "Items/Triggers.c",
      "Items/ZipLine.c",
      "Player/Player.c",
      "Player/Player_Robot.c",
      "Player/Player_Weapons.c",
      "Screens/BonusScreen.c",
      "Screens/Infobar.c",
      "Screens/LevelIntros.c",
      "System/File.c",
      "System/GameMain.c",
      "Terrain/Fences.c",
      "Terrain/SplineItems.c",
      "Terrain/Terrain.c",
    ].map((sourceFile) => readFileSync(join(sourceRoot, sourceFile), "utf8")).join("\n");

    details.runtimeRules.filter((rule) => rule.editable).forEach((rule) => {
      expect(nativeSource, rule.key).toContain(`"${rule.key}"`);
    });
  });

  it("exposes only consumed Nanosaur 2 behavior settings", () => {
    const expectedKeys = [
      "level.mode",
      "level.biome",
      "level.mapView",
      "level.items",
      "level.minePlacement",
      "level.doorMotion",
      "level.turretRange",
      "level.flightHeight",
      "level.raceMarkers",
      "level.intro",
      "level.rendering",
    ];
    GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels.forEach((levelInfo, levelIndex) => {
      const details = getLevelMetadataDetails(Game.NANOSAUR_2, levelIndex, levelInfo);
      const editableRules = details.runtimeRules.filter((rule) => rule.editable);
      expect(editableRules.map((rule) => rule.key)).toEqual(expectedKeys);
      expect(editableRules.every((rule) => rule.citations.length > 0)).toBe(true);
      expect(editableRules.every((rule) => rule.control.kind === "select")).toBe(true);
    });
  });

  it("keeps Nanosaur 2 item and movement profiles connected to native consumers", () => {
    const portRoot = join(__dirname, "../../../../../games/pangea-ports/games/Nanosaur2-Android/Source");
    const sourceFiles = [
      "Items/Bushes.c",
      "Items/Items.c",
      "Items/Mines.c",
      "Items/Turrets.c",
      "Items/ForestDoor.c",
      "Player/Player.c",
      "Player/Player_Terrain.c",
      "Screens/Infobar.c",
      "System/LoadLevel.c",
      "System/Main.c",
      "System/File.c",
    ];
    const portSource = sourceFiles
      .map((sourceFile) => readFileSync(join(portRoot, sourceFile), "utf8"))
      .join("\n");
    const rules = getLevelMetadataDetails(
      Game.NANOSAUR_2,
      0,
      GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels[0],
    ).runtimeRules.filter((rule) => rule.editable);

    rules.forEach((rule) => expect(portSource).toContain(rule.key));
  });

  it("gives Nanosaur 2 options user-facing labels and defaults", () => {
    const rules = getLevelMetadataDetails(
      Game.NANOSAUR_2,
      0,
      GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels[0],
    ).runtimeRules.filter((rule) => rule.editable);
    const mapRule = rules.find((rule) => rule.key === "level.mapView");
    const introRule = rules.find((rule) => rule.key === "level.intro");
    expect(rules.every((rule) => rule.defaultValue !== undefined)).toBe(true);
    expect(mapRule && getMetadataRuleValueLabel(mapRule, "race1")).toBe("Race 1 map view");
    expect(introRule && getMetadataRuleValueLabel(introRule, "none")).toBe("Hide both continuation options");
    expect(getMetadataValueLabel("capture-the-flag", "level.mode")).toBe("Capture the Flag — team flag play");
    rules.forEach((rule) => {
      if (rule.control.kind !== "select") return;
      const selectControl = rule.control;
      selectControl.options.forEach((option) => {
        expect(selectControl.optionDescriptions?.[option], `${rule.key} ${option}`).toBeTruthy();
        expect(selectControl.optionDescriptions?.[option]?.length).toBeGreaterThan(30);
      });
    });
  });

  it("describes Nanosaur 2 effects concretely in the setting copy", () => {
    const rules = getLevelMetadataDetails(
      Game.NANOSAUR_2,
      0,
      GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels[0],
    ).runtimeRules.filter((rule) => rule.editable);
    const descriptions = Object.fromEntries(rules.map((rule) => [rule.key, rule.description]));
    expect(descriptions["level.mode"]).toContain("checkpoints and finishing order");
    expect(descriptions["level.biome"]).toContain("environment family");
    expect(descriptions["level.mapView"]).toContain("view window");
    expect(descriptions["level.items"]).toContain("item-family models");
    expect(descriptions["level.minePlacement"]).toContain("biome-specific offsets");
    expect(descriptions["level.doorMotion"]).toContain("continues spinning");
    expect(descriptions["level.flightHeight"]).toContain("flight ceiling");
    expect(descriptions["level.raceMarkers"]).toContain("race progress");
    expect(descriptions["level.intro"]).toContain("Entering Level 2");
    expect(descriptions["level.rendering"]).toContain("visual atmosphere");
    expect(Object.values(descriptions).every((description) => !description.includes("level-specific behavior"))).toBe(true);
  });

  it("maps every Billy Frontier area to its native fallback mode", () => {
    const expectedModes = [
      "duel",
      "shootout",
      "duel",
      "stampede",
      "duel",
      "target-practice",
      "duel",
      "shootout",
      "duel",
      "stampede",
      "duel",
      "target-practice",
    ];

    GAME_PORT_CONFIGS[Game.BILLY_FRONTIER].levels.forEach((levelInfo, index) => {
      const modeRule = getLevelMetadataDetails(
        Game.BILLY_FRONTIER,
        getLevelIndex(levelInfo),
        levelInfo,
      ).runtimeRules.find((rule) => rule.key === "area.mode");
      expect(modeRule?.control).toEqual(expect.objectContaining({
        kind: "select",
        options: ["source-default", "duel", "shootout", "stampede", "target-practice"],
      }));
      expect(modeRule?.value).toBe("source-default");
      expect(modeRule?.defaultValue).toBe(expectedModes[index]);
    });
  });

  it("keeps every Cro-Mag editable key connected to a native consumer", () => {
    const portRoot = join(__dirname, "../../../../../games/pangea-ports/games/CroMagRally-Android/Source");
    const sourceFiles = [
      "System/File.c",
      "System/Main.c",
      "System/network.c",
      "Player/Player.c",
      "Player/Player_Car.c",
      "Items/Items.c",
      "Screens/RaceTimes.c",
      "Terrain/Liquids.c",
      "Items/Triggers.c",
    ];
    const portSource = sourceFiles
      .map((sourceFile) => readFileSync(join(portRoot, sourceFile), "utf8"))
      .join("\n");
    const editableKeys = getLevelMetadataDetails(
      Game.CRO_MAG,
      0,
      GAME_PORT_CONFIGS[Game.CRO_MAG].levels[0],
    ).runtimeRules.filter((rule) => rule.editable).map((rule) => rule.key);

    expect(editableKeys).toEqual([
      "track.mode",
      "track.waterAnimation",
      "track.surfaceEffects",
      "track.vehicle",
      "track.music",
      "track.lighting",
      "track.sky",
      "track.liquidMaterial",
      "track.campfire",
      "track.startLineCollision",
      "track.startLineMovement",
      "track.objectTint",
    ]);
    editableKeys.forEach((key) => expect(portSource).toContain(key));
  });

  it("gives Cro-Mag settings user-facing option labels and original defaults", () => {
    const rules = getLevelMetadataDetails(
      Game.CRO_MAG,
      8,
      GAME_PORT_CONFIGS[Game.CRO_MAG].levels[8],
    ).runtimeRules;
    const vehicleRule = rules.find((rule) => rule.key === "track.vehicle");
    const collisionRule = rules.find((rule) => rule.key === "track.startLineCollision");
    const startLineRule = rules.find((rule) => rule.key === "track.startLineMovement");
    const musicRule = rules.find((rule) => rule.key === "track.music");

    expect(vehicleRule?.defaultValue).toBe("submarine");
    expect(vehicleRule?.control).toMatchObject({
      optionLabels: { car: "Car", submarine: "Submarine" },
    });
    expect(startLineRule?.control).toMatchObject({
      optionLabels: { atlantis: "Atlantis moving start line" },
    });
    expect(collisionRule?.defaultValue).toBe("none");
    expect(collisionRule?.control).toMatchObject({
      optionLabels: { none: "No collision (Atlantis default)" },
    });
    expect(musicRule?.control).toMatchObject({
      optionLabels: { atlantis: "Atlantis soundtrack" },
    });
    rules
      .filter((rule) => rule.editable)
      .forEach((rule) => {
        expect(rule.description.length).toBeGreaterThan(20);
        if (rule.control.kind !== "select") return;
        const selectControl = rule.control;
        expect(selectControl.optionLabels).toBeDefined();
        expect(selectControl.optionDescriptions).toBeDefined();
        selectControl.options.forEach((option) => {
          expect(selectControl.optionLabels?.[option]).toBeDefined();
          expect(selectControl.optionDescriptions?.[option]).toBeDefined();
        });
    });
  });

  it("keeps Cro-Mag start-line collision and movement as independent settings", () => {
    const creteRules = getLevelMetadataDetails(
      Game.CRO_MAG,
      3,
      GAME_PORT_CONFIGS[Game.CRO_MAG].levels[3],
    ).runtimeRules;
    const atlantisRules = getLevelMetadataDetails(
      Game.CRO_MAG,
      8,
      GAME_PORT_CONFIGS[Game.CRO_MAG].levels[8],
    ).runtimeRules;
    const getDefault = (rules: typeof creteRules, key: string): string | undefined =>
      rules.find((rule) => rule.key === key)?.defaultValue;

    expect(getDefault(creteRules, "track.startLineCollision")).toBe("crete");
    expect(getDefault(creteRules, "track.startLineMovement")).toBe("standard");
    expect(getDefault(atlantisRules, "track.startLineCollision")).toBe("none");
    expect(getDefault(atlantisRules, "track.startLineMovement")).toBe("atlantis");
  });

  it("does not expose identity-derived Billy branches as writable metadata", () => {
    const rules = getLevelMetadataDetails(
      Game.BILLY_FRONTIER,
      0,
      GAME_PORT_CONFIGS[Game.BILLY_FRONTIER].levels[0],
    ).runtimeRules;
    expect(rules.map((rule) => rule.key)).toEqual(["area.mode"]);
    expect(rules[0]?.editable).toBe(true);
  });

  it("uses clear Billy activity labels and explains the default", () => {
    expect(getMetadataValueLabel("source-default", "area.mode")).toBe("Use this area's default");
    expect(getMetadataValueLabel("target-practice", "area.mode")).toBe("Target practice");

    const rule = getLevelMetadataDetails(
      Game.BILLY_FRONTIER,
      1,
      GAME_PORT_CONFIGS[Game.BILLY_FRONTIER].levels[1],
    ).runtimeRules[0];
    expect(rule?.label).toBe("Activity");
    expect(rule?.description).toContain("does not change the area’s terrain");
    expect(rule?.defaultValue).toBe("shootout");
    expect(rule?.control.kind === "select" ? rule.control.optionDescriptions : undefined).toEqual({
      "source-default": "Keep the activity assigned to this area by the original game.",
      duel: "Play the one-on-one frontier duel and use duel completion rules.",
      shootout: "Play the gunfight against enemy outlaws and use shootout completion rules.",
      stampede: "Play the mounted stampede challenge and use its finish-line completion rules.",
      "target-practice": "Play the target-shooting challenge and use its target-count completion rules.",
    });
  });

  it("keeps Billy identity and activity behavior as separate concerns", () => {
    const rules = getLevelMetadataDetails(
      Game.BILLY_FRONTIER,
      5,
      GAME_PORT_CONFIGS[Game.BILLY_FRONTIER].levels[5],
    ).runtimeRules;
    expect(rules.map((rule) => rule.key)).toEqual(["area.mode"]);
    expect(rules[0]?.description).not.toContain("terrain resource");
    expect(rules[0]?.description).toContain("save slot");
  });

  it("does not expose identity or audit-only rows as editable fields", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(
      Game.BUGDOM,
      getLevelIndex(levelInfo),
      levelInfo,
    );
    const identityRule = details.runtimeRules.find((rule) => rule.key === "level.realId");

    expect(identityRule?.editable).toBe(false);
    expect(details.runtimeRules.filter((rule) => rule.editable).map((rule) => rule.key)).toEqual([
      "level.terrainFamily",
      "level.area",
      "level.flyingBeeSetup",
      "level.workerBeeSetup",
      "level.beeFlightRegeneration",
      "level.queenBeeRegeneration",
      "level.antKing",
      "level.beachNutRegeneration",
      "level.dragonflyRide",
      "level.splineItems",
      "presentation.levelIntro",
      "presentation.infobar",
    ]);
  });

  it("keeps every editable Bugdom key connected to an active port consumer", () => {
    const portRoot = join(__dirname, "../../../../../games/pangea-ports/games/Bugdom-android/src");
    const sourceFiles = [
      "System/File.c",
      "Enemies/Enemy_Bee_Flying.c",
      "Enemies/Enemy_WorkerBee.c",
      "Items/Triggers.c",
      "Items/Triggers2.c",
      "Player/Player_Bug.c",
      "Ride/DragonFly.c",
      "Screens/LevelIntro.c",
      "Screens/Infobar.c",
      "Terrain/SplineItems.c",
    ];
    const portSource = sourceFiles
      .map((sourceFile) => readFileSync(join(portRoot, sourceFile), "utf8"))
      .join("\n");
    const editableKeys = getLevelMetadataDetails(
      Game.BUGDOM,
      0,
      GAME_PORT_CONFIGS[Game.BUGDOM].levels[0],
    ).runtimeRules.filter((rule) => rule.editable).map((rule) => rule.key);

    editableKeys.forEach((key) => expect(portSource).toContain(key));
  });

  it("exposes Bugdom family and area as constrained runtime selectors", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM].levels[4];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const rules = getLevelMetadataDetails(Game.BUGDOM, 4, levelInfo).runtimeRules;
    expect(rules).toContainEqual(expect.objectContaining({
      key: "level.terrainFamily",
      value: "forest",
      editable: true,
      control: expect.objectContaining({ kind: "select", options: ["lawn", "pond", "forest", "hive", "night", "anthill"] }),
    }));
    expect(rules).toContainEqual(expect.objectContaining({
      key: "level.area",
      value: "flight",
      editable: true,
      control: expect.objectContaining({ kind: "select", options: ["training", "lawn-area", "beach", "flight", "hive-area", "queen-bee", "ant-hill", "ant-king"] }),
    }));
  });

  it("maps every Bugdom level to the original family and area defaults", () => {
    const expected = [
      ["lawn", "training"], ["lawn", "lawn-area"], ["pond", "training"],
      ["forest", "beach"], ["forest", "flight"], ["hive", "hive-area"],
      ["hive", "queen-bee"], ["night", "training"], ["anthill", "ant-hill"],
      ["anthill", "ant-king"],
    ] as const;

    expected.forEach(([family, area], levelIndex) => {
      const levelInfo = GAME_PORT_CONFIGS[Game.BUGDOM].levels[levelIndex];
      expect(levelInfo).toBeDefined();
      if (!levelInfo) return;
      const rules = getLevelMetadataDetails(Game.BUGDOM, levelIndex, levelInfo).runtimeRules;
      const familyRule = rules.find((rule) => rule.key === "level.terrainFamily");
      const areaRule = rules.find((rule) => rule.key === "level.area");
      expect(familyRule?.value).toBe(family);
      expect(familyRule?.defaultValue).toBe(family);
      expect(areaRule?.value).toBe(area);
      expect(areaRule?.defaultValue).toBe(area);
    });
  });

  it("selects embedded or companion Meta output for every game", () => {
    expect(getMetadataResourceMode(Game.OTTO_MATIC)).toBe("embedded");
    expect(getMetadataResourceMode(Game.BUGDOM)).toBe("embedded");
    expect(getMetadataResourceMode(Game.BUGDOM_2)).toBe("embedded");
    expect(getMetadataResourceMode(Game.NANOSAUR_2)).toBe("embedded");
    expect(getMetadataResourceMode(Game.CRO_MAG)).toBe("embedded");
    expect(getMetadataResourceMode(Game.BILLY_FRONTIER)).toBe("embedded");
    expect(getMetadataResourceMode(Game.NANOSAUR)).toBe("companion");
    expect(getMetadataResourceMode(Game.MIGHTY_MIKE)).toBe("companion");
  });

  it("exposes only runtime-backed Mighty Mike settings as editable", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.MIGHTY_MIKE].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.MIGHTY_MIKE, 0, levelInfo);
    expect(details.runtimeRules.filter((rule) => rule.editable).map((rule) => rule.key)).toEqual([
      "scene.sound",
      "scene.cinema",
      "scene.infobar",
      "scene.bonus",
      "scene.progression",
      "scene.bunnyCounts",
      "scene.weaponUnlocks",
      "area.traps",
      "area.doors",
      "area.character",
      "area.projectiles",
    ]);
    expect(details.runtimeRules.filter((rule) => rule.editable).every((rule) => rule.control.kind === "select")).toBe(true);
  });

  it("gives Mighty Mike scene choices descriptive labels and original defaults", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.MIGHTY_MIKE].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const rules = getLevelMetadataDetails(Game.MIGHTY_MIKE, 0, levelInfo)
      .runtimeRules.filter((rule) => rule.editable);
    const soundRule = rules.find((rule) => rule.key === "scene.sound");
    expect(soundRule).toBeDefined();
    if (!soundRule || soundRule.control.kind !== "select") return;

    expect(soundRule.defaultValue ?? soundRule.value).toBe("jurassic");
    expect(getMetadataRuleValueLabel(soundRule, "source-default")).toBe(
      "Use original game behavior",
    );
    expect(getMetadataRuleValueLabel(soundRule, "jurassic")).toBe(
      "Jurassic — Prehistoric Plaza",
    );
    expect(getMetadataRuleValueLabel(soundRule, "bargain")).toBe(
      "Bargain — Bargain Bin",
    );
    rules.forEach((rule) => {
      if (rule.control.kind !== "select") return;
      const selectControl = rule.control;
      selectControl.options.forEach((option) => {
        expect(selectControl.optionDescriptions?.[option]).toBeTruthy();
        expect(selectControl.optionDescriptions?.[option]?.length).toBeGreaterThan(30);
      });
    });
  });

  it("does not expose inactive Nanosaur 1 metadata fields as editable", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.NANOSAUR].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.NANOSAUR, 0, levelInfo);
    expect(details.runtimeRules.map((rule) => rule.key)).toEqual([
      "level.id",
      "level.art",
      "level.terrain",
      "level.playerStart",
      "level.itemState",
      "level.unsupported",
    ]);
    expect(details.runtimeRules.every((rule) => !rule.editable)).toBe(true);
    expect(details.runtimeRules.every((rule) => rule.citations.length > 0)).toBe(true);
    expect(details.runtimeRules.map((rule) => rule.status)).toEqual(
      details.runtimeRules.map(() => "resolved"),
    );
  });

  it("validates the four-character Meta resource shape", () => {
    const result = metadataResourceTypeSchema.safeParse({
      1000: {
        name: "Level Metadata",
        obj: {
          schemaVersion: 1,
          game: "Otto Matic",
          identity: "Blob Boss",
          properties: { "level.gravity": "3900" },
        },
        order: 0,
      },
    });

    expect(result.success).toBe(true);
  });
});
