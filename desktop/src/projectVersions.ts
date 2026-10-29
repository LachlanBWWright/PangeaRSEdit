import * as fs from "node:fs/promises";
import { hash, io, projectPath, statOrMissing, type FileEntry } from "./files.ts";
export function isTextPath(relative: string) { return /\.(lua|json|txt|md|ts|js|yaml|yml|toml|xml|csv)$/i.test(relative); }

export function textBytes(bytes: Uint8Array | undefined): string | null {
  if (!bytes || bytes.length > 262144) return null;
  const text = new TextDecoder().decode(bytes);
  if (text.includes("\0")) return null;
  const encoded = new TextEncoder().encode(text);
  return encoded.length === bytes.length && encoded.every((value, i) => value === bytes[i]) ? text : null;
}

export class ProjectVersions {
  private readonly values = new Map<string, string>();
  private size = 0;
  get(digest: string) { return this.values.get(digest); }
  clear() { this.values.clear(); this.size = 0; }
  async capture(root: string, files: FileEntry[]) {
    for (const file of files) {
      if (file.size > 262144 || this.values.has(file.hash) || !isTextPath(file.path)) continue;
      const target = await projectPath(root, file.path);
      if (target.isErr()) continue;
      const info = await statOrMissing(target.value);
      if (info.isErr() || !info.value?.isFile() || info.value.size > 262144) continue;
      const bytes = await io(() => fs.readFile(target.value), "Cannot retain conflict baseline");
      if (bytes.isErr() || hash(bytes.value) !== file.hash) continue;
      const text = textBytes(bytes.value);
      if (text === null) continue;
      this.values.set(file.hash, text); this.size += text.length * 2;
      while (this.size > 16 * 1024 * 1024) {
        const oldest = this.values.entries().next().value;
        if (!oldest) break;
        this.values.delete(oldest[0]); this.size -= oldest[1].length * 2;
      }
    }
  }
}
