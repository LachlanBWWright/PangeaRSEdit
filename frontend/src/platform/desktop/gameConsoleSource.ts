import { relativePathSchema } from "@pangea/desktop-contracts";

export function gameConsoleSource(text: string): { path: string; line: number } | null {
  const match = /(?:^|[\s"'[\\/])(Data[\\/]Scripts[\\/][^\r\n"']+?\.lua)["']?\]?:(\d+)(?::|\b)/.exec(text);
  if (!match?.[1] || !match[2]) return null;
  const path = match[1].replaceAll("\\", "/").replace("/dist/modules/", "/src/");
  const parsed = relativePathSchema.safeParse(path);
  const line = Number(match[2]);
  return parsed.success && Number.isSafeInteger(line) && line > 0 && line <= 1000000 ? { path: parsed.data, line } : null;
}
