import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS, getLevelIndex } from "@/editor/utils/gamePortConfig";
import { describe, expect, it } from "vitest";
import { getLevelMetadataDetails } from "./levelMetadata";
import {
  getMetadataResourceMode,
  hasMetadataProperty,
  resetMetadataResource,
  updateMetadataResource,
} from "./metadataResource";
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

function getMetadataReaderCall(game: Game, key: string): string | undefined {
  const floatKeys: Readonly<Record<number, readonly string[]>> = {
    [Game.BUGDOM_2]: [
      "level.renderingBackgroundR", "level.renderingBackgroundG", "level.renderingBackgroundB",
      "level.renderingFogStart", "level.renderingFogEnd", "level.renderingTerrainScale",
      "level.renderingFieldOfView", "level.lightingAmbientR", "level.lightingAmbientG",
      "level.lightingAmbientB", "level.lightingFill1X", "level.lightingFill1Y", "level.lightingFill1Z",
      "level.lightingFill1R", "level.lightingFill1G", "level.lightingFill1B", "level.lightingFill2X",
      "level.lightingFill2Y", "level.lightingFill2Z", "level.lightingFill2R", "level.lightingFill2G",
      "level.lightingFill2B",
    ],
    [Game.CRO_MAG]: [
      "track.lightingSunX", "track.lightingSunY", "track.lightingSunZ", "track.lightingAmbientR",
      "track.lightingAmbientG", "track.lightingAmbientB", "track.lightingFillR", "track.lightingFillG",
      "track.lightingFillB", "track.skyRed", "track.skyGreen", "track.skyBlue",
    ],
    [Game.NANOSAUR_2]: [
      "level.renderingBackgroundR", "level.renderingBackgroundG", "level.renderingBackgroundB",
      "level.renderingFogStart", "level.renderingFogEnd", "level.renderingAmbientR",
      "level.renderingAmbientG", "level.renderingAmbientB", "level.renderingSunX", "level.renderingSunY",
      "level.renderingSunZ", "level.renderingFillR", "level.renderingFillG", "level.renderingFillB",
    ],
  };
  if (floatKeys[game]?.includes(key)) return `GetLevelMetadataFloat("${key}"`;
  const boolKeys: Readonly<Record<number, readonly string[]>> = {
    [Game.BUGDOM_2]: ["level.renderingFog", "level.renderingLensFlare"],
    [Game.NANOSAUR_2]: ["level.renderingLensFlare"],
  };
  if (boolKeys[game]?.includes(key)) return `GetLevelMetadataBool("${key}"`;
  if (game === Game.BUGDOM_2 && key === "level.lightingFillCount") return `GetLevelMetadataString("${key}"`;
  if (game === Game.CRO_MAG && ["track.lighting", "track.sky"].includes(key)) return `TrackMetadataProfileIs("${key}"`;
  switch (game) {
    case Game.BILLY_FRONTIER:
    case Game.CRO_MAG:
      return `LevelMetadataProfileIs("${key}"`;
    case Game.BUGDOM:
      if (["level.flyingBeeSetup", "level.workerBeeSetup", "level.beeFlightRegeneration", "level.queenBeeRegeneration", "level.antKing", "level.beachNutRegeneration", "level.dragonflyRide", "level.splineItems", "presentation.levelIntro"].includes(key)) {
        return `LevelMetadataProfileIs("${key}"`;
      }
      return `LevelMetadataCaseFor("${key}"`;
    case Game.BUGDOM_2:
      return `LevelMetadataCaseFor("${key}"`;
    case Game.MIGHTY_MIKE:
      return `LevelMetadataScene("${key}"`;
    case Game.NANOSAUR:
      return undefined;
    case Game.NANOSAUR_2:
      if (key === "level.mapView") return `LevelMetadataMapViewFor("${key}"`;
      if (["level.doorMotion", "level.flightHeight", "level.intro", "level.minePlacement", "level.raceMarkers", "level.turretRange"].includes(key)) {
        return `LevelMetadataProfileIs("${key}"`;
      }
      return `LevelMetadataCaseFor("${key}"`;
    case Game.OTTO_MATIC:
      return undefined;
  }
}

describe("level metadata details", () => {
  it("keeps metadata properties sparse and resets them independently", () => {
    const first = updateMetadataResource(
      undefined,
      Game.OTTO_MATIC,
      "Blob World",
      "level.gravity",
      "3900",
    );
    expect(first.properties).toEqual({ "level.gravity": "3900" });
    expect(hasMetadataProperty(first, "level.gravity")).toBe(true);
    expect(hasMetadataProperty(first, "level.tileSlipperiness")).toBe(false);

    const second = updateMetadataResource(
      first,
      Game.OTTO_MATIC,
      "Blob World",
      "level.tileSlipperiness",
      "0.1",
    );
    expect(second.properties).toEqual({
      "level.gravity": "3900",
      "level.tileSlipperiness": "0.1",
    });

    const resetOne = resetMetadataResource(second, "level.gravity");
    expect(resetOne?.properties).toEqual({ "level.tileSlipperiness": "0.1" });
    expect(resetMetadataResource(resetOne, "level.tileSlipperiness")).toBeUndefined();
  });

  it("keeps Mighty Mike scene overrides sparse and identity-scoped", () => {
    const first = updateMetadataResource(
      undefined,
      Game.MIGHTY_MIKE,
      "Jurassic 1",
      "scene.sound",
      "bargain",
    );
    expect(first).toEqual({
      schemaVersion: 1,
      game: "mightymike",
      identity: "Jurassic 1",
      properties: { "scene.sound": "bargain" },
    });

    const second = updateMetadataResource(
      first,
      Game.MIGHTY_MIKE,
      "Jurassic 1",
      "area.doors",
      "clown",
    );
    expect(second.properties).toEqual({
      "scene.sound": "bargain",
      "area.doors": "clown",
    });

    const nextArea = updateMetadataResource(
      second,
      Game.MIGHTY_MIKE,
      "Candy 2",
      "scene.cinema",
      "fairy",
    );
    expect(nextArea.properties).toEqual({ "scene.cinema": "fairy" });
    expect(resetMetadataResource(nextArea, "scene.cinema")).toBeUndefined();
  });

  it("keeps Nanosaur 2 overrides sparse across independent behavior settings", () => {
    const first = updateMetadataResource(
      undefined,
      Game.NANOSAUR_2,
      "level1",
      "level.minePlacement",
      "forest",
    );
    expect(first.properties).toEqual({ "level.minePlacement": "forest" });
    expect(hasMetadataProperty(first, "level.doorMotion")).toBe(false);

    const second = updateMetadataResource(
      first,
      Game.NANOSAUR_2,
      "level1",
      "level.doorMotion",
      "continuous",
    );
    expect(second.properties).toEqual({
      "level.minePlacement": "forest",
      "level.doorMotion": "continuous",
    });
    const resetMine = resetMetadataResource(second, "level.minePlacement");
    expect(resetMine?.properties).toEqual({ "level.doorMotion": "continuous" });
    expect(resetMetadataResource(resetMine, "level.doorMotion")).toBeUndefined();
  });

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
    expect(editableKeys).not.toContain("level.rendering");
    expect(editableKeys).not.toContain("level.lighting");
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

  it("keeps Otto fuel as a profile-valued dropdown", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[8];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const fuelRule = getLevelMetadataDetails(Game.OTTO_MATIC, 8, levelInfo).runtimeRules
      .find((rule) => rule.key === "level.rocketFuel");
    expect(fuelRule?.value).toBe("not-required");
    expect(fuelRule?.control).toEqual(expect.objectContaining({
      kind: "select",
      options: ["required", "not-required"],
    }));

    const playerSource = readFileSync(
      join(__dirname, "../../../../../games/pangea-ports/games/OttoMatic-Android/src/Player/Player.c"),
      "utf8",
    );
    expect(playerSource).toContain('LevelMetadataProfileIs("level.rocketFuel", "required"');
    expect(playerSource).not.toContain('GetLevelMetadataBool("level.rocketFuel"');
  });

  it("keeps every Otto metadata reader aligned with its control type", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[0];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const details = getLevelMetadataDetails(Game.OTTO_MATIC, 0, levelInfo);
    const rulesByKey = new Map(details.runtimeRules.map((rule) => [rule.key, rule]));
    const nativeSource = readNativeSourceTree(join(
      __dirname,
      "../../../../../games/pangea-ports/games/OttoMatic-Android/src",
    ));
    const checkboxKeys = [
      "level.brainAlien",
      "level.cloudPits",
      "level.cloudCannon",
      "level.cloudBalloonPowerups",
      "level.cloudTransparentBlack",
      "level.cloudTwoSidedTerrain",
      "level.cloudBlankTiles",
      "level.fences",
      "level.saucers",
      "level.blobEffects",
      "level.blobBossEffects",
      "level.cloudEffects",
      "level.blobBossMachine",
      "level.teleporters",
      "level.spacePods",
      "level.bumperCars",
      "level.jungleBoss",
      "level.zipLines",
      "level.brainBoss",
      "level.saucerMode",
      "level.rocketDoorStaysOpen",
      "level.environmentLensFlare",
      "level.rocketBossGate",
      "level.rocketTractorBeamGate",
      "level.exitHelp",
      "level.rocketExit",
      "level.blobLandingWell",
      "level.blobLandingDeformation",
      "level.blobBonusScreen",
      "level.robotStartHeight",
      "level.robotBlobBounce",
      "level.robotElectricFloor",
      "level.bonusTractorBeam",
      "level.introVisible",
      "level.introGlow",
      "level.finalLevel",
      "level.blobBossEnvMap",
      "level.growthPowerups",
      "level.reducedPowerupSparkles",
    ];
    checkboxKeys.forEach((key) => {
      expect(rulesByKey.get(key)?.control.kind, key).toBe("checkbox");
      expect(nativeSource, key).toContain(`GetLevelMetadataBool("${key}"`);
    });

    const profileKeys = [
      "level.camera",
      "level.introTiming",
      "level.jungleWeapons",
      "level.flytrapTargeting",
      "level.sky",
      "level.splineSurface",
      "level.transport",
      "level.zipLineStyle",
      "level.blobDeformation",
      "level.rocketExitTrigger",
      "level.rocketFuel",
    ];
    profileKeys.forEach((key) => {
      expect(rulesByKey.get(key)?.control.kind, key).toBe("select");
      expect(nativeSource, key).toContain(`LevelMetadataProfileIs("${key}"`);
    });

    const caseKeys = [
      "level.environment",
      "level.lighting",
      "level.autoFade",
      "level.player",
      "level.sky",
    ];
    caseKeys.forEach((key) => {
      expect(rulesByKey.get(key)?.control.kind, key).toBe("select");
      expect(nativeSource, key).toContain(`LevelMetadataCaseFor("${key}"`);
    });

    ["level.gravity", "level.tileSlipperiness"].forEach((key) => {
      expect(rulesByKey.get(key)?.control.kind, key).toBe("slider");
      expect(nativeSource, key).toContain(`ReadMetadataFloat(json, "${key}"`);
    });
    [
      "level.environmentViewDistance",
      "level.environmentBackgroundR",
      "level.environmentBackgroundG",
      "level.environmentBackgroundB",
      "level.lightingSunX",
      "level.lightingSunY",
      "level.lightingSunZ",
      "level.lightingAmbientR",
      "level.lightingAmbientG",
      "level.lightingAmbientB",
      "level.lightingFillR",
      "level.lightingFillG",
      "level.lightingFillB",
    ].forEach((key) => {
      expect(rulesByKey.get(key)?.control.kind, key).toBe("slider");
      expect(nativeSource, key).toContain(`GetLevelMetadataFloat("${key}"`);
    });
    expect(nativeSource).not.toContain('LevelMetadataCaseFor("level.assetIdentity"');
  });

  it("keeps non-Otto metadata controls connected to native readers", () => {
    const gameRoots: readonly (readonly [Game, string])[] = [
      [Game.BILLY_FRONTIER, "../../../../../games/pangea-ports/games/BillyFrontier-Android/Source"],
      [Game.BUGDOM, "../../../../../games/pangea-ports/games/Bugdom-android/src"],
      [Game.BUGDOM_2, "../../../../../games/pangea-ports/games/Bugdom2-Android/Source"],
      [Game.CRO_MAG, "../../../../../games/pangea-ports/games/CroMagRally-Android/Source"],
      [Game.MIGHTY_MIKE, "../../../../../games/pangea-ports/games/MightyMike-Android/src"],
      [Game.NANOSAUR, "../../../../../games/pangea-ports/games/Nanosaur-android/src"],
      [Game.NANOSAUR_2, "../../../../../games/pangea-ports/games/Nanosaur2-Android/Source"],
    ];

    gameRoots.forEach(([game, root]) => {
      const levelInfo = GAME_PORT_CONFIGS[game].levels[0];
      expect(levelInfo).toBeDefined();
      if (!levelInfo) return;

      const rules = getLevelMetadataDetails(game, 0, levelInfo).runtimeRules;
      const nativeSource = readNativeSourceTree(join(__dirname, root));
      const editableRules = rules.filter((rule) => rule.editable);

      expect(editableRules.every((rule) => ["select", "slider", "checkbox"].includes(rule.control.kind)), String(game)).toBe(true);
      if (![Game.BUGDOM_2, Game.NANOSAUR_2].includes(game)) {
        expect(nativeSource, String(game)).not.toContain('GetLevelMetadataBool("');
      }
      editableRules.forEach((rule) => {
        const readerCall = getMetadataReaderCall(game, rule.key);
        expect(readerCall, `${game} ${rule.key}`).toBeDefined();
        if (!readerCall) return;
        expect(nativeSource, `${game} ${rule.key}`).toContain(readerCall);
      });
    });
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
      "level.environmentViewDistance",
      "level.environmentBackgroundR",
      "level.environmentBackgroundG",
      "level.environmentBackgroundB",
      "level.environmentLensFlare",
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
      "level.lightingSunX",
      "level.lightingSunY",
      "level.lightingSunZ",
      "level.lightingAmbientR",
      "level.lightingAmbientG",
      "level.lightingAmbientB",
      "level.lightingFillR",
      "level.lightingFillG",
      "level.lightingFillB",
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
    expect(nativeSource).toContain('LevelMetadataUsesCustomValues("level.environment")');
    expect(nativeSource).toContain('LevelMetadataUsesCustomValues("level.lighting")');
  });

  it("lists Otto's actual environment and lighting values in slider metadata", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[4];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const rules = getLevelMetadataDetails(Game.OTTO_MATIC, 4, levelInfo).runtimeRules;
    const valuesFor = (key: string): readonly number[] => {
      const rule = rules.find((candidate) => candidate.key === key);
      if (!rule || rule.control.kind !== "slider") return [];
      return rule.control.gameValues?.map((gameValue) => gameValue.value) ?? [];
    };

    expect(valuesFor("level.environmentBackgroundR")).toEqual([0, 0.1, 0.17, 0.2, 0.6, 0.686, 0.8]);
    expect(valuesFor("level.environmentBackgroundG")).toEqual([0, 0.05, 0.137, 0.4, 0.5, 0.6]);
    expect(valuesFor("level.environmentBackgroundB")).toEqual([0, 0.1, 0.29, 0.3, 0.431, 0.7, 0.8]);
    expect(valuesFor("level.lightingAmbientG")).toEqual([0.2, 0.25, 0.3, 0.4]);
    expect(valuesFor("level.lightingAmbientB")).toEqual([0.2, 0.25, 0.3, 0.36]);
  });

  it("groups Otto presets with their determined values and exposes custom editing", () => {
    const levelInfo = GAME_PORT_CONFIGS[Game.OTTO_MATIC].levels[4];
    expect(levelInfo).toBeDefined();
    if (!levelInfo) return;

    const rules = getLevelMetadataDetails(Game.OTTO_MATIC, 4, levelInfo).runtimeRules;
    const environmentPreset = rules.find((rule) => rule.key === "level.environment");
    const environmentDistance = rules.find((rule) => rule.key === "level.environmentViewDistance");
    const lightingPreset = rules.find((rule) => rule.key === "level.lighting");
    const lightingSun = rules.find((rule) => rule.key === "level.lightingSunX");

    expect(environmentPreset?.control).toEqual(expect.objectContaining({
      kind: "select",
      options: expect.arrayContaining(["custom"]),
    }));
    expect(environmentPreset?.group?.id).toBe("otto-environment");
    expect(environmentPreset?.groupRole).toBe("preset");
    expect(environmentDistance?.group?.id).toBe("otto-environment");
    expect(environmentDistance?.groupRole).toBe("determined");
    expect(environmentPreset?.group?.determinedValues.cloud?.["level.environmentViewDistance"]).toBe("1");

    expect(lightingPreset?.control).toEqual(expect.objectContaining({
      kind: "select",
      options: expect.arrayContaining(["custom"]),
    }));
    expect(lightingPreset?.group?.id).toBe("otto-lighting");
    expect(lightingSun?.group?.id).toBe("otto-lighting");
    expect(lightingSun?.groupRole).toBe("determined");
  });

  it("groups the other visual profiles with their underlying values", () => {
    const bugdom2Rules = getLevelMetadataDetails(
      Game.BUGDOM_2,
      2,
      GAME_PORT_CONFIGS[Game.BUGDOM_2].levels[2],
    ).runtimeRules;
    const bugdom2Rendering = bugdom2Rules.find((rule) => rule.key === "level.rendering");
    const bugdom2Fog = bugdom2Rules.find((rule) => rule.key === "level.renderingFog");
    const bugdom2Background = bugdom2Rules.find((rule) => rule.key === "level.renderingBackgroundR");
    expect(bugdom2Rendering?.control).toEqual(expect.objectContaining({ options: expect.arrayContaining(["custom"]) }));
    expect(bugdom2Rendering?.groupRole).toBe("preset");
    expect(bugdom2Fog?.group?.id).toBe("bugdom2-rendering");
    expect(bugdom2Rendering?.group?.determinedValues.fido?.["level.renderingFog"]).toBe("true");
    expect(bugdom2Background?.control).toEqual(expect.objectContaining({
      kind: "slider",
      gameValues: expect.arrayContaining([
        { value: 0.9, label: "Sidewalk" },
        { value: 0, label: "Balsa" },
      ]),
    }));

    const croMagRules = getLevelMetadataDetails(
      Game.CRO_MAG,
      2,
      GAME_PORT_CONFIGS[Game.CRO_MAG].levels[2],
    ).runtimeRules;
    const croMagLighting = croMagRules.find((rule) => rule.key === "track.lighting");
    const croMagAmbient = croMagRules.find((rule) => rule.key === "track.lightingAmbientR");
    const croMagSky = croMagRules.find((rule) => rule.key === "track.sky");
    const croMagSkyRed = croMagRules.find((rule) => rule.key === "track.skyRed");
    expect(croMagLighting?.control).toEqual(expect.objectContaining({ options: expect.arrayContaining(["custom"]) }));
    expect(croMagAmbient?.group?.id).toBe("cromag-lighting");
    expect(croMagLighting?.group?.determinedValues.ice?.["track.lightingAmbientR"]).toBe("0.7");
    expect(croMagSky?.control).toEqual(expect.objectContaining({ options: expect.arrayContaining(["custom"]) }));
    expect(croMagSkyRed?.control).toEqual(expect.objectContaining({
      kind: "slider",
      gameValues: expect.arrayContaining([
        { value: 153 / 255, label: "Desert" },
        { value: 61 / 255, label: "Coliseum" },
      ]),
    }));

    const nanosaur2Rules = getLevelMetadataDetails(
      Game.NANOSAUR_2,
      0,
      GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels[0],
    ).runtimeRules;
    const nanosaur2Rendering = nanosaur2Rules.find((rule) => rule.key === "level.rendering");
    const nanosaur2Fog = nanosaur2Rules.find((rule) => rule.key === "level.renderingFogStart");
    const nanosaur2Background = nanosaur2Rules.find((rule) => rule.key === "level.renderingBackgroundR");
    expect(nanosaur2Rendering?.control).toEqual(expect.objectContaining({ options: expect.arrayContaining(["custom"]) }));
    expect(nanosaur2Fog?.group?.id).toBe("nanosaur2-rendering");
    expect(nanosaur2Rendering?.group?.determinedValues.forest?.["level.renderingFogStart"]).toBe("0.35");
    expect(nanosaur2Background?.control).toEqual(expect.objectContaining({
      kind: "slider",
      gameValues: expect.arrayContaining([
        { value: 0.43, label: "Forest" },
        { value: 0.968, label: "Desert" },
      ]),
    }));
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
      "level.renderingBackgroundR",
      "level.renderingBackgroundG",
      "level.renderingBackgroundB",
      "level.renderingFogStart",
      "level.renderingFogEnd",
      "level.renderingAmbientR",
      "level.renderingAmbientG",
      "level.renderingAmbientB",
      "level.renderingSunX",
      "level.renderingSunY",
      "level.renderingSunZ",
      "level.renderingFillR",
      "level.renderingFillG",
      "level.renderingFillB",
      "level.renderingLensFlare",
    ];
    GAME_PORT_CONFIGS[Game.NANOSAUR_2].levels.forEach((levelInfo, levelIndex) => {
      const details = getLevelMetadataDetails(Game.NANOSAUR_2, levelIndex, levelInfo);
      const editableRules = details.runtimeRules.filter((rule) => rule.editable);
      expect(editableRules.map((rule) => rule.key)).toEqual(expectedKeys);
      expect(editableRules.every((rule) => rule.citations.length > 0)).toBe(true);
      expect(editableRules.every((rule) => ["select", "slider", "checkbox"].includes(rule.control.kind))).toBe(true);
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
      "track.lightingSunX",
      "track.lightingSunY",
      "track.lightingSunZ",
      "track.lightingAmbientR",
      "track.lightingAmbientG",
      "track.lightingAmbientB",
      "track.lightingFillR",
      "track.lightingFillG",
      "track.lightingFillB",
      "track.sky",
      "track.skyRed",
      "track.skyGreen",
      "track.skyBlue",
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

  it("rejects structurally incomplete Billy metadata before reading properties", () => {
    const portRoot = join(__dirname, "../../../../../games/pangea-ports/games/BillyFrontier-Android/Source");
    const fileSource = readFileSync(join(portRoot, "System/File.c"), "utf8");
    expect(fileSource).toContain("MetadataJSONLooksValid");
    expect(fileSource).toContain("!MetadataJSONLooksValid(json)");
    expect(fileSource).toContain("lastSignificant == '}'");
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

  it("loads Mighty Mike metadata before first-area audio and validates its document boundary", () => {
    const portRoot = join(__dirname, "../../../../../games/pangea-ports/games/MightyMike-Android/src");
    const mainSource = readFileSync(join(portRoot, "Heart/Main.c"), "utf8");
    const metadataSource = readFileSync(join(portRoot, "System/LevelMetadata.c"), "utf8");
    const cmakeSource = readFileSync(join(portRoot, "..", "CMakeLists.txt"), "utf8");
    const initAreaSource = mainSource.slice(
      mainSource.indexOf("void InitArea(void)"),
      mainSource.indexOf("void LoadAreaArt(void)"),
    );
    const loadAreaArtSource = mainSource.slice(mainSource.indexOf("void LoadAreaArt(void)"));
    expect(initAreaSource.indexOf("LoadAreaArt();")).toBeLessThan(
      initAreaSource.indexOf("PlayAreaMusic();"),
    );
    expect(loadAreaArtSource.indexOf("LoadLevelMetadata(gCustomMapPath")).toBeLessThan(
      loadAreaArtSource.indexOf("LoadPlayfield(path);"),
    );
    expect(metadataSource).toContain("static Boolean IsBalancedJSON");
    expect(metadataSource).toContain("!IsBalancedJSON(json)");
    expect(metadataSource).toContain('#include "LevelMetadataJSON.h"');
    expect(metadataSource).toContain("PangeaLevelMetadataJSONIsValid");
    expect(cmakeSource).toContain('option(PANGEA_ENABLE_LEVEL_METADATA "Enable per-level metadata overrides" ON)');
    expect(metadataSource).toContain("#if defined(PANGEA_ENABLE_LEVEL_METADATA)");
    expect(metadataSource).toContain("return fallback;");
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

	it("loads Nanosaur 1 companion metadata without making identity editable", () => {
		const source = readNativeSourceTree(join(__dirname, "../../../../../games/pangea-ports/games/Nanosaur-android/src"));
		const mainSource = readFileSync(join(__dirname, "../../../../../games/pangea-ports/games/Nanosaur-android/src/System/Main.c"), "utf8");
		const fileSource = readFileSync(join(__dirname, "../../../../../games/pangea-ports/games/Nanosaur-android/src/System/File.c"), "utf8");
		expect(mainSource).toContain("LoadNanosaurMetadata");
		expect(fileSource).toContain('PangeaLevelMetadataJSONIsValid(json, length, "nanosaur1")');
		expect(fileSource).toContain("PANGEA_ENABLE_LEVEL_METADATA");
		expect(source).not.toContain("gNanosaurMetadataLevel");
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
