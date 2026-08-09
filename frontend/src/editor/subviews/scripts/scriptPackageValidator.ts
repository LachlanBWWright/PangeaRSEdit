import { Result, ok, err } from "neverthrow";
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
} from "./scriptWorkspaceStateTypes";
import {
  getCapability,
  isCapabilitySupported,
  getHookCapabilityKey,
  type ScriptCapabilityKey,
} from "./scriptCapabilityMatrix";

export interface PackageValidationError {
  readonly path?: string;
  readonly message: string;
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
): Result<true, string> {
  const errors: string[] = [];
  const textDecoder = new TextDecoder();
  let totalAssetBytes = 0;

  // 1. Path traversal & absolute paths & Lua source check
  for (const path of Object.keys(files)) {
    if (path.includes("..") || path.includes("\\")) {
      errors.push(`Path traversal detected: ${path}`);
    }
    if (path.startsWith("/")) {
      errors.push(`Absolute path detected: ${path}`);
    }
    if (!path.startsWith("Data/Scripts/")) {
      errors.push(`File outside Data/Scripts/ directory: ${path}`);
    }
    if (path.startsWith("Data/Scripts/src/")) {
      if (!path.endsWith(".lua")) {
        errors.push(`Script source files must be Lua: ${path}`);
      }
    }
    if (path.startsWith("Data/Scripts/assets/")) {
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

  // 3. Schema version check
  if (projectData.schemaVersion !== 1) {
    errors.push(`Unsupported schema version: ${projectData.schemaVersion}`);
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
    if (objectsJson.isOk()) {
      const parsedObjects = scriptObjectsFileSchema.safeParse(objectsJson.value);
      if (parsedObjects.success) {
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
    if (paramsJson.isOk()) {
      const parsedParams = scriptParamsFileSchema.safeParse(paramsJson.value);
      if (parsedParams.success) {
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
        }
      }
    }

    const pBytes = files[placementsPath];
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
  const checkApis: {
    key: string;
    capability: ScriptCapabilityKey;
    name: string;
  }[] = [
    {
      key: "pangea.spawn.native",
      capability: "nativeSpawn",
      name: "pangea.spawn.native",
    },
    {
      key: "pangea.spawn.scripted",
      capability: "scriptedSpawn",
      name: "pangea.spawn.scripted",
    },
    {
      key: "pangea.player.get",
      capability: "playerLookup",
      name: "pangea.player.get",
    },
    {
      key: "pangea.level.current",
      capability: "levelMetadata",
      name: "pangea.level.current",
    },
  ];

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
