import { watch, type FSWatcher } from "node:fs";
import { Result } from "neverthrow";
import { relativePathSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import type { ProjectStore } from "./projectStore.ts";
import { isAuthoringSourcePath } from "./authoringPaths.ts";

export class ProjectWatcher {
  private watcher: FSWatcher | undefined;
  private folder: string | null = null;
  private revision = "";
  private pending: ReturnType<typeof setTimeout> | undefined;
  private checking = false;
  private lastCheck = 0;
  private stopped = false;
  private readonly timer: ReturnType<typeof setInterval>;
  constructor(private readonly project: ProjectStore, private readonly notify: (snapshot: ProjectSnapshot) => void) {
    this.timer = setInterval(() => this.tick(), 1000);
  }

  close() { this.stopped = true; clearInterval(this.timer); clearTimeout(this.pending); this.watcher?.close(); }

  private tick() {
    if (this.folder !== this.project.folder()) this.attach();
    if (this.folder && Date.now() - this.lastCheck >= 2500) this.schedule();
  }

  private attach() {
    this.watcher?.close(); this.watcher = undefined; this.folder = this.project.folder(); this.revision = "";
    if (!this.folder) return;
    const watched = Result.fromThrowable(() => watch(this.folder ?? "", { recursive: true, encoding: "utf8" }, (_event, filename) => {
      if (filename && isAuthoringSourcePath(filename.replaceAll("\\", "/"))) return;
      if (filename && !relativePathSchema.safeParse(filename.replaceAll("\\", "/")).success) return;
      this.project.invalidate(filename?.replaceAll("\\", "/")); this.schedule();
    }), () => "Recursive watching is unavailable")();
    if (watched.isOk()) {
      this.watcher = watched.value;
      watched.value.on("error", () => { watched.value.close(); if (this.watcher === watched.value) this.watcher = undefined; this.schedule(); });
    }
    this.schedule();
  }

  private schedule() {
    if (this.stopped) return;
    clearTimeout(this.pending);
    this.pending = setTimeout(() => void this.refresh(), 200);
  }

  private async refresh() {
    if (this.checking || this.project.busy()) { this.schedule(); return; }
    const folder = this.folder;
    if (!folder || folder !== this.project.folder() || this.stopped) return;
    this.checking = true;
    const snapshot = await this.project.inspect();
    this.lastCheck = Date.now(); this.checking = false;
    if (this.stopped || folder !== this.project.folder() || snapshot.isErr()) return;
    if (this.revision !== snapshot.value.revision) { this.revision = snapshot.value.revision; this.notify(snapshot.value); }
  }
}
