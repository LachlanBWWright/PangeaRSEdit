import { useAtomValue } from "jotai";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
} from "@/editor/utils/gamePortConfig";
import {
  getDataTypeLabel,
  getLevelMetadataDetails,
} from "./levelMetadata";
import type { Updater } from "use-immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  getMetadataPropertyValue,
  getMetadataResource,
  getMetadataResourceMode,
  updateMetadataProperty,
} from "./metadataResource";
import { MetadataRuleEditor } from "./MetadataRuleEditor";
import {
  getMetadataRuleValueLabel,
  type MetadataRule,
} from "./levelMetadataRules";
import { getGitHubPermalink } from "@/validation/gameRepositories";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-3 border-b border-slate-700 py-2 last:border-b-0">
      <dt className="text-sm font-medium text-slate-300">{label}</dt>
      <dd className="break-words text-sm text-slate-100">{value}</dd>
    </div>
  );
}

const metadataRepositoryKeys: Readonly<Record<Game, string>> = {
  [Game.OTTO_MATIC]: "ottomatic",
  [Game.BUGDOM]: "bugdom",
  [Game.BUGDOM_2]: "bugdom2",
  [Game.NANOSAUR]: "nanosaur",
  [Game.NANOSAUR_2]: "nanosaur2",
  [Game.CRO_MAG]: "cromag",
  [Game.BILLY_FRONTIER]: "billyfrontier",
  [Game.MIGHTY_MIKE]: "mightymike",
};

function SettingLabel({
  game,
  rule,
  value,
}: {
  game: Game;
  rule: MetadataRule;
  value: string;
}) {
  const repositoryKey = metadataRepositoryKeys[game];
  return (
    <div className="flex items-center gap-1.5">
      <span>{rule.label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={`Explain ${rule.label}`}
            className="text-slate-500 transition-colors hover:text-slate-200"
            type="button"
          >
            <Info aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm space-y-2" side="right">
          <p>{rule.description}</p>
          <p>
            <span className="font-semibold text-slate-200">Current value: </span>
            {getMetadataRuleValueLabel(rule, value)}
          </p>
          <p>
            <span className="font-semibold text-slate-200">Default value: </span>
            {getMetadataRuleValueLabel(rule, rule.defaultValue ?? rule.value)}
          </p>
          {rule.control.kind === "select" && (() => {
            const selectControl = rule.control;
            return (
            <div>
              <p className="font-semibold text-slate-200">Choices:</p>
              <ul className="list-disc space-y-1 pl-4">
                {selectControl.options.map((option) => (
                  <li key={option}>
                    <span className="font-medium text-slate-200">
                      {getMetadataRuleValueLabel(rule, option)}
                    </span>
                    {selectControl.optionDescriptions?.[option]
                      ? ` — ${selectControl.optionDescriptions[option]}`
                      : null}
                  </li>
                ))}
              </ul>
            </div>
            );
          })()}
          {rule.control.kind === "slider" && rule.control.gameValues && (
            <p>
              <span className="font-semibold text-slate-200">Original game values: </span>
              {rule.control.gameValues.map((gameValue, index) => (
                <span key={gameValue.value}>
                  {index > 0 ? "; " : ""}
                  {gameValue.value} ({gameValue.label})
                </span>
              ))}
            </p>
          )}
          {rule.citations.length > 0 && (
            <div>
              <span className="font-semibold text-slate-200">Code citations: </span>
              {rule.citations.map((citation) => {
                const href = getGitHubPermalink(repositoryKey, citation.file, citation.line);
                if (!href) return null;
                const lineLabel = citation.endLine
                  ? `${citation.line}–${citation.endLine}`
                  : String(citation.line);
                return (
                  <a
                    className="mr-2 text-cyan-300 underline underline-offset-2"
                    href={href}
                    key={`${citation.file}:${citation.line}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {citation.file}:{lineLabel}
                  </a>
                );
              })}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function MetadataSettingRow({
  game,
  identity,
  levelIndex,
  metadataResource,
  rule,
  setTerrainData,
}: {
  game: Game;
  identity: string;
  levelIndex: number;
  metadataResource: ReturnType<typeof getMetadataResource>;
  rule: MetadataRule;
  setTerrainData: Updater<TerrainData>;
}) {
  const value = getMetadataPropertyValue(metadataResource, rule.key, rule.value);
  const defaultValue = rule.defaultValue ?? rule.value;
  return (
    <tr className="border-b border-slate-800 last:border-b-0">
      <td className="min-w-64 px-3 py-2 font-medium text-slate-200">
        <SettingLabel game={game} rule={rule} value={value} />
        <p className="mt-1 text-xs font-normal leading-relaxed text-slate-400">
          {rule.description}
        </p>
      </td>
      <td className="px-3 py-2 text-slate-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <MetadataRuleEditor
            rule={rule}
            value={value}
            onChange={(nextValue) => updateMetadataProperty(
              setTerrainData,
              game,
              identity,
              levelIndex,
              rule.key,
              nextValue,
            )}
          />
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-400">
        {getMetadataRuleValueLabel(rule, defaultValue ?? rule.value)}
      </td>
    </tr>
  );
}

function MetadataAuditRow({
  game,
  metadataResource,
  rule,
}: {
  game: Game;
  metadataResource: ReturnType<typeof getMetadataResource>;
  rule: MetadataRule;
}) {
  const value = getMetadataPropertyValue(metadataResource, rule.key, rule.value);
  return (
    <tr className="border-b border-slate-800 last:border-b-0">
      <td className="px-3 py-2 font-medium text-slate-200">
        <SettingLabel game={game} rule={rule} value={value} />
      </td>
      <td className="px-3 py-2 text-slate-100">{getMetadataRuleValueLabel(rule, value)}</td>
      <td className="px-3 py-2 text-xs text-slate-400">Read-only audit context</td>
    </tr>
  );
}

export function LevelMetadataMenu({ terrainData, setTerrainData }: Props) {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const config = GAME_PORT_CONFIGS[globals.GAME_TYPE];
  const levelInfo = levelNumber === undefined
    ? undefined
    : config.levels.find((level) => getLevelIndex(level) === levelNumber);
  const details = getLevelMetadataDetails(globals.GAME_TYPE, levelNumber, levelInfo);
  const hasEditableRuntimeRules = details.runtimeRules.some((rule) => rule.editable);
  const levelIndex = levelNumber ?? 0;
  const identity = details.identityValue;
  const metadataResource = getMetadataResource(terrainData);
  const resourceMode = getMetadataResourceMode(globals.GAME_TYPE);
  const editableRules = details.runtimeRules.filter((rule) => rule.editable);
  const auditRules = details.runtimeRules.filter((rule) => !rule.editable);
  const auditRuleCount = details.runtimeRules.length - editableRules.length;

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-4 p-3 text-slate-100">
      <div className="order-0">
        <h2 className="text-base font-semibold">Level Metadata</h2>
      </div>

      <section className="order-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Identity
        </h3>
        <dl className="divide-y divide-slate-700 border-y border-slate-700 px-1">
          <MetadataRow label="Game" value={globals.GAME_NAME} />
          <MetadataRow label={details.identityLabel} value={details.identityValue} />
          <MetadataRow
            label="Numeric slot"
            value={levelNumber === undefined ? "Unknown" : String(levelNumber)}
          />
          <MetadataRow label="Level family" value={details.family} />
        </dl>
      </section>

      <section className="order-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Resources and systems
        </h3>
        <dl className="divide-y divide-slate-700 border-y border-slate-700 px-1">
          <MetadataRow label="Data format" value={getDataTypeLabel(globals.DATA_TYPE)} />
          <MetadataRow label="Source resource" value={levelInfo?.terrainFile ?? "Selected level resource"} />
          <MetadataRow label="Terrain scale" value={`${String(globals.TILE_INGAME_SIZE)} world units`} />
          <MetadataRow label="Native systems" value={details.nativeSystems} />
          <MetadataRow label="Player start" value={details.startPolicy} />
        </dl>
      </section>

      <section className="order-5">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Game-specific context
        </h3>
        <dl className="divide-y divide-slate-700 border-y border-slate-700 px-1">
          {details.contextFields.map((field) => (
            <MetadataRow key={field.label} label={field.label} value={field.value} />
          ))}
        </dl>
      </section>

      <section className="order-6">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Audited runtime behavior
        </h3>
        <ul className="list-disc space-y-1 border-y border-slate-700 px-7 py-3 text-sm text-slate-100">
          {details.specialRules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        {auditRules.length > 0 ? <div className="mt-3 overflow-x-auto border-y border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Metadata item</th>
                <th className="px-3 py-2">Resolved value</th>
                <th className="px-3 py-2">Runtime treatment</th>
              </tr>
            </thead>
            <tbody>
              {auditRules.map((runtimeRule) => (
                <MetadataAuditRow
                  game={globals.GAME_TYPE}
                  key={runtimeRule.key}
                  metadataResource={metadataResource}
                  rule={runtimeRule}
                />
              ))}
            </tbody>
          </table>
        </div> : null}
      </section>

      <section className="order-1">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Editable runtime settings
        </h3>
        {editableRules.length > 0 ? (
          <p className="mb-2 text-xs text-slate-400">
            The last column shows the original game default for this level.
            Choose a different value only when this level should behave
            differently from the original game.
          </p>
        ) : null}
        {editableRules.length > 0 ? <div className="overflow-x-auto border-y border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Setting</th>
                <th className="px-3 py-2">Current value</th>
                <th className="px-3 py-2">Original default</th>
              </tr>
            </thead>
            <tbody>
              {editableRules.map((runtimeRule) => (
                <MetadataSettingRow
                  game={globals.GAME_TYPE}
                  identity={identity}
                  key={runtimeRule.key}
                  levelIndex={levelIndex}
                  metadataResource={metadataResource}
                  rule={runtimeRule}
                  setTerrainData={setTerrainData}
                />
              ))}
            </tbody>
          </table>
        </div> : <p className="border-y border-slate-700 p-3 text-sm text-slate-400">This game has no concrete editable runtime settings registered yet.</p>}
        <p className="mt-2 text-xs text-slate-400">
          {auditRuleCount} additional level-dependent branches are catalogued
          as immutable identity, safety, or transport context. They are
          intentionally read-only because changing them would corrupt level
          selection or file compatibility.
        </p>
      </section>

      <section className="order-2 space-y-1">
      {terrainData.Meta ? (
        <p className="text-xs text-emerald-300">
          `Meta` resource present; it will be written as an embedded
          resource fork or a companion `.Meta.rsrc` file for this game.
        </p>
      ) : levelInfo && hasEditableRuntimeRules ? (
        <p className="text-xs text-emerald-300">
          Source identity resolved. Edit a property to create the `Meta`
          resource for this level.
        </p>
      ) : levelInfo ? (
        <p className="text-xs text-slate-400">
          Source identity resolved. This game has no editable metadata
          settings; the rows above are audit context.
        </p>
      ) : (
        <p className="text-xs text-amber-300">
          The current level identity is not matched to the known game table;
          resource-specific validation is unavailable.
        </p>
      )}
      <p className="text-xs text-slate-400">
        Resource destination: {resourceMode === "embedded" ? "embedded in the level resource fork" : "separate companion .Meta.rsrc file"}.
      </p>
      </section>
    </div>
    </TooltipProvider>
  );
}
