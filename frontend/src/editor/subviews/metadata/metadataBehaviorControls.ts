import { Game } from "@/data/globals/globals";
import type { MetadataControl } from "./levelMetadataRules";

const bugdomOrdinaryDescriptions: Readonly<Record<string, string>> = {
  "level.flyingBeeSetup": "Use ordinary flying-bee activation, limits, and spawn height, including on Hive levels.",
  "level.workerBeeSetup": "Spawn worker bees without Hive keyed activation.",
  "level.beeFlightRegeneration": "Prevent defeated flying bees from returning, including on the Flight level.",
  "level.queenBeeRegeneration": "Prevent defeated worker bees from returning, including on the Queen Bee level.",
  "level.antKing": "Disable Ant King setup and interactions, including on the original Ant King level.",
  "level.beachNutRegeneration": "Allow ordinary nut regeneration, including during the Beach ride.",
  "level.splineItems": "Place spline items on ordinary terrain rather than the Hive flat surface.",
};

const bugdom2OrdinaryDescriptions: Readonly<Record<string, string>> = {
  "level.fido": "Use ordinary flea and tick spawning, cleanup, and defeat rules instead of the Fido rules.",
  "level.terrain": "Use ordinary terrain movement instead of Balsa flight movement.",
  "level.dragonfly": "Use ordinary dragonfly scale, movement, collision, and regeneration instead of Balsa rules.",
  "level.objects": "Use ordinary shadow rotation and scaling instead of Balsa rules.",
  "level.particles": "Use ordinary particle placement instead of Balsa rules.",
  "level.powerups": "Use ordinary power-up timing and collection instead of Balsa rules.",
  "level.fileScale": "Use ordinary terrain height scaling instead of the Park adjustment.",
  "level.snake": "Use ordinary snake defeat handling instead of the Park fish sequence.",
  "level.trapRanges": "Use the ordinary firecracker interaction range instead of the Sidewalk range.",
  "level.mapPowerup": "Use the ordinary map power-up instead of the Closet paper map.",
};

export function addOrdinaryBehaviorOption(
  game: Game.BUGDOM | Game.BUGDOM_2,
  key: string,
  control: MetadataControl,
): MetadataControl {
  const descriptions = game === Game.BUGDOM ? bugdomOrdinaryDescriptions : bugdom2OrdinaryDescriptions;
  const description = descriptions[key];
  if (control.kind !== "select" || !description) return control;
  return {
    ...control,
    options: ["source-default", "ordinary", ...control.options.filter((option) => option !== "source-default")],
    optionLabels: { ...control.optionLabels, ordinary: "Ordinary behavior" },
    optionDescriptions: { ...control.optionDescriptions, ordinary: description },
  };
}
