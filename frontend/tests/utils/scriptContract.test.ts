import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  SCRIPTING_CONTRACT,
  SCRIPT_PERSISTENCE_LIMITS,
  validateScriptingContract,
} from "@/editor/subviews/scripts/scriptContract";
import {
  validateUploadedScriptAsset,
  validateUploadedScriptAssetAsync,
} from "@/editor/subviews/scripts/scriptAssetValidation";
import { scriptHookIdSchema } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import { AUTHORITATIVE_API_SCHEMA } from "@/editor/subviews/scripts/scriptApiSchema";
import {
  CAPABILITY_MATRIX,
  getHookCapabilityKey,
} from "@/editor/subviews/scripts/scriptCapabilityMatrix";
import { renderScriptingContractCMetadata } from "../../scripts/scriptingContractCMetadata";
import { getScriptingContractResultShapes, renderScriptingContractDocumentationIndex } from "../../scripts/scriptingContractDocumentation";
import {
  getNativeReplacementCompatibility,
  getNativeReplacementDecision,
  NATIVE_ITEM_AUDIT,
  validateNativeReplacementBatch,
  validateNativeReplacement,
} from "@/editor/subviews/scripts/scriptNativeAudit";

describe("scripting contract", () => {
  it("renders the checked-in C metadata from the validated contract", () => {
    const metadataPath = join(
      process.cwd(),
      "../games/pangea-ports/shared/script/pangea_script_contract.h",
    );
    expect(readFileSync(metadataPath, "utf8")).toBe(
      renderScriptingContractCMetadata(SCRIPTING_CONTRACT),
    );
  });

  it("keeps API and capability metadata aligned for every adapter", () => {
    expect(validateScriptingContract().isOk()).toBe(true);
    expect(Object.keys(SCRIPTING_CONTRACT.games)).toHaveLength(8);
    expect(SCRIPTING_CONTRACT.contractVersion).toBe(1);
    expect(SCRIPTING_CONTRACT.apiVersion).toBe(1);
    expect(SCRIPTING_CONTRACT.persistentStorage).toEqual(SCRIPT_PERSISTENCE_LIMITS);
  });

  it("declares specialized editor completion behavior in the API contract", () => {
    const nativeSpawn = AUTHORITATIVE_API_SCHEMA.apis.find(
      (api) => api.name === "pangea.spawn.native",
    );
    expect(nativeSpawn?.completion).toBe("native-spawn");
    expect(
      AUTHORITATIVE_API_SCHEMA.apis.filter((api) => api.completion === "native-spawn"),
    ).toHaveLength(1);
  });

  it("derives every documented result shape from the contract", () => {
    expect(getScriptingContractResultShapes(SCRIPTING_CONTRACT)).toEqual(
      expect.arrayContaining([
        "ItemSpawnResult",
        "ObjectCommandResult",
        "PangeaDiagnostics",
      ]),
    );
  });

  it("renders API descriptions and signatures from the contract", () => {
    const documentation = renderScriptingContractDocumentationIndex(SCRIPTING_CONTRACT);
    expect(documentation).toContain("API reference:");
    expect(documentation).toContain("pangea.object.setCollisionEnabled(handle: objectHandle, enabled: boolean): boolean");
    expect(documentation).toContain("Enables or disables an object's native collision checks.");
  });

  it("declares bounded versioned persistence policy", () => {
    expect(SCRIPTING_CONTRACT.persistentStorage.supportedTypes).toEqual([
      "string",
      "boolean",
      "integer",
      "number",
    ]);
    expect(SCRIPTING_CONTRACT.persistentStorage.versionMismatch).toBe("discard");
    expect(SCRIPTING_CONTRACT.persistentStorage.maxValueBytes).toBe(4096);
    expect(SCRIPTING_CONTRACT.persistentStorage.maxTotalBytes).toBe(16384);
  });

  it("represents game lifecycle hooks in editor state", () => {
    expect(scriptHookIdSchema.parse("onGameStart")).toBe("onGameStart");
    expect(scriptHookIdSchema.parse("onGameShutdown")).toBe("onGameShutdown");
  });

  it("classifies race and objective hooks against their adapter capabilities", () => {
    expect(getHookCapabilityKey("onCheckpointReached")).toBe("checkpointEvents");
    expect(getHookCapabilityKey("onLapComplete")).toBe("raceProgressEvents");
    expect(getHookCapabilityKey("onRaceFinish")).toBe("raceProgressEvents");
    expect(getHookCapabilityKey("onObjectiveComplete")).toBe("objectiveEvents");
    expect(CAPABILITY_MATRIX["Nanosaur2-Android"]).toMatchObject({
      checkpointEvents: "supported",
      raceProgressEvents: "supported",
      objectiveEvents: "supported",
    });
    expect(CAPABILITY_MATRIX["OttoMatic-Android"]).toMatchObject({
      raceProgressEvents: "unsupported",
      objectiveEvents: "unsupported",
    });
    expect(CAPABILITY_MATRIX["CroMagRally-Android"]).toMatchObject({
      playerInvulnerability: "unsupported",
    });
    expect(CAPABILITY_MATRIX["MightyMike-Android"]).toMatchObject({
      playerInvulnerability: "supported",
    });
    expect(CAPABILITY_MATRIX["Nanosaur2-Android"]).toMatchObject({
      playerCommands: "supported",
      levelMetadata: "supported",
      raceMetadata: "supported",
      objectiveMetadata: "supported",
      pickupScoreEffects: "unsupported",
    });
    expect(CAPABILITY_MATRIX["CroMagRally-Android"]).toMatchObject({
      raceMetadata: "supported",
    });
    expect(CAPABILITY_MATRIX["OttoMatic-Android"]).toMatchObject({
      raceMetadata: "unsupported",
    });
    expect(CAPABILITY_MATRIX["Bugdom2-Android"]).toMatchObject({
      objectiveMetadata: "unsupported",
      objectCollision: "supported",
    });
    expect(CAPABILITY_MATRIX["BillyFrontier-Android"]).toMatchObject({
      pickupScoreEffects: "supported",
    });
    expect(CAPABILITY_MATRIX["MightyMike-Android"]).toMatchObject({
      objectCollision: "unsupported",
    });
  });

  it("describes the native collision object command", () => {
    const collisionCommand = AUTHORITATIVE_API_SCHEMA.apis.find(
      (api) => api.name === "pangea.object.setCollisionEnabled",
    );
    expect(collisionCommand?.command).toMatchObject({
      capability: "object-collision",
      applicationPhase: "callback",
    });
  });

  it("advertises Bugdom 2 player gameplay hooks only for its real adapter call sites", () => {
    const bugdom2 = AUTHORITATIVE_API_SCHEMA.games.find(
      (game) => game.gameId === "Bugdom2-Android",
    );
    const gameplayHooks = [
      "onDamage",
      "onDamageApplied",
      "onWeaponHit",
      "onDeath",
      "onPlayerSpawn",
      "onPlayerRespawn",
    ];

    expect(bugdom2?.supportedHooks).toEqual(
      expect.arrayContaining(gameplayHooks),
    );
    expect(
      AUTHORITATIVE_API_SCHEMA.games
        .filter((game) => game.supportedHooks.includes("onDamageApplied"))
        .map((game) => game.gameId),
    ).toEqual([
      "OttoMatic-Android",
      "Bugdom-android",
      "Bugdom2-Android",
      "Nanosaur-android",
      "Nanosaur2-Android",
      "CroMagRally-Android",
      "BillyFrontier-Android",
      "MightyMike-Android",
    ]);
    expect(
      AUTHORITATIVE_API_SCHEMA.games
        .filter((game) => game.supportedHooks.includes("onPlayerSpawn"))
        .map((game) => game.gameId),
    ).toEqual([
      "OttoMatic-Android",
      "Bugdom-android",
      "Bugdom2-Android",
      "Nanosaur-android",
      "Nanosaur2-Android",
      "CroMagRally-Android",
      "BillyFrontier-Android",
      "MightyMike-Android",
    ]);
    expect(
      AUTHORITATIVE_API_SCHEMA.games
        .filter((game) => game.supportedHooks.includes("onPlayerRespawn"))
        .map((game) => game.gameId),
    ).toEqual([
      "OttoMatic-Android",
      "Bugdom-android",
      "Bugdom2-Android",
      "Nanosaur-android",
      "Nanosaur2-Android",
      "MightyMike-Android",
    ]);
    expect(CAPABILITY_MATRIX["Bugdom2-Android"]).toMatchObject({
      damageEvents: "supported",
      playerLifecycleEvents: "supported",
      weaponHitEvents: "supported",
    });
    for (const game of AUTHORITATIVE_API_SCHEMA.games) {
      if (game.gameId === "Bugdom2-Android") continue;
      const supportsDamage = [
        "OttoMatic-Android",
        "Bugdom-android",
        "Nanosaur-android",
        "Nanosaur2-Android",
        "CroMagRally-Android",
        "BillyFrontier-Android",
        "MightyMike-Android",
      ].includes(game.gameId);
      const supportsDeath = [
        "OttoMatic-Android",
        "Bugdom-android",
        "Nanosaur-android",
        "Nanosaur2-Android",
        "CroMagRally-Android",
        "BillyFrontier-Android",
        "MightyMike-Android",
      ].includes(game.gameId);
      expect(game.supportedHooks).toEqual(
        supportsDamage
          ? expect.arrayContaining(["onDamage"])
          : expect.not.arrayContaining(["onDamage"]),
      );
      expect(game.supportedHooks).toEqual(
        supportsDeath
          ? expect.arrayContaining(["onDeath"])
          : expect.not.arrayContaining(["onDeath"]),
      );
      expect(CAPABILITY_MATRIX[game.gameId]).toMatchObject({
        damageEvents: supportsDamage ? "supported" : "unsupported",
        playerLifecycleEvents: supportsDeath ? "supported" : "unsupported",
      });
    }
  });

  it("declares validation and execution policy for every typed object command", () => {
    const commands = SCRIPTING_CONTRACT.api.apis.filter(
      (api) => api.command !== undefined,
    );
    expect(commands).toHaveLength(28);
    for (const command of commands) {
      expect(command.command?.capability).toBeTruthy();
      expect(command.command?.authority).toBe("disabled-network");
      expect(command.command?.applicationPhase).toBe("callback");
      expect(command.command?.validation.length).toBeGreaterThan(0);
    }
  });

  it("declares cleanup and handle policy for every object lifecycle event", () => {
    const events = SCRIPTING_CONTRACT.objectEvents;
    expect(events).toHaveLength(13);
    expect(events.find((event) => event.id === "checkpointReset")?.cleanup).toBe("owner-resources");
    expect(events.find((event) => event.id === "checkpointReset")?.statePolicy).toBe("preserve");
    expect(events.find((event) => event.id === "deactivate")?.statePolicy).toBe("clear");
    expect(events.find((event) => event.id === "streamOut")?.invalidatesHandle).toBe(true);
    expect(events.find((event) => event.id === "destroy")?.invalidatesHandle).toBe(true);
    expect(events.filter((event) => event.invalidatesHandle)).toHaveLength(2);
  });

  it("classifies registered native families before replacement", () => {
    expect(NATIVE_ITEM_AUDIT.length).toBeGreaterThan(0);
    for (const game of Object.keys(SCRIPTING_CONTRACT.games)) {
      expect(NATIVE_ITEM_AUDIT.some((item) => item.gameId === game)).toBe(true);
    }
    expect(validateNativeReplacement("OttoMatic-Android", 1).isOk()).toBe(true);
    expect(validateNativeReplacement("OttoMatic-Android", 999999).isErr()).toBe(true);
    for (const item of NATIVE_ITEM_AUDIT) {
      expect(item.requiredAssets.length).toBeGreaterThan(0);
      expect(item.supportedModes.length).toBeGreaterThan(0);
      expect(item.lifecycle).toBeTruthy();
      expect(item.modeAudit).toBeTruthy();
      expect(item.auditBasis).toBeTruthy();
      expect(item.replacementSurface).toBeTruthy();
      expect(item.streaming).toBeTruthy();
      expect(item.childObjects).toBeTruthy();
      expect(item.saveBehavior).toBeTruthy();
      expect(item.runtimeVerification).toBeTruthy();
    }
    expect(getNativeItemAuditForTest("OttoMatic-Android", 1)).toMatchObject({
      classification: "replaceable-with-native-hooks",
      replacementSurface: "terrain",
      streaming: "source-driven",
      modeAudit: "all-declared-modes",
      childObjects: "none-observed",
      saveBehavior: "not-persistent",
    });
    expect(getNativeItemAuditForTest("OttoMatic-Android", 4)).toMatchObject({
      classification: "native-only",
      replacementSurface: "none",
      modeAudit: "all-declared-modes",
      fallback: "skip-replacement",
    });
    expect(getNativeItemAuditForTest("Bugdom2-Android", 35)?.runtimeVerification).toBe("constructor-probe");
    expect(getNativeItemAuditForTest("Nanosaur-android", 5)?.runtimeVerification).toBe("constructor-probe");
    expect(getNativeItemAuditForTest("MightyMike-Android", 3)?.runtimeVerification).toBe("constructor-probe");
    const terrainAudit = getNativeReplacementDecision("OttoMatic-Android", 1, false);
    expect(terrainAudit.isOk()).toBe(true);
    expect(getNativeReplacementDecision("OttoMatic-Android", 4, false).isOk()).toBe(true);
    expect(getNativeReplacementDecision("OttoMatic-Android", 4, true).isErr()).toBe(true);
    expect(
      getNativeReplacementCompatibility("OttoMatic-Android", 1),
    ).toMatchObject({
      allowed: true,
      tone: "warning",
      auditWarnings: ["runtime verification"],
    });
    expect(
      getNativeReplacementCompatibility("OttoMatic-Android", 4),
    ).toMatchObject({ allowed: true, tone: "warning" });
    expect(
      getNativeReplacementCompatibility("OttoMatic-Android", 999999),
    ).toMatchObject({ allowed: false, tone: "danger" });
    expect(
      getNativeReplacementCompatibility("MightyMike-Android", 3, "map"),
    ).toMatchObject({
      allowed: true,
      tone: "warning",
      auditWarnings: ["runtime verification"],
    });
    expect(
      getNativeReplacementCompatibility("MightyMike-Android", 3, "terrain"),
    ).toMatchObject({ allowed: false, tone: "danger" });
    const mapDecision = getNativeReplacementDecision(
      "MightyMike-Android",
      3,
      false,
      "map",
    );
    expect(mapDecision.isOk() ? mapDecision.value.replacementSurface : null).toBe("map");
    const batch = validateNativeReplacementBatch(
      "OttoMatic-Android",
      [1, 1, 4],
      false,
    );
    expect(batch.isOk()).toBe(true);
    expect(batch.isOk() ? batch.value : []).toHaveLength(2);
    const mapBatch = validateNativeReplacementBatch(
      "MightyMike-Android",
      [3],
      false,
      "map",
    );
    expect(mapBatch.isOk()).toBe(true);
    expect(
      validateNativeReplacementBatch("MightyMike-Android", [3], false, "terrain").isErr(),
    ).toBe(true);
    expect(
      validateNativeReplacementBatch("OttoMatic-Android", [], false).isErr(),
    ).toBe(true);
  });

  it("rejects malformed native assets before they enter a package", () => {
    const result = validateUploadedScriptAsset(
      "Data/Scripts/assets/models/beacon.bg3d",
      new Uint8Array([0x42, 0x47, 0x33, 0x44]),
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : "").toContain("BG3D");
  });

  it("rejects unsafe asset paths before parsing bytes", () => {
    const result = validateUploadedScriptAsset(
      "Data/Scripts/assets/models/../beacon.bg3d",
      new Uint8Array([0x42]),
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : "").toContain("unsafe traversal");
  });

  it("parses uploaded skeleton resources before accepting them", async () => {
    const bytes = new Uint8Array(
      readFileSync(
        join(
          __dirname,
          "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
        ),
      ),
    );
    const result = await validateUploadedScriptAssetAsync(
      "Data/Scripts/assets/skeletons/blob.skeleton.rsrc",
      bytes,
    );

    expect(result.isOk()).toBe(true);
  });

  it("reports malformed skeleton resources at upload time", async () => {
    const result = await validateUploadedScriptAssetAsync(
      "Data/Scripts/assets/skeletons/broken.skeleton.rsrc",
      new Uint8Array([0x00, 0x01, 0x02]),
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : "").toContain("skeleton");
  });
});

function getNativeItemAuditForTest(gameId: string, nativeType: number) {
  const matches = NATIVE_ITEM_AUDIT.filter(
    (item) => item.gameId === gameId && item.nativeType === nativeType,
  );
  return matches.find((item) => item.nativeId.includes(".")) ?? matches[0];
}
