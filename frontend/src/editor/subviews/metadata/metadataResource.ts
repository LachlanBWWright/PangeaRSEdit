import type { Updater } from "use-immer";
import { err, ok, Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { Game } from "@/data/globals/globals";
import type {
  LevelMetadataResource,
  MetadataResource,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { metadataResourceSchema } from "@/validation/levelDataSchemas";
import { mapErr } from "@/utils/mapErr";
import { plainResultSchema } from "@/schemas/common";
import { getFeatureFlags } from "@/config/featureFlags";

export const METADATA_RESOURCE_TYPE = "Meta";
export const METADATA_RESOURCE_ID = 1000;
const metadataContainerSchema = z.record(z.string(), z.unknown());

export type MetadataResourceMode = "embedded" | "companion";

/** Parse only the optional Meta companion; malformed metadata is inactive. */
export async function parseMetadataResourceFork(
  bytes: ArrayBufferLike,
  structSpecs: readonly string[],
): Promise<Result<LevelMetadataResource | undefined, string>> {
  const rawResult = await ResultAsync.fromPromise(
    saveToJson(new Uint8Array(bytes), [...structSpecs], [], []),
    mapErr,
  );
  if (rawResult.isErr()) return err(rawResult.error);

  const plainResult = plainResultSchema.safeParse(rawResult.value);
  if (!plainResult.success) return err("Meta resource result has an invalid schema");
  const jsonResult = plainResult.data.ok && typeof plainResult.data.value === "string"
    ? ok(plainResult.data.value)
    : err(String(plainResult.data.error));
  if (jsonResult.isErr()) return err(jsonResult.error);
  const parsedResult = Result.fromThrowable(
    () => JSON.parse(jsonResult.value),
    () => "Meta resource JSON is invalid",
  )();
  if (parsedResult.isErr()) return err(parsedResult.error);
  const normalizedResult = normalizeMetadataResourceFromFork(parsedResult.value);
  if (normalizedResult.isErr()) return err(normalizedResult.error);
  const metaResult = metadataContainerSchema.safeParse(normalizedResult.value.Meta);
  if (!metaResult.success) {
    return err("Meta resource has an invalid schema");
  }
  const entryResult = metadataContainerSchema.safeParse(metaResult.data["1000"]);
  if (!entryResult.success) return err("Meta resource has an invalid entry");
  const resourceResult = metadataResourceSchema.safeParse(entryResult.data.obj);
  return resourceResult.success
    ? ok(resourceResult.data)
    : err(resourceResult.error.message);
}

export function getMetadataResourceMode(game: Game): MetadataResourceMode {
  return game === Game.NANOSAUR || game === Game.MIGHTY_MIKE
    ? "companion"
    : "embedded";
}

function getMetadataGameId(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC: return "ottomatic";
    case Game.BUGDOM: return "bugdom1";
    case Game.BUGDOM_2: return "bugdom2";
    case Game.NANOSAUR: return "nanosaur1";
    case Game.NANOSAUR_2: return "nanosaur2";
    case Game.CRO_MAG: return "cromag";
    case Game.BILLY_FRONTIER: return "billyfrontier";
    case Game.MIGHTY_MIKE: return "mightymike";
    default: return "unknown";
  }
}

function createEmptyResource(game: Game, identity: string): LevelMetadataResource {
  return {
    schemaVersion: 1,
    game: getMetadataGameId(game),
    identity,
    properties: {},
  };
}

export function updateMetadataResource(
  current: LevelMetadataResource | undefined,
  game: Game,
  identity: string,
  key: string,
  value: string,
): LevelMetadataResource {
  const expectedGame = getMetadataGameId(game);
  const resource = current?.game === expectedGame && current.identity === identity
    ? current
    : createEmptyResource(game, identity);
  return {
    ...resource,
    game: expectedGame,
    identity,
    properties: { ...resource.properties, [key]: value },
  };
}

export function getMetadataResource(
  terrainData: TerrainData,
  game: Game,
): LevelMetadataResource | undefined {
  if (!getFeatureFlags().levelMetadata) return undefined;
  const resource = terrainData.Meta?.[METADATA_RESOURCE_ID]?.obj;
  const parsedResource = metadataResourceSchema.safeParse(resource);
  if (!parsedResource.success) return undefined;
  const expectedGame = getMetadataGameId(game);
  return parsedResource.data.game === expectedGame ? parsedResource.data : undefined;
}

export function getMetadataPropertyValue(
  resource: LevelMetadataResource | undefined,
  key: string,
  fallback: string,
): string {
  return resource?.properties[key] ?? fallback;
}

export function hasMetadataProperty(
  resource: LevelMetadataResource | undefined,
  key: string,
): boolean {
  return resource !== undefined
    && Object.prototype.hasOwnProperty.call(resource.properties, key);
}

export function resetMetadataResource(
  current: LevelMetadataResource | undefined,
  key: string,
): LevelMetadataResource | undefined {
  if (!current || !Object.prototype.hasOwnProperty.call(current.properties, key)) {
    return current;
  }

  const properties = { ...current.properties };
  Reflect.deleteProperty(properties, key);
  if (Object.keys(properties).length === 0) return undefined;
  return { ...current, properties };
}

function decodeMetadataHex(data: string): Result<string, string> {
  if (data.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(data)) {
    return err("Meta resource data is not valid hexadecimal");
  }
  const bytes = new Uint8Array(data.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(data.slice(index * 2, index * 2 + 2), 16);
  }
  return ok(new TextDecoder().decode(bytes));
}

export function normalizeMetadataResourceFromFork(
  data: Record<string, unknown>,
): Result<Record<string, unknown>, string> {
  const containerResult = metadataContainerSchema.safeParse(data.Meta);
  if (!containerResult.success) return ok(data);
  const entry = containerResult.data[String(METADATA_RESOURCE_ID)];
  const entryResult = metadataContainerSchema.safeParse(entry);
  if (!entryResult.success || typeof entryResult.data.data !== "string") {
    return ok(data);
  }
  const decodedResult = decodeMetadataHex(entryResult.data.data);
  if (decodedResult.isErr()) return err(decodedResult.error);
  const parsedResult = Result.fromThrowable(
    () => JSON.parse(decodedResult.value),
    () => "Meta resource JSON is invalid",
  )();
  if (parsedResult.isErr()) return err(parsedResult.error);
  const resourceResult = metadataResourceSchema.safeParse(parsedResult.value);
  if (!resourceResult.success) return err(resourceResult.error.message);
  const normalizedEntry = { ...entryResult.data, obj: resourceResult.data };
  Reflect.deleteProperty(normalizedEntry, "data");
  return ok({
    ...data,
    Meta: {
      ...containerResult.data,
      [String(METADATA_RESOURCE_ID)]: normalizedEntry,
    },
  });
}

export function updateMetadataProperty(
  setTerrainData: Updater<TerrainData>,
  game: Game,
  identity: string,
  key: string,
  value: string,
): void {
  if (!getFeatureFlags().levelMetadata) return;
  setTerrainData((draft) => {
    const current = draft.Meta?.[METADATA_RESOURCE_ID]?.obj;
    const resource = updateMetadataResource(current, game, identity, key, value);
    const metadata: MetadataResource = {
      1000: {
        name: "Level Metadata",
        obj: resource,
        order: current ? draft.Meta?.[METADATA_RESOURCE_ID]?.order ?? 0 : 0,
      },
    };
    draft.Meta = metadata;
  });
}

export function resetMetadataProperty(
  setTerrainData: Updater<TerrainData>,
  key: string,
): void {
  if (!getFeatureFlags().levelMetadata) return;
  setTerrainData((draft) => {
    const current = draft.Meta?.[METADATA_RESOURCE_ID]?.obj;
    const resource = resetMetadataResource(current, key);
    if (!resource) {
      Reflect.deleteProperty(draft, "Meta");
      return;
    }

    draft.Meta = {
      1000: {
        name: "Level Metadata",
        obj: resource,
        order: draft.Meta?.[METADATA_RESOURCE_ID]?.order ?? 0,
      },
    };
  });
}
