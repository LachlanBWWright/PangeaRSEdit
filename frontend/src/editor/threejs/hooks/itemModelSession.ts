import { Result } from "neverthrow";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { closeAssetWorker } from "@/assets/modelAssets";
import type { CachedModel } from "./useItemModelCache";

export class ItemModelSession {
  public readonly models = new Map<string, CachedModel>();
  public readonly pending = new Set<string>();
  public active = false;
  public generation = 0;
  private worker: Worker | null = null;
  constructor(public readonly identity: string) {}
  public open() { this.generation++; this.active = true; }
  public close() {
    this.active = false;
    this.generation++;
    if (this.worker) closeAssetWorker(this.worker);
    this.worker = null;
    this.models.clear();
    this.pending.clear();
  }
  public getWorker() {
    return Result.fromThrowable(() => {
      this.worker ??= new BG3DGltfWorker();
      return this.worker;
    }, () => "Cannot start the model converter")();
  }
  public save(key: string, model: CachedModel) {
    this.models.set(key, model);
    while (this.models.size > 256) {
      const first = this.models.keys().next().value;
      if (!first) break;
      this.models.delete(first);
    }
    return new Map(this.models);
  }
}
