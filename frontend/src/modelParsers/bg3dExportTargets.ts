export * from "../../../packages/model-codec/src/modelParsers/bg3dExportTargets";
import { Game } from "../data/globals/globals";
import { getBG3DExportTargetForGame as getTarget, type BG3DExportGameId } from "../../../packages/model-codec/src/modelParsers/bg3dExportTargets";

const gameIds: Readonly<Record<Game, BG3DExportGameId>> = {
  [Game.OTTO_MATIC]: "ottomatic", [Game.BUGDOM]: "bugdom", [Game.BUGDOM_2]: "bugdom2",
  [Game.NANOSAUR]: "nanosaur", [Game.NANOSAUR_2]: "nanosaur2", [Game.CRO_MAG]: "cromag",
  [Game.BILLY_FRONTIER]: "billyfrontier", [Game.MIGHTY_MIKE]: "mightymike",
};
export function getBG3DExportTargetForGame(game: Game) {
  return getTarget(gameIds[game]);
}
