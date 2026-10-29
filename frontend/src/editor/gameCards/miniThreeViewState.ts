import { Game } from "@/data/globals/globals";
import { versionedAssetUrl } from "@/assets/assetState";
import type { AnimationInfo } from "@/components/AnimationViewer";

export function getDefaultAnimationName(gameType: Game): string | null {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return "Walk";
    case Game.BUGDOM:
      return "Walk";
    case Game.BUGDOM_2:
      return "Personality 2";
    case Game.NANOSAUR:
      return "Run";
    case Game.NANOSAUR_2:
      return "FlapWings";
    case Game.BILLY_FRONTIER:
      return "Draw&Shoot4";
    case Game.CRO_MAG:
      return "Sit";
    default:
      return null;
  }
}

export function resolveGltfUrl(gltfUrl?: string, revision?: number): string | null {
  if (!gltfUrl) {
    return null;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(gltfUrl)) return gltfUrl;
  return versionedAssetUrl(import.meta.env.BASE_URL + gltfUrl.replace(/^\//, ""), revision);
}

export function pickTargetAnimation(
  animationInfos: readonly AnimationInfo[],
  defaultAnimationName: string | null,
): AnimationInfo | null {
  if (animationInfos.length === 0) {
    return null;
  }

  if (!defaultAnimationName) {
    return animationInfos[0] ?? null;
  }

  const matched = animationInfos.find(
    (anim) => anim.name.toLowerCase() === defaultAnimationName.toLowerCase(),
  );
  return matched ?? animationInfos[0] ?? null;
}
