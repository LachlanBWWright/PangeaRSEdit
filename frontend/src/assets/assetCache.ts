import { err, ok, type ResultAsync } from "neverthrow";
import { getAssetState, registerAssetCache, reportAssetFailure, type AssetFailure } from "./assetState";

interface Entry<T> { result: ResultAsync<T, AssetFailure>; weight: number; token: symbol }
export class AssetCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private weight = 0;
  constructor(private readonly weigh: (value: T) => number, private readonly budget = 64 * 1024 * 1024,
    private readonly maximumEntries = 128) { registerAssetCache(() => this.clear()); }

  public clear() { this.entries.clear(); this.weight = 0; }
  public get(url: string, load: () => ResultAsync<T, AssetFailure>): ResultAsync<T, AssetFailure> {
    const revision = getAssetState().revision;
    const key = `${revision}:${url}`;
    const cached = this.entries.get(key);
    if (cached) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached.result;
    }
    const token = Symbol();
    const result = load().andThen((value) => {
      if (getAssetState().revision !== revision) return err({ code: "stale", url, message: "Game data changed during asset loading" });
      const entry = this.entries.get(key);
      if (entry?.token === token) { entry.weight = this.weigh(value); this.weight += entry.weight; }
      this.trim();
      return ok(value);
    }).mapErr((error) => {
      if (this.entries.get(key)?.token === token) this.entries.delete(key);
      if (getAssetState().revision === revision) reportAssetFailure(error);
      return error;
    });
    this.entries.set(key, { result, weight: 0, token });
    this.trim();
    return result;
  }

  private trim() {
    while (this.weight > this.budget || this.entries.size > this.maximumEntries) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) return;
      this.weight -= oldest[1].weight;
      this.entries.delete(oldest[0]);
    }
  }
}
