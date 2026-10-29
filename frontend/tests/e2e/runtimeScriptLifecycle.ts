export function routeRuntimeCallbacks(source: string): string {
  const aliases = ["Area", "Race"].flatMap((family) => [
    ...["Load", "Start", "Complete", "Unload"].map((event) =>
      `entry.on${family}${event} = entry.on${family}${event} or entry.onLevel${event}`),
    `entry.on${family}Frame = entry.onFrame`,
  ]);
  return source.replace("\nreturn entry\n", `\n${aliases.join("\n")}\nreturn entry\n`);
}
