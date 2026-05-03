import { Game } from "@/data/globals/globals";
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

export function resolveGltfUrl(gltfUrl?: string): string | null {
  if (!gltfUrl) {
    return null;
  }
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
  return base + gltfUrl.replace(/^\//, "");
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
