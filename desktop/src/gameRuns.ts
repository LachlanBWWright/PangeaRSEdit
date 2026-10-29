import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { err, ok, Result, type Result as Outcome } from "neverthrow";
import type { GameRun, HostError } from "@pangea/desktop-contracts";
import { failure } from "./files.ts";
import { ScriptInspectorStream } from "./scriptInspectorStream.ts";
import { atomicWrite } from "./files.ts";
import { scriptInspectorPageSchema, scriptInspectorObjectSchema, type ScriptInspectorPage } from "@pangea/desktop-contracts";
import { z } from "zod";
import { encodeScriptStatePath, scriptStatePageSchema, type ScriptStateQuery, type ScriptStatePage } from "@pangea/desktop-contracts";

export interface LaunchObserver {
  spawn: (child: ChildProcess, inspectorRequest?: string) => void;
  exit: (code: number | null, signal: string | null) => void;
}
interface RunRecord { value: GameRun; child?: ChildProcess; inspectorRequest?: string; inspectionQueue?: Promise<void>; pending?: { sequence: number; receive: (page: unknown) => void }; restart?: () => Promise<Outcome<void, HostError>>; killTimer?: ReturnType<typeof setTimeout> }

function rejectPending(record: RunRecord) { record.pending?.receive(null); }

export class GameRuns {
  private readonly records = new Map<string, RunRecord>();
  private notifyTimer: ReturnType<typeof setTimeout> | undefined;
  private querySequence = 0;
  constructor(private readonly notify: (runs: GameRun[]) => void) {}

  list(): GameRun[] { return [...this.records.values()].map((record) => record.value); }

  begin(game: string, restart: () => Promise<Outcome<void, HostError>>, sourceProject: string | null = null) {
    for (const record of this.records.values()) { record.restart = undefined; record.value.canRestart = false; }
    const id = randomUUID();
    const record: RunRecord = { value: { id, game, state: "starting", exitCode: null, signal: null,
      startedAt: new Date().toISOString(), output: [], droppedBytes: 0, canRestart: false, sourceProject }, restart };
    this.records.set(id, record);
    for (const [key, previous] of this.records) {
      if (this.records.size <= 16) break;
      if (!previous.child && key !== id) this.records.delete(key);
    }
    this.changed();
    const observer: LaunchObserver = {
      spawn: (child, inspectorRequest) => {
        record.inspectorRequest = inspectorRequest;
        record.child = child; record.value.state = "running"; record.value.canRestart = record.restart !== undefined;
        const streams: ("stdout" | "stderr")[] = ["stdout", "stderr"];
        for (const stream of streams) {
          const decoder = new StringDecoder("utf8");
          const inspector = new ScriptInspectorStream((snapshot) => { record.value.inspector = snapshot; this.changed(); }, (sequence, page) => {
            if (record.pending?.sequence === sequence) record.pending.receive(page);
          });
          child[stream]?.on("data", (bytes: Buffer) => this.append(record, stream, inspector.feed(decoder.write(bytes))));
          child[stream]?.once("end", () => this.append(record, stream, inspector.feed(decoder.end()) + inspector.finish()));
        }
        this.changed();
      },
      exit: (code, signal) => {
        rejectPending(record);
        clearTimeout(record.killTimer); record.child = undefined;
        record.value.state = "exited"; record.value.exitCode = code; record.value.signal = signal;
        record.value.canRestart = record.restart !== undefined;
        this.changed();
      },
    };
    return { id, observer };
  }

  failed(id: string, message: string) {
    const record = this.records.get(id);
    if (!record) return;
    record.value.state = "failed"; record.value.canRestart = record.restart !== undefined;
    this.append(record, "host", message); this.changed();
  }

  queryObjects(id: string, query: { offset: number; scriptedOnly: boolean; handle?: { id: number; generation: number } }): Promise<Outcome<ScriptInspectorPage, HostError>> {
    return this.serializeInspection(id, () => this.requestObjects(id, query));
  }

  queryState(id: string, query: ScriptStateQuery): Promise<Outcome<ScriptStatePage, HostError>> {
    return this.serializeInspection(id, () => this.requestState(id, query));
  }

  private serializeInspection<T>(id: string, request: () => Promise<Outcome<T, HostError>>): Promise<Outcome<T, HostError>> {
    const record = this.records.get(id);
    if (!record) return Promise.resolve(err(failure("This game is unavailable", "unavailable")));
    const response = (record.inspectionQueue ?? Promise.resolve()).then(request);
    record.inspectionQueue = response.then(() => undefined);
    return response;
  }

  private async requestObjects(id: string, query: { offset: number; scriptedOnly: boolean; handle?: { id: number; generation: number } }): Promise<Outcome<ScriptInspectorPage, HostError>> {
    const record = this.records.get(id);
    if (!record?.child || record.value.state !== "running" || !record.inspectorRequest) return err(failure("Launch Test Current Level with an updated game to browse live objects", "unavailable"));
    if (record.pending) return err(failure("An object inspection request is already pending", "unavailable"));
    const sequence = ++this.querySequence;
    const response = new Promise<Outcome<ScriptInspectorPage, HostError>>((resolve) => {
      const timer = setTimeout(() => {
        record.pending = undefined;
        resolve(err(failure("The game did not answer object inspection; update its native build", "timeout")));
      }, 3000);
      record.pending = { sequence, receive: (raw) => {
        clearTimeout(timer); record.pending = undefined;
        if (query.handle) {
          const single = z.object({ objects: z.array(scriptInspectorObjectSchema).max(1), error: z.string().nullable() }).safeParse(raw);
          if (!single.success) return resolve(err(failure("Invalid native object response", "invalid")));
          if (single.data.error) return resolve(err(failure(single.data.error, "invalid")));
          return resolve(ok({ ...single.data, offset: 0, nextOffset: null, total: single.data.objects.length, truncated: false }));
        }
        const page = scriptInspectorPageSchema.safeParse(raw);
        resolve(!page.success ? err(failure("Invalid native object page", "invalid")) : page.data.error ? err(failure(page.data.error, "invalid")) : ok(page.data));
      } };
    });
    const text = `${sequence} ${query.offset} ${Number(query.scriptedOnly)} ${query.handle?.id ?? 0} ${query.handle?.generation ?? 0}`;
    const written = await atomicWrite(record.inspectorRequest, new TextEncoder().encode(text));
    if (written.isErr()) {
      rejectPending(record);
      return err(written.error);
    }
    return response;
  }

  private async requestState(id: string, query: ScriptStateQuery): Promise<Outcome<ScriptStatePage, HostError>> {
    const record = this.records.get(id);
    if (!record?.child || record.value.state !== "running" || !record.inspectorRequest) return err(failure("Launch an updated game to inspect state", "unavailable"));
    if (record.pending) return err(failure("Another inspection request is pending. Try again.", "unavailable"));
    const sequence = ++this.querySequence;
    const response = new Promise<Outcome<ScriptStatePage, HostError>>((resolve) => {
      const timer = setTimeout(() => { record.pending = undefined; resolve(err(failure("The game did not answer state inspection", "timeout"))); }, 3000);
      record.pending = { sequence, receive: (raw) => {
        clearTimeout(timer); record.pending = undefined;
        const page = scriptStatePageSchema.safeParse(raw);
        resolve(!page.success ? err(failure("Invalid native state response", "invalid")) : page.data.error ? err(failure(page.data.error, "invalid")) : ok(page.data));
      } };
    });
    const text = `${sequence} ${query.offset} 0 ${query.handle.id} ${query.handle.generation} state 32 ${encodeScriptStatePath(query.path) || "-"}`;
    const written = await atomicWrite(record.inspectorRequest, new TextEncoder().encode(text));
    if (written.isErr()) { rejectPending(record); return err(written.error); }
    return response;
  }

  stop(id: string): Outcome<void, HostError> {
    const record = this.records.get(id);
    if (!record?.child || record.value.state !== "running") return err(failure("This game is not running", "not-running"));
    const child = record.child;
    const killed = Result.fromThrowable(() => child.kill(), () => failure("Cannot stop game"))();
    if (killed.isErr()) return err(killed.error);
    if (!killed.value) return err(failure("The game could not be stopped"));
    record.value.state = "stopping";
    record.killTimer = setTimeout(() => {
      if (record.child === child) Result.fromThrowable(() => child.kill("SIGKILL"), () => failure("Cannot terminate game"))();
    }, 3000);
    record.killTimer.unref(); this.changed();
    return ok(undefined);
  }

  async restart(id: string): Promise<Outcome<void, HostError>> {
    const record = this.records.get(id);
    if (!record?.restart) return err(failure("Only the most recent launch snapshot can be restarted", "unavailable"));
    const restart = record.restart;
    if (record.child) {
      const child = record.child;
      const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
      const stopped = this.stop(id);
      if (stopped.isErr()) return stopped;
      await closed;
    }
    record.restart = undefined; record.value.canRestart = false;
    return restart();
  }

  private append(record: RunRecord, stream: "stdout" | "stderr" | "host", text: string) {
    if (!text) return;
    const sequence = (record.value.output.at(-1)?.sequence ?? 0) + 1;
    const clipped = text.slice(-32768);
    record.value.droppedBytes += Buffer.byteLength(text) - Buffer.byteLength(clipped);
    record.value.output.push({ sequence, stream, text: clipped });
    let size = record.value.output.reduce((total, item) => total + Buffer.byteLength(item.text), 0);
    while (size > 262144 || record.value.output.length > 1024) {
      const removed = record.value.output.shift();
      if (!removed) break;
      const bytes = Buffer.byteLength(removed.text); size -= bytes; record.value.droppedBytes += bytes;
    }
    this.changed();
  }

  private changed() {
    if (this.notifyTimer) return;
    this.notifyTimer = setTimeout(() => { this.notifyTimer = undefined; this.notify(this.list()); }, 100);
    this.notifyTimer.unref();
  }
}
