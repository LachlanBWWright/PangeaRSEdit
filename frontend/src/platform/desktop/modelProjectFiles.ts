import { err, ok, type Result } from "neverthrow";
import type { ProjectFile } from "@pangea/desktop-contracts";
import { getBG3DDownloadArtifacts, get3DMFDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import { getBG3DExportTargetForGame } from "@/modelParsers/bg3dExportTargets";
import { Game, type GlobalsInterface } from "@/data/globals/globals";

export async function modelProjectFiles(stem: string, glb: ArrayBuffer, globals: GlobalsInterface): Promise<Result<ProjectFile[], string>> {
  const files: ProjectFile[] = [{ path: `${stem}.glb`, bytes: new Uint8Array(glb) }];
  if (globals.GAME_TYPE === Game.MIGHTY_MIKE) return ok(files);
  const target = getBG3DExportTargetForGame(globals.GAME_TYPE);
  const name = stem.split("/").at(-1) ?? "model";
  if (globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR) {
    const output = await get3DMFDownloadArtifacts(glb, name, target);
    if (output.isErr()) return err(output.error);
    files.push({ path: `${stem}.3dmf`, bytes: new Uint8Array(output.value.modelBytes) });
    if (output.value.skeletonBytes) files.push({ path: `${stem}.skeleton.rsrc`, bytes: new Uint8Array(output.value.skeletonBytes) });
  } else {
    const output = await getBG3DDownloadArtifacts(glb, name, target);
    if (output.isErr()) return err(output.error);
    files.push({ path: `${stem}.bg3d`, bytes: new Uint8Array(output.value.bg3dBytes) });
    if (output.value.skeletonBytes) files.push({ path: `${stem}.skeleton.rsrc`, bytes: new Uint8Array(output.value.skeletonBytes) });
  }
  return ok(files);
}
