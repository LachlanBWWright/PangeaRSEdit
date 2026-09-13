import type { ScriptingContract } from "../src/editor/subviews/scripts/scriptContract";

interface HookListDefinition {
  readonly macro: string;
  readonly gameId: string;
}

export interface CapabilityMacroDefinition {
  readonly macro: string;
  readonly gameId: string;
}

const hookListDefinitions: readonly HookListDefinition[] = [
  { macro: "PANGEA_SCRIPT_OTTO_MATIC_HOOK_LIST", gameId: "OttoMatic-Android" },
  { macro: "PANGEA_SCRIPT_BUGDOM_HOOK_LIST", gameId: "Bugdom-android" },
  { macro: "PANGEA_SCRIPT_BUGDOM2_HOOK_LIST", gameId: "Bugdom2-Android" },
  { macro: "PANGEA_SCRIPT_NANOSAUR_HOOK_LIST", gameId: "Nanosaur-android" },
  { macro: "PANGEA_SCRIPT_NANOSAUR2_HOOK_LIST", gameId: "Nanosaur2-Android" },
  { macro: "PANGEA_SCRIPT_CRO_MAG_RALLY_HOOK_LIST", gameId: "CroMagRally-Android" },
  { macro: "PANGEA_SCRIPT_BILLY_FRONTIER_HOOK_LIST", gameId: "BillyFrontier-Android" },
  { macro: "PANGEA_SCRIPT_MIGHTY_MIKE_HOOK_LIST", gameId: "MightyMike-Android" },
];

export const scriptingContractCapabilityMacros: readonly CapabilityMacroDefinition[] = [
  { macro: "PANGEA_SCRIPT_OTTO_MATIC_CAPABILITIES", gameId: "OttoMatic-Android" },
  { macro: "PANGEA_SCRIPT_BUGDOM_CAPABILITIES", gameId: "Bugdom-android" },
  { macro: "PANGEA_SCRIPT_BUGDOM2_CAPABILITIES", gameId: "Bugdom2-Android" },
  { macro: "PANGEA_SCRIPT_NANOSAUR_CAPABILITIES", gameId: "Nanosaur-android" },
  { macro: "PANGEA_SCRIPT_NANOSAUR2_CAPABILITIES", gameId: "Nanosaur2-Android" },
  { macro: "PANGEA_SCRIPT_CRO_MAG_RALLY_CAPABILITIES", gameId: "CroMagRally-Android" },
  { macro: "PANGEA_SCRIPT_BILLY_FRONTIER_CAPABILITIES", gameId: "BillyFrontier-Android" },
  { macro: "PANGEA_SCRIPT_MIGHTY_MIKE_CAPABILITIES", gameId: "MightyMike-Android" },
];

function escapeCString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function renderMacro(
  macro: string,
  values: readonly string[],
  renderValue: (value: string) => string,
): string {
  const continuation = String.fromCharCode(92);
  const lines = values.map((value, index) => {
    const suffix = index === values.length - 1 ? "" : ` ${continuation}`;
    return `\t${renderValue(value)}${suffix}`;
  });
  return [`#define ${macro}(X) ${continuation}`, ...lines].join("\n");
}

function renderHookLists(contract: ScriptingContract): string {
  return hookListDefinitions
    .map((definition) => {
      const game = contract.api.games.find((candidate) => candidate.gameId === definition.gameId);
      const hooks = game?.supportedHooks ?? [];
      return renderMacro(definition.macro, hooks, (hook) => `X("${escapeCString(hook)}")`);
    })
    .join("\n\n");
}

function renderCapabilityMacros(contract: ScriptingContract): string {
  return scriptingContractCapabilityMacros
    .map((definition) => {
      const capabilities = contract.games[definition.gameId]?.capabilities;
      const values = [
        capabilities?.terrainItemHooks === "supported",
        capabilities?.splineItemHooks === "supported",
        capabilities?.mapItemHooks === "supported",
        capabilities?.pickupScoreEffects === "supported",
        capabilities?.objectCollision === "supported",
        capabilities?.playerScore === "supported",
        capabilities?.playerLives === "supported",
        capabilities?.playerInventory === "supported",
        capabilities?.weaponHitEvents === "supported" && capabilities?.playerScore === "supported",
        capabilities?.playerForm === "supported",
      ];
      return `#define ${definition.macro} { ${values.join(", ")} }`;
    })
    .join("\n\n");
}

function renderCommandLists(contract: ScriptingContract): string {
  const commands = contract.api.apis.filter(
    (api) => api.command !== undefined && !api.name.endsWith("Result"),
  );
  return renderMacro(
    "PANGEA_SCRIPT_COMMAND_DESCRIPTOR_LIST",
    commands.map((api) => {
      const command = api.command;
      return [
        api.name,
        command?.capability ?? "",
        command?.authority ?? "",
        command?.applicationPhase ?? "",
        command?.validation.join("; ") ?? "",
      ].join("\u0000");
    }),
    (encoded) => {
      const fields = encoded.split("\u0000");
      return `X(${fields.map((field) => `"${escapeCString(field)}"`).join(", ")})`;
    },
  );
}

function renderEventLists(contract: ScriptingContract): string {
  return renderMacro(
    "PANGEA_SCRIPT_EVENT_DESCRIPTOR_LIST",
    contract.events.map((event) => [
      event.id,
      event.applicationPhase,
      Object.entries(event.payload).map(([key, value]) => `${key}:${value}`).join(";"),
      event.result,
    ].join("\u0000")),
    (encoded) => {
      const fields = encoded.split("\u0000");
      return `X(${fields.map((field) => `"${escapeCString(field)}"`).join(", ")})`;
    },
  );
}

function renderObjectEventLists(contract: ScriptingContract): string {
  return renderMacro(
    "PANGEA_SCRIPT_OBJECT_EVENT_DESCRIPTOR_LIST",
    contract.objectEvents.map((event) => [
      event.id,
      event.handler,
      event.applicationPhase,
      event.cleanup,
      event.statePolicy,
      String(event.invalidatesHandle),
    ].join("\u0000")),
    (encoded) => {
      const fields = encoded.split("\u0000");
      const lastField = fields.pop() ?? "false";
      return `X(${fields.map((field) => `"${escapeCString(field)}"`).join(", ")}, ${lastField})`;
    },
  );
}

export function renderScriptingContractCMetadata(contract: ScriptingContract): string {
  const header = [
    "#pragma once",
    "",
    "/*",
    " * The descriptor lists are generated from the validated frontend scripting",
    " * contract. The runtime tables and contract checker consume this include.",
    " */",
  ].join("\n");
  return [
    header,
    renderHookLists(contract),
    renderCapabilityMacros(contract),
    renderCommandLists(contract),
    renderEventLists(contract),
    renderObjectEventLists(contract),
  ].join("\n\n") + "\n";
}
