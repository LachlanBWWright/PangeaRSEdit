import { Result, ok, err } from "neverthrow";
import { z } from "zod";
import type {
  ScriptBehaviorDefinition,
  ScriptCustomObjectDefinition,
  ScriptWorkspaceContext,
} from "./scriptWorkspaceStateTypes";
import {
  scriptProjectSchema,
  scriptBindingsFileSchema,
  scriptPlacementsFileSchema,
  scriptObjectsFileSchema,
  scriptParamsFileSchema,
  runtimeLevelsSchema,
} from "./scriptWorkspaceStateTypes";
import {
  getCapability,
  isCapabilitySupported,
  getHookCapabilityKey,
} from "./scriptCapabilityMatrix";
import {
  SCRIPT_CONTRACT_VERSION,
  SCRIPT_RUNTIME_VERSION,
  SCRIPTING_CONTRACT,
} from "./scriptContract";
import { getNativeReplacementDecision } from "./scriptNativeAudit";
import {
  validateScriptAssetPath,
  validateScriptPackageAssets,
} from "./scriptAssetValidation";
import { SCRIPT_IDE_SUPPORT_PATHS } from "./scriptIdePackage";

export const SCRIPT_PACKAGE_MANIFEST_PATH =
  "Data/Scripts/config/manifest.json";

const scriptIdeSupportPaths = new Set<string>(SCRIPT_IDE_SUPPORT_PATHS);

const scriptPackageManifestSchema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal(SCRIPT_CONTRACT_VERSION),
  runtimeVersion: z.literal(SCRIPT_RUNTIME_VERSION),
  contentHash: z.string().regex(/^[0-9a-f]{8}$/),
  fileCount: z.number().int().positive(),
  networkPolicy: z.literal("disabled"),
});

export type ScriptPackageManifest = z.infer<typeof scriptPackageManifestSchema>;

const scriptPeerManifestSchema = z.object({
  gameId: z.string().min(1),
  manifest: scriptPackageManifestSchema,
});

export type ScriptPeerManifest = z.infer<typeof scriptPeerManifestSchema>;

function updatePackageHash(hash: number, byte: number): number {
  return Math.imul(hash ^ byte, 0x01000193) >>> 0;
}

function packageContentHash(
  files: Readonly<Record<string, Uint8Array>>,
): string {
  const encoder = new TextEncoder();
  let hash = 0x811c9dc5;
  const paths = Object.keys(files)
    .filter((path) => path !== SCRIPT_PACKAGE_MANIFEST_PATH)
    .sort();
  for (const path of paths) {
    for (const byte of encoder.encode(path)) hash = updatePackageHash(hash, byte);
    hash = updatePackageHash(hash, 0);
    for (const byte of files[path] ?? []) hash = updatePackageHash(hash, byte);
    hash = updatePackageHash(hash, 0xff);
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildScriptPackageManifest(
  files: Readonly<Record<string, Uint8Array>>,
): ScriptPackageManifest {
  const fileCount = Object.keys(files).filter(
    (path) => path !== SCRIPT_PACKAGE_MANIFEST_PATH,
  ).length;
  return {
    schemaVersion: 1,
    contractVersion: SCRIPT_CONTRACT_VERSION,
    runtimeVersion: SCRIPT_RUNTIME_VERSION,
    contentHash: packageContentHash(files),
    fileCount,
    networkPolicy: "disabled",
  };
}

export function buildScriptPeerManifest(
  files: Readonly<Record<string, Uint8Array>>,
  gameId: string,
): ScriptPeerManifest {
  return {
    gameId,
    manifest: buildScriptPackageManifest(files),
  };
}

export function compareScriptPeerManifests(
  local: ScriptPeerManifest,
  remote: unknown,
): Result<true, string> {
  const remoteParse = scriptPeerManifestSchema.safeParse(remote);
  if (!remoteParse.success) return err("Peer scripting manifest is invalid");
  const remoteManifest = remoteParse.data;
  if (remoteManifest.gameId !== local.gameId) {
    return err(
      `Peer scripting game mismatch: expected '${local.gameId}', received '${remoteManifest.gameId}'`,
    );
  }
  const fields: readonly (keyof ScriptPackageManifest)[] = [
    "schemaVersion",
    "contractVersion",
    "runtimeVersion",
    "contentHash",
    "fileCount",
    "networkPolicy",
  ];
  for (const field of fields) {
    if (remoteManifest.manifest[field] !== local.manifest[field]) {
      return err(`Peer scripting manifest mismatch: ${field}`);
    }
  }
  return ok(true);
}

export interface PackageValidationError {
  readonly path?: string;
  readonly message: string;
}

export interface ScriptPackageValidationOptions {
  readonly assetsPrevalidated?: boolean;
  readonly allowLegacySources?: boolean;
}

function parseJsonBytes(bytes: Uint8Array): Result<unknown, string> {
  return Result.fromThrowable(
    () => JSON.parse(new TextDecoder().decode(bytes)),
    () => "Invalid JSON",
  )();
}

export function validateScriptPackage(
  files: Record<string, Uint8Array>,
  context: ScriptWorkspaceContext,
  options: ScriptPackageValidationOptions = {},
): Result<true, string> {
  const errors: string[] = [];
  const textDecoder = new TextDecoder();
  let totalAssetBytes = 0;

  if (!options.assetsPrevalidated) {
    const assetValidation = validateScriptPackageAssets(files);
    if (assetValidation.isErr()) {
      errors.push(`Custom asset validation failed: ${assetValidation.error}`);
    }
  }

  // 1. Path traversal & absolute paths & Lua source check
  for (const path of Object.keys(files)) {
    if (path.includes("..") || path.includes("\\")) {
      errors.push(`Path traversal detected: ${path}`);
    }
    if (path.startsWith("/")) {
      errors.push(`Absolute path detected: ${path}`);
    }
    if (!path.startsWith("Data/Scripts/") && !scriptIdeSupportPaths.has(path)) {
      errors.push(`File outside Data/Scripts/ directory: ${path}`);
    }
    if (path.startsWith("Data/Scripts/src/")) {
      if (!path.endsWith(".lua")) {
        const isLegacySource = /\.(?:ts|tsx|js)$/i.test(path);
        if (!isLegacySource || !options.allowLegacySources) {
          errors.push(
            isLegacySource
              ? `Legacy TypeScript/JavaScript package detected at ${path}; convert the source to Lua 5.4 before importing.`
              : `Script source files must be Lua: ${path}`,
          );
        }
      }
    }
    if (path.startsWith("Data/Scripts/assets/")) {
      const assetPathResult = validateScriptAssetPath(path);
      if (assetPathResult.isErr()) errors.push(assetPathResult.error);
      const size = files[path]?.byteLength ?? 0;
      totalAssetBytes += size;
      if (size > 16 * 1024 * 1024) {
        errors.push(`Script asset exceeds 16 MiB limit: ${path}`);
      }
    }
  }
  if (totalAssetBytes > 64 * 1024 * 1024) {
    errors.push("Script assets exceed the 64 MiB package budget");
  }

  // 2. Schema check for project.json
  const projectJsonBytes = files["Data/Scripts/config/project.json"];
  if (!projectJsonBytes) {
    errors.push("Missing project.json configuration file");
    return err(errors.join("; "));
  }

  const projectJsonResult = parseJsonBytes(projectJsonBytes);
  if (projectJsonResult.isErr()) {
    return err("Failed to parse project.json: invalid JSON");
  }

  const projectParse = scriptProjectSchema.safeParse(projectJsonResult.value);
  if (!projectParse.success) {
    return err(`Invalid project.json: ${projectParse.error.message}`);
  }

  const projectData = projectParse.data;
  const apiGame = SCRIPTING_CONTRACT.api.games.find(
    (game) => game.gameId === context.gameId,
  );

  const runtimeLevelsBytes = files["Data/Scripts/config/levels.json"];
  if (!runtimeLevelsBytes) {
    errors.push("Missing levels.json configuration file");
  } else {
    const runtimeLevelsJson = parseJsonBytes(runtimeLevelsBytes);
    if (runtimeLevelsJson.isErr()) {
      errors.push("Invalid levels.json: invalid JSON");
    } else {
      const runtimeLevelsParse = runtimeLevelsSchema.safeParse(runtimeLevelsJson.value);
      if (!runtimeLevelsParse.success) {
        errors.push("Invalid levels.json: schema validation failed");
      } else {
        for (const levelKey of Object.keys(projectData.editor.levels)) {
          const levelNumber = levelKey === "current" ? null : Number(levelKey);
          if (levelNumber !== null && runtimeLevelsParse.data.levels[String(levelNumber)] === undefined) {
            errors.push(`Missing runtime level configuration for level '${levelKey}'`);
          }
        }
      }
    }
  }

  const manifestBytes = files[SCRIPT_PACKAGE_MANIFEST_PATH];
  if (manifestBytes) {
    const manifestJson = parseJsonBytes(manifestBytes);
    if (manifestJson.isErr()) {
      errors.push("Invalid package manifest: invalid JSON");
    } else {
      const manifestParse = scriptPackageManifestSchema.safeParse(
        manifestJson.value,
      );
      if (!manifestParse.success) {
        errors.push(`Invalid package manifest: ${manifestParse.error.message}`);
      } else {
        const manifest = manifestParse.data;
        const actualFileCount = Object.keys(files).filter(
          (path) => path !== SCRIPT_PACKAGE_MANIFEST_PATH,
        ).length;
        if (manifest.fileCount !== actualFileCount) {
          errors.push(
            `Package manifest file count mismatch: expected ${String(manifest.fileCount)}, received ${String(actualFileCount)}`,
          );
        }
        const actualHash = packageContentHash(files);
        if (manifest.contentHash !== actualHash) {
          errors.push(
            `Package content hash mismatch: expected ${manifest.contentHash}, received ${actualHash}`,
          );
        }
      }
    }
  }

  // 3. Schema version check
  if (projectData.schemaVersion !== 1) {
    errors.push(`Unsupported schema version: ${projectData.schemaVersion}`);
  }
  if (projectData.contractVersion !== SCRIPT_CONTRACT_VERSION) {
    errors.push(
      `Unsupported scripting contract version: ${projectData.contractVersion}`,
    );
  }

  // 4. Game ID check
  if (projectData.gameId !== context.gameId) {
    errors.push(
      `Game ID mismatch: package is for game '${projectData.gameId}', but current game is '${context.gameId}'`,
    );
  }

  // 5. Missing compiled bundle check
  const bundleBytes = files["Data/Scripts/dist/main.lua"];
  if (!bundleBytes) {
    errors.push("Missing compiled bundle (Data/Scripts/dist/main.lua)");
  }

  // 6. Duplicate IDs check
  const behaviorIds = new Set<string>();
  const behaviorById = new Map<string, ScriptBehaviorDefinition>();
  for (const behavior of projectData.editor.behaviorCatalog) {
    if (behaviorIds.has(behavior.id)) {
      errors.push(`Duplicate behavior ID: ${behavior.id}`);
    }
    behaviorIds.add(behavior.id);
    behaviorById.set(behavior.id, behavior);
  }

  // Objects
  const objectsBytes = files["Data/Scripts/config/objects.json"];
  const objectIds = new Set<string>();
  const objectById = new Map<string, ScriptCustomObjectDefinition>();
  if (objectsBytes) {
    const objectsJson = parseJsonBytes(objectsBytes);
    if (objectsJson.isErr()) {
      errors.push("Invalid objects.json: invalid JSON");
    } else {
      const parsedObjects = scriptObjectsFileSchema.safeParse(objectsJson.value);
      if (!parsedObjects.success) {
        errors.push(`Invalid objects.json: ${parsedObjects.error.message}`);
      } else {
        for (const obj of parsedObjects.data.objects) {
          if (objectIds.has(obj.id)) {
            errors.push(`Duplicate custom object ID: ${obj.id}`);
          }
          objectIds.add(obj.id);
          objectById.set(obj.id, obj);
          if (
            (obj.visual.kind === "customDisplayGroup" ||
              obj.visual.kind === "customSkeleton") &&
            !files[obj.visual.modelPath]
          ) {
            errors.push(
              `Custom object '${obj.id}' references missing model asset: ${obj.visual.modelPath}`,
            );
          }
          if (
            obj.visual.kind === "customSkeleton" &&
            !files[`${obj.visual.skeletonPath}.rsrc`]
          ) {
            errors.push(
              `Custom object '${obj.id}' references missing skeleton asset: ${obj.visual.skeletonPath}`,
            );
          }
        }
      }
    }
  }

  // Params
  const paramsBytes = files["Data/Scripts/config/params.json"];
  const paramIds = new Set<string>();
  if (paramsBytes) {
    const paramsJson = parseJsonBytes(paramsBytes);
    if (paramsJson.isErr()) {
      errors.push("Invalid params.json: invalid JSON");
    } else {
      const parsedParams = scriptParamsFileSchema.safeParse(paramsJson.value);
      if (!parsedParams.success) {
        errors.push(`Invalid params.json: ${parsedParams.error.message}`);
      } else {
        for (const param of parsedParams.data.params) {
          if (paramIds.has(param.id)) {
            errors.push(`Duplicate parameter ID: ${param.id}`);
          }
          paramIds.add(param.id);
        }
      }
    }
  }

  // Track which behaviors and custom objects are actually used
  const usedBehaviorIds = new Set<string>();
  const usedObjectIds = new Set<string>();
  const behaviorUsedHooks = new Map<string, Set<string>>();

  const markHookUsed = (behaviorId: string, hookId: string) => {
    let hooks = behaviorUsedHooks.get(behaviorId);
    if (!hooks) {
      hooks = new Set<string>();
      behaviorUsedHooks.set(behaviorId, hooks);
    }
    hooks.add(hookId);
  };

  // Collect from project levels (global hooks)
  for (const levelState of Object.values(projectData.editor.levels)) {
    for (const globalHook of levelState.globalHooks) {
      usedBehaviorIds.add(globalHook.behaviorId);
      markHookUsed(globalHook.behaviorId, globalHook.hookId);
    }
  }

  // Collect from bindings and placements files
  for (const levelKey of Object.keys(projectData.editor.levels)) {
    const levelLabel = levelKey === "current" ? "current" : `level-${levelKey}`;
    const bindingsPath = `Data/Scripts/config/bindings/${levelLabel}.json`;
    const placementsPath = `Data/Scripts/config/placements/${levelLabel}.json`;

    const bBytes = files[bindingsPath];
    if (bBytes) {
      const bindingsJson = parseJsonBytes(bBytes);
      if (bindingsJson.isOk()) {
        const parsedBindings = scriptBindingsFileSchema.safeParse(bindingsJson.value);
        if (parsedBindings.success) {
          const allBindings = [
            ...parsedBindings.data.terrainBindings,
            ...parsedBindings.data.splineBindings,
            ...parsedBindings.data.mapItemBindings,
          ];
          for (const binding of allBindings) {
            usedBehaviorIds.add(binding.behaviorId);
            if (binding.kind === "terrainItem") {
              markHookUsed(binding.behaviorId, "onTerrainItem");
            } else if (binding.kind === "splineItem") {
              markHookUsed(binding.behaviorId, "onSplineItem");
            } else if (binding.kind === "mapItem") {
              markHookUsed(binding.behaviorId, "onMapItem");
            }

            if (!behaviorIds.has(binding.behaviorId)) {
              errors.push(
                `Binding '${binding.label}' references non-existent behavior: ${binding.behaviorId}`,
              );
            }
            for (const paramRef of binding.paramRefs) {
              if (!paramIds.has(paramRef)) {
                errors.push(
                  `Binding '${binding.label}' references non-existent parameter: ${paramRef}`,
                );
              }
            }
          }
        } else {
          errors.push(`Invalid ${bindingsPath}: ${parsedBindings.error.message}`);
        }
      } else {
        errors.push(`Invalid ${bindingsPath}: invalid JSON`);
      }
    }

    const pBytes = files[placementsPath];
    if (!bBytes) {
      errors.push(`Missing ${bindingsPath}`);
    }
    if (!pBytes) {
      errors.push(`Missing ${placementsPath}`);
    }
    if (pBytes) {
      const placementsJson = parseJsonBytes(pBytes);
      if (placementsJson.isOk()) {
        const parsedPlacements = scriptPlacementsFileSchema.safeParse(placementsJson.value);
        if (parsedPlacements.success) {
          for (const placement of parsedPlacements.data.placements) {
            usedObjectIds.add(placement.objectId);
            if (!objectIds.has(placement.objectId)) {
              errors.push(
                `Placement '${placement.label}' references non-existent custom object: ${placement.objectId}`,
              );
            }
          }
        } else {
          errors.push(`Invalid ${placementsPath}: ${parsedPlacements.error.message}`);
        }
      } else {
        errors.push(`Invalid ${placementsPath}: invalid JSON`);
      }
    }
  }

  // Replacement definitions are part of project.json and must resolve to the
  // same object registry as standalone placement files.
  for (const [levelKey, levelState] of Object.entries(projectData.editor.levels)) {
    const terrainReplacements = levelState.terrainReplacements;
    for (let index = 0; index < terrainReplacements.length; index += 1) {
      const replacement = terrainReplacements[index];
      if (!replacement) continue;
      if (!objectIds.has(replacement.customObjectId)) {
        errors.push(
          `Terrain replacement '${replacement.id}' references non-existent custom object: ${replacement.customObjectId}`,
        );
      }
      const nativeAudit = getNativeReplacementDecision(
        context.gameId,
        replacement.nativeType,
        replacement.strict,
        "terrain",
      );
      if (nativeAudit.isErr()) {
        errors.push(`Terrain replacement '${replacement.id}': ${nativeAudit.error}`);
      }
      for (let previous = 0; previous < index; previous += 1) {
        const prior = terrainReplacements[previous];
        if (!prior) continue;
        if (
          prior.itemIndex === replacement.itemIndex &&
          prior.nativeType === replacement.nativeType &&
          Math.abs(prior.x - replacement.x) < 0.5 &&
          Math.abs(prior.z - replacement.z) < 0.5
        ) {
          errors.push(
            `Duplicate terrain replacement in level '${levelKey}' for item ${replacement.itemIndex} and native type ${replacement.nativeType}`,
          );
          break;
        }
      }
    }

    const splineReplacements = levelState.splineReplacements;
    for (let index = 0; index < splineReplacements.length; index += 1) {
      const replacement = splineReplacements[index];
      if (!replacement) continue;
      if (!objectIds.has(replacement.customObjectId)) {
        errors.push(
          `Spline replacement '${replacement.id}' references non-existent custom object: ${replacement.customObjectId}`,
        );
      }
      const nativeAudit = getNativeReplacementDecision(
        context.gameId,
        replacement.nativeType,
        replacement.strict,
        "spline",
      );
      if (nativeAudit.isErr()) {
        errors.push(`Spline replacement '${replacement.id}': ${nativeAudit.error}`);
      }
      for (let previous = 0; previous < index; previous += 1) {
        const prior = splineReplacements[previous];
        if (!prior) continue;
        if (
          prior.splineNum === replacement.splineNum &&
          prior.itemIndex === replacement.itemIndex &&
          prior.nativeType === replacement.nativeType &&
          Math.abs(prior.placement - replacement.placement) < 0.0001
        ) {
          errors.push(
            `Duplicate spline replacement in level '${levelKey}' for spline ${replacement.splineNum}, item ${replacement.itemIndex}, and native type ${replacement.nativeType}`,
          );
          break;
        }
      }
    }

    const mapReplacements = levelState.mapReplacements;
    for (let index = 0; index < mapReplacements.length; index += 1) {
      const replacement = mapReplacements[index];
      if (!replacement) continue;
      if (!objectIds.has(replacement.customObjectId)) {
        errors.push(
          `Map replacement '${replacement.id}' references non-existent custom object: ${replacement.customObjectId}`,
        );
      }
      const nativeAudit = getNativeReplacementDecision(
        context.gameId,
        replacement.nativeType,
        replacement.strict,
        "map",
      );
      if (nativeAudit.isErr()) {
        errors.push(`Map replacement '${replacement.id}': ${nativeAudit.error}`);
      }
      for (let previous = 0; previous < index; previous += 1) {
        const prior = mapReplacements[previous];
        if (!prior) continue;
        if (
          prior.itemIndex === replacement.itemIndex &&
          prior.nativeType === replacement.nativeType &&
          Math.abs(prior.x - replacement.x) < 0.5 &&
          Math.abs(prior.y - replacement.y) < 0.5
        ) {
          errors.push(
            `Duplicate map replacement in level '${levelKey}' for item ${replacement.itemIndex} and native type ${replacement.nativeType}`,
          );
          break;
        }
      }
    }
  }

  // 7. Unsupported hooks check
  for (const behavior of projectData.editor.behaviorCatalog) {
    // Only validate hooks for user-defined behaviors or if the behavior is actually used
    const isSample = behavior.id.startsWith("sample.");
    const isUsed = usedBehaviorIds.has(behavior.id);
    if (!isSample || isUsed) {
      const hooksToValidate = isSample
        ? behavior.supportedHooks.filter((hook) => behaviorUsedHooks.get(behavior.id)?.has(hook))
        : behavior.supportedHooks;

      for (const hook of hooksToValidate) {
        if (apiGame && !apiGame.supportedHooks.includes(hook)) {
          errors.push(
            `Behavior '${behavior.label}' uses hook '${hook}' which is unavailable on game '${context.gameId}'`,
          );
        }
        const capKey = getHookCapabilityKey(hook);
        if (!isCapabilitySupported(context.gameId, capKey)) {
          errors.push(
            `Behavior '${behavior.label}' uses hook '${hook}' which is unsupported on game '${context.gameId}'`,
          );
        }
      }
    }
  }

  // 8. Missing source files check
  // Check that all files in moduleOrder exist
  for (const modulePath of projectData.editor.moduleOrder) {
    if (!files[modulePath] && modulePath !== "Data/Scripts/src/main.lua") {
      errors.push(`Missing source file: ${modulePath}`);
    }
  }

  // Check that source files for used behaviors exist
  for (const behaviorId of usedBehaviorIds) {
    const behavior = behaviorById.get(behaviorId);
    if (behavior && !files[behavior.sourceFilePath]) {
      errors.push(`Missing source file for behavior '${behavior.label}': ${behavior.sourceFilePath}`);
    }
  }

  // Check that source files for used custom objects exist
  for (const objectId of usedObjectIds) {
    const obj = objectById.get(objectId);
    if (obj && !files[obj.sourceFilePath]) {
      errors.push(`Missing source file for custom object '${obj.label}': ${obj.sourceFilePath}`);
    }
  }

  // 10. Unsupported API usage validation
  const checkApis = SCRIPTING_CONTRACT.api.apis.flatMap((api) =>
    api.availabilityCapability === undefined
      ? []
      : [{ key: api.name, capability: api.availabilityCapability, name: api.name }],
  );

  for (const [filePath, contentBytes] of Object.entries(files)) {
    if (
      filePath.startsWith("Data/Scripts/src/") ||
      filePath === "Data/Scripts/dist/main.lua"
    ) {
      const content = textDecoder.decode(contentBytes);
      for (const api of checkApis) {
        if (content.includes(api.key)) {
          const capStatus = getCapability(context.gameId, api.capability);
          // Only fail validation for unsupported/planned APIs
          if (capStatus === "unsupported" || capStatus === "planned") {
            errors.push(
              `Script uses API '${api.name}' which is '${capStatus}' on game '${context.gameId}' (found in ${filePath})`,
            );
          }
        }
      }

      // Add lightweight syntax validation for source files
      if (filePath.endsWith(".lua")) {
        const syntaxErrors = validateLuaSyntax(content, filePath);
        errors.push(...syntaxErrors);
      }
    }
  }

  if (errors.length > 0) {
    return err(errors.join("; "));
  }

  return ok(true);
}

export function validateScriptPackageForNetwork(
  files: Record<string, Uint8Array>,
  context: ScriptWorkspaceContext,
  remotePeerManifest?: unknown,
): Result<true, string> {
  const packageValidation = validateScriptPackage(files, context);
  if (packageValidation.isErr()) return err(packageValidation.error);

  const apiGame = SCRIPTING_CONTRACT.games[context.gameId];
  if (!apiGame || apiGame.multiplayer !== "deterministic-only") {
    return err(
      `Networked scripting is disabled for game '${context.gameId}' until deterministic authority and synchronization are implemented`,
    );
  }

  const manifestBytes = files[SCRIPT_PACKAGE_MANIFEST_PATH];
  if (!manifestBytes) {
    return err("Networked scripting requires a package manifest");
  }
  const manifestJson = parseJsonBytes(manifestBytes);
  if (manifestJson.isErr()) return err("Networked package manifest is invalid");
  const manifestParse = scriptPackageManifestSchema.safeParse(manifestJson.value);
  if (!manifestParse.success) return err("Networked package manifest is invalid");
  if (remotePeerManifest !== undefined) {
    const peerAgreement = compareScriptPeerManifests(
      buildScriptPeerManifest(files, context.gameId),
      remotePeerManifest,
    );
    if (peerAgreement.isErr()) return err(peerAgreement.error);
  }
  return err("Networked scripting remains disabled pending peer agreement");
}

function validateLuaSyntax(content: string, filePath: string): string[] {
  const errors: string[] = [];

  // Remove multi-line comments
  let clean = content.replace(/--\[\[[\s\S]*?\]\]/g, "");
  // Remove single-line comments
  clean = clean.replace(/--.*$/gm, "");

  // Remove string literals
  clean = clean.replace(/"(\\.|[^"\\])*"/g, '""');
  clean = clean.replace(/'(\\.|[^'\\])*'/g, "''");
  clean = clean.replace(/\[\[[\s\S]*?\]\]/g, "[]");

  // Tokenize block-related keywords that don't follow a dot
  const pattern = /(?:\.([a-zA-Z0-9_]+))|\b(do|then|function|repeat|end|until|elseif|else)\b/g;
  let match;
  const words: string[] = [];
  while ((match = pattern.exec(clean)) !== null) {
    if (match[2]) {
      words.push(match[2]);
    }
  }

  const stack: string[] = [];

  for (const word of words) {
    if (word === "do" || word === "then" || word === "function") {
      stack.push("end");
    } else if (word === "repeat") {
      stack.push("until");
    } else if (word === "elseif") {
      if (stack.length === 0 || stack[stack.length - 1] !== "end") {
        errors.push(`Mismatched 'elseif' keyword in ${filePath}`);
        return errors;
      }
      stack.pop();
    } else if (word === "else") {
      if (stack.length === 0 || stack[stack.length - 1] !== "end") {
        errors.push(`Mismatched 'else' keyword in ${filePath}`);
        return errors;
      }
      stack.pop();
      stack.push("end");
    } else if (word === "end") {
      if (stack.length === 0 || stack[stack.length - 1] !== "end") {
        errors.push(`Mismatched 'end' keyword in ${filePath}`);
        return errors;
      }
      stack.pop();
    } else if (word === "until") {
      if (stack.length === 0 || stack[stack.length - 1] !== "until") {
        errors.push(`Mismatched 'until' keyword in ${filePath}`);
        return errors;
      }
      stack.pop();
    }
  }

  if (stack.length > 0) {
    errors.push(`Unclosed block: missing '${stack[stack.length - 1]}' in ${filePath}`);
  }

  return errors;
}
