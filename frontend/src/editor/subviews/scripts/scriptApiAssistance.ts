import { SCRIPTING_CONTRACT } from "./scriptContract";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiSignature, getApiParameterType } from "./scriptCompletionText";

export function apiHoverAtPosition(gameId: string, line: string, offset: number): string | null {
  const match = [...line.matchAll(/\bpangea\.[A-Za-z_]\w*\.[A-Za-z_]\w*/g)]
    .find((entry) => offset >= entry.index && offset <= entry.index + entry[0].length);
  const api = getAvailableApiFunctions(gameId, SCRIPTING_CONTRACT.api.apis).find((entry) => entry.name === match?.[0]);
  if (!api) return null;
  return [
    `\`\`\`lua\n${buildApiSignature(api)}\n\`\`\``,
    api.description ?? "",
    ...api.parameters.map((parameter) => `- \`${parameter.name}${parameter.optional ? "?" : ""}: ${getApiParameterType(api, parameter)}\` — ${parameter.description ?? ""}`),
    ...(api.command ? [`Applies during ${api.command.applicationPhase}; authority: ${api.command.authority}; capability: ${api.command.capability}.`, ...api.command.validation] : []),
  ].join("\n\n");
}
