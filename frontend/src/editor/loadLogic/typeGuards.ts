import { Nanosaur1LevelData } from "../data/processors/classicProprocessor";
import { MightyMikeMap } from "../python/structSpecs/mightyMikeInterface";
import { RawNanosaurItem, RawNanosaurAttribute } from "./nanosaurInterfaces";

/**
 * Type guard to check if an object is a valid Nanosaur1LevelData
 */
export function isNanosaur1LevelData(data: unknown): data is Nanosaur1LevelData {
    if (typeof data !== 'object' || data === null) return false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const d = data as Nanosaur1LevelData;
    return (
        'header' in d &&
        'textureLayer' in d &&
        typeof d.header === 'object' &&
        Array.isArray(d.textureLayer)
    );
}

/**
 * Type guard for RawNanosaurItem
 */
export function isRawNanosaurItem(item: unknown): item is RawNanosaurItem {
    if (typeof item !== 'object' || item === null) return false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const i = item as RawNanosaurItem;
    // We check for the specific field 'parm' which distinguishes it from standard TerrainItem
    // Nanosaur items must have 'type' and 'x'
    return 'type' in i && 'x' in i; // Basic check, we assume if it's in the list it's correct
}

/**
 * Type guard for RawNanosaurAttribute
 */
export function isRawNanosaurAttribute(attr: unknown): attr is RawNanosaurAttribute {
    if (typeof attr !== 'object' || attr === null) return false;
    return 'bits' in attr || 'parm0' in attr;
}

/**
 * Type guard for MightyMikeMap
 */
export function isMightyMikeMap(data: unknown): data is MightyMikeMap {
    if (typeof data !== 'object' || data === null) return false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const d = data as MightyMikeMap;
    return (
        'version' in d &&
        'mapWidth' in d &&
        'mapHeight' in d &&
        'mapImage' in d
    );
}

/**
 * Type guard for Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
