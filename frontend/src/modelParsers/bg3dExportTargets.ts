import { Game } from "@/data/globals/globals";

export interface BG3DAliasResourceTarget {
  resourceId: number;
  name: "Limb BG3D Alias" | "Limb 3DMF Alias";
  companionExtension: "bg3d" | "3df";
}

export interface BG3DExportTarget {
  id: string;
  label: string;
  companionExtension: "bg3d" | "3df";
  aliasResourceId: number;
  aliasName: "Limb BG3D Alias" | "Limb 3DMF Alias";
  aliasPathPrefix: string;
  aliasResources?: BG3DAliasResourceTarget[];
}

export const DEFAULT_BG3D_EXPORT_TARGET: BG3DExportTarget = {
  id: "ottomatic",
  label: "Otto Matic",
  companionExtension: "bg3d",
  aliasResourceId: 1001,
  aliasName: "Limb BG3D Alias",
  aliasPathPrefix: "Projects:Otto:Project:Data:Skeletons:",
  aliasResources: [
    {
      resourceId: 1000,
      name: "Limb 3DMF Alias",
      companionExtension: "3df",
    },
    {
      resourceId: 1001,
      name: "Limb BG3D Alias",
      companionExtension: "bg3d",
    },
  ],
};

export const BG3D_EXPORT_TARGETS: BG3DExportTarget[] = [
  DEFAULT_BG3D_EXPORT_TARGET,
  {
    id: "cromag",
    label: "Cro-Mag Rally",
    companionExtension: "bg3d",
    aliasResourceId: 1001,
    aliasName: "Limb BG3D Alias",
    aliasPathPrefix: "Projects:Cro-Mag Rally:Project:Data:Skeletons:",
  },
  {
    id: "bugdom2",
    label: "Bugdom 2",
    companionExtension: "bg3d",
    aliasResourceId: 1000,
    aliasName: "Limb BG3D Alias",
    aliasPathPrefix:
      "Projects:Bugdom2:Project:Bugdom 2.app:Contents:MacOS:Data:Skeletons:",
  },
  {
    id: "nanosaur2",
    label: "Nanosaur 2",
    companionExtension: "bg3d",
    aliasResourceId: 1000,
    aliasName: "Limb BG3D Alias",
    aliasPathPrefix:
      "Projects:Nanosaur 2:Project:Nanosaur 2.app:Contents:Resources:Data:Skeletons:",
  },
  {
    id: "billyfrontier",
    label: "Billy Frontier",
    companionExtension: "bg3d",
    aliasResourceId: 1001,
    aliasName: "Limb BG3D Alias",
    aliasPathPrefix:
      "Projects:Billy Frontier:Project:Billy Frontier.app:Contents:MacOS:Data:Skeletons:",
  },
  {
    id: "bugdom",
    label: "Bugdom",
    companionExtension: "3df",
    aliasResourceId: 1000,
    aliasName: "Limb 3DMF Alias",
    aliasPathPrefix: "Projects:Bugdom:Data:Skeletons:",
  },
  {
    id: "nanosaur",
    label: "Nanosaur",
    companionExtension: "3df",
    aliasResourceId: 1000,
    aliasName: "Limb 3DMF Alias",
    aliasPathPrefix: "Projects:Nanosaur:Data:Skeletons:",
  },
];

export function getBG3DExportTarget(id: string): BG3DExportTarget {
  return (
    BG3D_EXPORT_TARGETS.find((target) => target.id === id) ??
    DEFAULT_BG3D_EXPORT_TARGET
  );
}

export function getBG3DExportTargetForGame(game: Game): BG3DExportTarget {
  switch (game) {
    case Game.BUGDOM:
      return getBG3DExportTarget("bugdom");
    case Game.BUGDOM_2:
      return getBG3DExportTarget("bugdom2");
    case Game.NANOSAUR:
      return getBG3DExportTarget("nanosaur");
    case Game.NANOSAUR_2:
      return getBG3DExportTarget("nanosaur2");
    case Game.CRO_MAG:
      return getBG3DExportTarget("cromag");
    case Game.BILLY_FRONTIER:
      return getBG3DExportTarget("billyfrontier");
    case Game.OTTO_MATIC:
    default:
      return getBG3DExportTarget("ottomatic");
  }
}
