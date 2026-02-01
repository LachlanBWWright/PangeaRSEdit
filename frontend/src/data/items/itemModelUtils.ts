/**
 * Item Model Utilities
 * 
 * Utility functions for working with item model mappings across all games.
 * Provides analysis, validation, and report generation functionality.
 */

import { Game } from "@/data/globals/globals";
import { 
  getGameMapper, 
  getGamesWithMappers,
  getTotalMappedItems,
  getMapperCoverageSummary,
} from "./mappers";
import { UniversalItemModelMapping, ItemCategory } from "./itemModelTypes";
import { Result, ok, err } from "@/types/result";

/**
 * Get a summary of all mapped items for a specific game
 */
export function getGameMappingSummary(game: Game): Result<{
  game: Game;
  totalMapped: number;
  mappingsByCategory: Record<ItemCategory, number>;
  mappingsWithVariants: number;
  mappingsWithRotation: number;
  mappingsWithScale: number;
  skeletonModels: number;
}, Error> {
  const mapper = getGameMapper(game);
  if (!mapper) {
    return err(new Error(`No mapper found for game: ${game}`));
  }
  
  const mappedTypes = mapper.getMappedTypes();
  
  let mappingsWithVariants = 0;
  let mappingsWithRotation = 0;
  let mappingsWithScale = 0;
  let skeletonModels = 0;
  const mappingsByCategory: Record<ItemCategory, number> = {
    enemy: 0,
    powerup: 0,
    environmental: 0,
    trigger: 0,
    player: 0,
    decoration: 0,
    unknown: 0,
  };
  
  for (const itemType of mappedTypes) {
    const mapping = mapper.getMapping(itemType);
    if (!mapping) continue;
    
    if (mapping.variants && Object.keys(mapping.variants).length > 0) {
      mappingsWithVariants++;
    }
    if (mapping.rotationParam) {
      mappingsWithRotation++;
    }
    if (mapping.scaleParam) {
      mappingsWithScale++;
    }
    if (mapping.requiresSkeleton) {
      skeletonModels++;
    }
    
    // Categorize based on model path
    if (mapping.modelPath === "skeletons") {
      mappingsByCategory.enemy++;
    } else if (mapping.modelFile.toLowerCase().includes("powerup")) {
      mappingsByCategory.powerup++;
    } else {
      mappingsByCategory.environmental++;
    }
  }
  
  return ok({
    game,
    totalMapped: mappedTypes.length,
    mappingsByCategory,
    mappingsWithVariants,
    mappingsWithRotation,
    mappingsWithScale,
    skeletonModels,
  });
}

/**
 * Validate all mappings for a game
 */
export function validateGameMappings(game: Game): Result<{
  valid: boolean;
  issues: string[];
  warnings: string[];
}, Error> {
  const mapper = getGameMapper(game);
  if (!mapper) {
    return err(new Error(`No mapper found for game: ${game}`));
  }
  
  const issues: string[] = [];
  const warnings: string[] = [];
  const mappedTypes = mapper.getMappedTypes();
  
  for (const itemType of mappedTypes) {
    const mapping = mapper.getMapping(itemType);
    if (!mapping) {
      issues.push(`Item type ${itemType}: Mapping returned undefined`);
      continue;
    }
    
    // Validate model file exists (path check)
    if (!mapping.modelFile) {
      issues.push(`Item type ${itemType}: Missing modelFile`);
    }
    
    // Validate model index
    if (mapping.modelIndex < 0) {
      issues.push(`Item type ${itemType}: Invalid modelIndex (${mapping.modelIndex})`);
    }
    
    // Validate scale if present
    if (mapping.scale !== undefined && mapping.scale <= 0) {
      warnings.push(`Item type ${itemType}: Scale is ${mapping.scale} (might be intentional for inverted models)`);
    }
    
    // Validate variants if present
    if (mapping.variants) {
      for (const [key, variant] of Object.entries(mapping.variants)) {
        if (variant.modelIndex < 0) {
          issues.push(`Item type ${itemType} variant ${key}: Invalid modelIndex`);
        }
      }
    }
    
    // Validate rotation param if present
    if (mapping.rotationParam) {
      const paramIndex = mapping.rotationParam.paramIndex;
      if (paramIndex < 0 || paramIndex > 3) {
        issues.push(`Item type ${itemType}: Invalid rotation paramIndex (${paramIndex})`);
      }
    }
    
    // Validate scale param if present
    if (mapping.scaleParam) {
      const paramIndex = mapping.scaleParam.paramIndex;
      if (paramIndex < 0 || paramIndex > 3) {
        issues.push(`Item type ${itemType}: Invalid scale paramIndex (${paramIndex})`);
      }
    }
  }
  
  return ok({
    valid: issues.length === 0,
    issues,
    warnings,
  });
}

/**
 * Find duplicate model mappings within a game
 */
export function findDuplicateMappings(game: Game): Result<{
  duplicates: Array<{
    modelKey: string;
    itemTypes: number[];
  }>;
}, Error> {
  const mapper = getGameMapper(game);
  if (!mapper) {
    return err(new Error(`No mapper found for game: ${game}`));
  }
  
  const modelKeyToTypes = new Map<string, number[]>();
  const mappedTypes = mapper.getMappedTypes();
  
  for (const itemType of mappedTypes) {
    const mapping = mapper.getMapping(itemType);
    if (!mapping) continue;
    
    const modelKey = `${mapping.modelFile}:${mapping.modelIndex}`;
    const types = modelKeyToTypes.get(modelKey) || [];
    types.push(itemType);
    modelKeyToTypes.set(modelKey, types);
  }
  
  const duplicates: Array<{ modelKey: string; itemTypes: number[] }> = [];
  
  for (const [modelKey, itemTypes] of modelKeyToTypes.entries()) {
    if (itemTypes.length > 1) {
      duplicates.push({ modelKey, itemTypes });
    }
  }
  
  return ok({ duplicates });
}

/**
 * Get all unique model files used by a game
 */
export function getUniqueModelFiles(game: Game): Result<{
  modelFiles: string[];
  skeletonFiles: string[];
  totalFiles: number;
}, Error> {
  const mapper = getGameMapper(game);
  if (!mapper) {
    return err(new Error(`No mapper found for game: ${game}`));
  }
  
  const modelFiles = new Set<string>();
  const skeletonFiles = new Set<string>();
  const mappedTypes = mapper.getMappedTypes();
  
  for (const itemType of mappedTypes) {
    const mapping = mapper.getMapping(itemType);
    if (!mapping) continue;
    
    if (mapping.modelPath === "skeletons") {
      skeletonFiles.add(mapping.modelFile);
    } else {
      modelFiles.add(mapping.modelFile);
    }
    
    if (mapping.skeletonFile) {
      skeletonFiles.add(mapping.skeletonFile);
    }
    
    // Check variants for different files
    if (mapping.variants) {
      for (const variant of Object.values(mapping.variants)) {
        if (variant.modelFile) {
          if (mapping.modelPath === "skeletons") {
            skeletonFiles.add(variant.modelFile);
          } else {
            modelFiles.add(variant.modelFile);
          }
        }
      }
    }
  }
  
  return ok({
    modelFiles: Array.from(modelFiles).sort(),
    skeletonFiles: Array.from(skeletonFiles).sort(),
    totalFiles: modelFiles.size + skeletonFiles.size,
  });
}

/**
 * Generate a text report of mapping coverage across all games
 */
export function generateMappingCoverageReport(): string {
  const lines: string[] = [];
  lines.push("# Item Model Mapping Coverage Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  
  // Summary
  const summary = getMapperCoverageSummary();
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Game | Mapped Items |`);
  lines.push(`|------|--------------|`);
  for (const item of summary.gameDetails) {
    lines.push(`| ${item.game} | ${item.itemCount} |`);
  }
  lines.push("");
  lines.push(`**Total mapped items: ${getTotalMappedItems()}**`);
  lines.push("");
  
  // Per-game details
  lines.push("## Per-Game Details");
  lines.push("");
  
  const gamesWithMappers = getGamesWithMappers();
  for (const game of gamesWithMappers) {
    lines.push(`### ${game}`);
    lines.push("");
    
    const summaryResult = getGameMappingSummary(game);
    if (summaryResult.ok) {
      const s = summaryResult.value;
      lines.push(`- Total mapped: ${s.totalMapped}`);
      lines.push(`- With variants: ${s.mappingsWithVariants}`);
      lines.push(`- With rotation: ${s.mappingsWithRotation}`);
      lines.push(`- With scale: ${s.mappingsWithScale}`);
      lines.push(`- Skeleton models: ${s.skeletonModels}`);
    }
    
    const filesResult = getUniqueModelFiles(game);
    if (filesResult.ok) {
      const f = filesResult.value;
      lines.push(`- Model files: ${f.modelFiles.length}`);
      lines.push(`- Skeleton files: ${f.skeletonFiles.length}`);
    }
    
    const validationResult = validateGameMappings(game);
    if (validationResult.ok) {
      const v = validationResult.value;
      if (v.valid) {
        lines.push(`- Validation: ✅ All mappings valid`);
      } else {
        lines.push(`- Validation: ❌ ${v.issues.length} issues found`);
      }
      if (v.warnings.length > 0) {
        lines.push(`- Warnings: ${v.warnings.length}`);
      }
    }
    
    lines.push("");
  }
  
  return lines.join("\n");
}

/**
 * Check if a specific item type is mapped for a game
 */
export function isItemTypeMapped(game: Game, itemType: number): boolean {
  const mapper = getGameMapper(game);
  if (!mapper) return false;
  return mapper.hasModel(itemType);
}

/**
 * Get the mapping for a specific item type
 */
export function getItemMapping(game: Game, itemType: number): UniversalItemModelMapping | undefined {
  const mapper = getGameMapper(game);
  if (!mapper) return undefined;
  return mapper.getMapping(itemType);
}
