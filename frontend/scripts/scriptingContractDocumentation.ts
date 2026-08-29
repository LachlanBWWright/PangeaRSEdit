import type { ScriptingContract } from "../src/editor/subviews/scripts/scriptContract";

export const SCRIPTING_CONTRACT_DOCUMENTATION_START =
  "<!-- BEGIN GENERATED SCRIPTING CONTRACT INDEX -->";
export const SCRIPTING_CONTRACT_DOCUMENTATION_END =
  "<!-- END GENERATED SCRIPTING CONTRACT INDEX -->";

const resultShapePattern = /\b(?:[A-Z][A-Za-z0-9]*Result|Pangea(?:Capabilities|Diagnostics|PlayerSnapshot))\b/g;

export function getScriptingContractResultShapes(
  contract: ScriptingContract,
): readonly string[] {
  const declarations = [
    ...contract.api.hooks.map((hook) => hook.returnType),
    ...contract.api.apis.map((api) => api.returnType),
    ...contract.events.map((event) => event.result),
  ];
  const resultShapes = new Set<string>();
  for (const declaration of declarations) {
    for (const match of declaration.matchAll(resultShapePattern)) {
      const resultShape = match[0];
      if (resultShape) resultShapes.add(resultShape);
    }
  }
  return [...resultShapes];
}

function renderWrappedValues(title: string, values: readonly string[]): string {
  const lines: string[] = [`${title}:`];
  for (let index = 0; index < values.length; index += 8) {
    lines.push(values.slice(index, index + 8).join(" "));
  }
  return lines.join("\n");
}

function renderApiReference(contract: ScriptingContract): string {
  const lines = ["API reference:"];
  for (const api of contract.api.apis) {
    const parameters = api.parameters
      .map((parameter) => `${parameter.name}: ${parameter.type}${parameter.optional ? "?" : ""}`)
      .join(", ");
    const description = api.description === undefined ? "" : ` — ${api.description}`;
    lines.push(`${api.name}(${parameters}): ${api.returnType}${description}`);
  }
  return lines.join("\n");
}

export function renderScriptingContractDocumentationIndex(
  contract: ScriptingContract,
): string {
  const hooks = contract.api.hooks.map((hook) => hook.name);
  const events = contract.events.map((event) => event.id);
  const objectEvents = contract.objectEvents.map((event) => event.id);
  const apiFunctions = contract.api.apis.map((api) => api.name);
  const gameIds = contract.api.games.map((game) => game.gameId);
  const resultShapes = getScriptingContractResultShapes(contract);

  return [
    SCRIPTING_CONTRACT_DOCUMENTATION_START,
    "",
    "This index is generated from `frontend/src/editor/subviews/scripts/scriptContract.ts`.",
    "",
    renderWrappedValues("Hooks", hooks),
    "",
    renderWrappedValues("Events", events),
    "",
    renderWrappedValues("Object events", objectEvents),
    "",
    renderWrappedValues("Failure codes", [...contract.failureCodes]),
    "",
    renderWrappedValues("API functions", apiFunctions),
    "",
    renderApiReference(contract),
    "",
    renderWrappedValues("Result shapes", [...resultShapes]),
    "",
    renderWrappedValues("Game adapters", gameIds),
    "",
    SCRIPTING_CONTRACT_DOCUMENTATION_END,
  ].join("\n");
}
