const commonSounds = ["ui.confirm", "pickup.chime"];

export function presentationSounds(gameId: string): readonly string[] {
  if (gameId === "OttoMatic-Android") return [...commonSounds, "ui.cancel", "pickup.life", "checkpoint.activate", "teleport.arrive", "weapon.change", "warning.health"];
  if (gameId === "BillyFrontier-Android") return [...commonSounds, "ui.success", "ui.error", "timer.chime", "weapon.reload", "weapon.empty", "impact.metal", "impact.ricochet", "shield.hit"];
  if (gameId === "CroMagRally-Android") return [...commonSounds, "ui.reject", "vehicle.nitro", "vehicle.crash", "environment.splash"];
  return commonSounds;
}
