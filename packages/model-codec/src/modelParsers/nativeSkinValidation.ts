import type { Document } from "@gltf-transform/core";
import { err, ok, type Result } from "neverthrow";
import { getRigidInfluence } from "./rigidSkinning";
import { nativeNormal, nativePaletteMatch } from "./nativeSkinPalette";
import { nativeNormalBinding, readNativeNormalBindings } from "./nativeNormalBindings";

interface PaletteEntry { readonly values: readonly number[]; readonly joint: number; readonly location: string; }

function addOwner(palette: PaletteEntry[], entry: PaletteEntry, normal: boolean, jointNames: readonly string[]): Result<void, string> {
  const previous = palette.find((item) => nativePaletteMatch(item.values, entry.values, normal ? 0.02 : 0.001));
  if (!previous) { palette.push(entry); return ok(undefined); }
  if (previous.joint === entry.joint) return ok(undefined);
  const owners = `${jointNames[previous.joint] || previous.joint} and ${jointNames[entry.joint] || entry.joint}`;
  const fix = normal
    ? "Use one rigid joint for these matching normals, adjust their directions to differ by at least 0.02 on one axis, or export the parts as separate custom models."
    : "Assign coincident vertices to one rigid joint, move their positions at least 0.001 game units apart on one axis, or export the parts as separate custom models.";
  return err(`${entry.location} and ${previous.location} share a native ${normal ? "normal" : "position"} palette entry but belong to different joints (${owners}). Native skeletons cannot retain both owners. ${fix}`);
}

export function validateNativeSkinOwnership(document: Document): Result<void, string> {
  const joints = document.getRoot().listSkins()[0]?.listJoints() ?? [];
  if (joints.length === 0) return ok(undefined);
  const names = joints.map((joint) => joint.getName());
  const bindings = readNativeNormalBindings(document);
  const points: PaletteEntry[] = [];
  const normals: PaletteEntry[] = [];
  for (const [meshIndex, mesh] of document.getRoot().listMeshes().entries()) {
    for (const [primitiveIndex, primitive] of mesh.listPrimitives().entries()) {
      const jointAccessor = primitive.getAttribute("JOINTS_0");
      const weights = primitive.getAttribute("WEIGHTS_0");
      const positions = primitive.getAttribute("POSITION");
      if (!jointAccessor || !weights || !positions) continue;
      for (let vertex = 0; vertex < positions.getCount(); vertex += 1) {
        const owner = getRigidInfluence(jointAccessor, weights, vertex, joints.length);
        if (!owner) continue;
        const location = `Mesh ${mesh.getName() || meshIndex}, primitive ${primitiveIndex}, vertex ${vertex}`;
        const entry = { joint: owner.jointIndex, location, values: positions.getElement(vertex, []) };
        const pointResult = addOwner(points, entry, false, names);
        if (pointResult.isErr()) return pointResult;
        const normal = primitive.getAttribute("NORMAL");
        if (!normal) continue;
        const values = nativeNormal(normal.getElement(vertex, []));
        const binding = nativeNormalBinding(bindings, values);
        const normalResult = addOwner(normals, { ...entry, values, joint: binding ? binding.joint ?? -1 : owner.jointIndex }, true, names);
        if (normalResult.isErr()) return normalResult;
      }
    }
  }
  return ok(undefined);
}
