import { describe, expect, it } from "vitest";
import { resolveApiBasePath } from "@/api/apiBase";

describe("resolveApiBasePath", () => {
  it("falls back to the app base URL when the API base path is absent", () => {
    expect(resolveApiBasePath(undefined, "/PangeaRSEdit/")).toBe(
      "/PangeaRSEdit",
    );
  });

  it("falls back to the app base URL when the API base path is empty", () => {
    expect(resolveApiBasePath("", "/PangeaRSEdit/")).toBe("/PangeaRSEdit");
  });

  it("uses a configured API base path when provided", () => {
    expect(resolveApiBasePath("/backend/", "/PangeaRSEdit/")).toBe("/backend");
  });

  it("normalizes root app base URL to no prefix", () => {
    expect(resolveApiBasePath(undefined, "/")).toBe("");
  });
});
