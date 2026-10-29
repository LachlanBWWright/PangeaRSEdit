import { ResultAsync } from "neverthrow";
import type { ProjectAsset } from "@pangea/desktop-contracts";
import { workflowProject } from "./workflowFixtures.stories.support";

export const storyModelAsset: ProjectAsset = {
  version: 1, id: "00000000-0000-4000-8000-000000000011", revision: "00000000-0000-4000-8000-000000000012",
  name: "Rescue robot", game: "OttoMatic", importedAt: "2026-10-22T00:00:00.000Z", previousRevision: null,
  source: { mode: "managed", path: "AuthoringSources/robot.blend", originalName: "robot.blend", format: "blend", dependencies: [], fingerprint: "fixture" },
  outputs: { model: "Assets/Models/00000000-0000-4000-8000-000000000011/00000000-0000-4000-8000-000000000012/model.bg3d", skeleton: "Assets/Models/00000000-0000-4000-8000-000000000011/00000000-0000-4000-8000-000000000012/model.skeleton.rsrc", preview: "Assets/Models/00000000-0000-4000-8000-000000000011/00000000-0000-4000-8000-000000000012/preview.glb", files: [] },
  animations: ["Standing", "Walk", "WalkWithGun", "StandWithGun", "Punch", "Pickup", "Pickup2", "Grabbed", "Flattened", "Charging", "JumpJet", "Jump", "Fall", "Zapped", "Drowned", "GotHit", "Accordian", "ChangeWeapon", "Bubble", "Magnet", "SuckedIntoWell", "GiantJumpJet", "Thrown", "Grabbed2", "Drink", "RideZip", "ClimbInto", "ShotFromCannon", "BumperCar", "GrabbedByStrongMan", "Throw", "RocketSled", "SitOnLedge", "Drilled", "Slide"].map((name, index) => ({ name, index })),
  warnings: [], recipe: { scale: 1, rotation: [0, 0, 0] },
  materials: [{ index: 0, name: "Material_0000" }, { index: 1, name: "Material_0001" }],
};

export function installModelAssetStoryBridge(review = false, initialAssets: ProjectAsset[] = []) {
  const previous = window.pangeaDesktop;
  let assets: ProjectAsset[] = initialAssets;
  let pending = false;
  window.pangeaDesktop = {
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
    request: async (request) => {
      switch (request.operation) {
        case "assets.list": return { ok: true, value: assets };
        case "assets.pending": return { ok: true, value: pending ? [{ asset: storyModelAsset, needsReview: true, reasons: ["Skin weights were simplified to one joint per vertex. Review the converted model before accepting."] }] : [] };
        case "assets.import":
          pending = review;
          if (!pending) assets = [storyModelAsset];
          return { ok: true, value: { asset: storyModelAsset, needsReview: pending, reasons: [] } };
        case "assets.accept": assets = [storyModelAsset]; pending = false; return { ok: true, value: storyModelAsset };
        case "assets.reimport": {
          const asset = { ...storyModelAsset, recipe: request.recipe ?? storyModelAsset.recipe };
          assets = [asset];
          return { ok: true, value: { asset, needsReview: false, reasons: [] } };
        }
        case "assets.discard": pending = false; return { ok: true, value: undefined };
        case "assets.preview": {
          const bytes = await ResultAsync.fromPromise(fetch(`${import.meta.env.BASE_URL}glbModels/OttoMatic.glb`).then((response) => response.arrayBuffer()), () => "Bundled Otto preview is unavailable.");
          return bytes.isOk() ? { ok: true, value: new Uint8Array(bytes.value) } : { ok: false, error: { code: "fixture", message: bytes.error } };
        }
        case "assets.configure-blender": return { ok: true, value: { executable: "/usr/bin/blender" } };
        case "assets.external": return { ok: true, value: undefined };
        case "project.inspect": return { ok: true, value: workflowProject };
        default: return { ok: false, error: { code: "fixture", message: "This story covers custom object appearance and model import." } };
      }
    },
  };
  return () => { window.pangeaDesktop = previous; };
}
