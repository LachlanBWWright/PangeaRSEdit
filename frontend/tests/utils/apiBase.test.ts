import { describe, expect, it } from "vitest";
import { resolveApiBasePath } from "@/api/apiBase";

describe("resolveApiBasePath", () => {
  it("falls back to the app base URL when the API base path is absent", () => {
    expect(resolveApiBasePath(undefined, "/PangeaRSEdit/")).toBe(
      "/PangeaRSEdit",
    );
  });

  it("uses an explicit empty API base path as the API origin root", () => {
    expect(resolveApiBasePath("", "/PangeaRSEdit/")).toBe("");
  });

  it("uses a configured API base path when provided", () => {
    expect(resolveApiBasePath("/backend/", "/PangeaRSEdit/")).toBe("/backend");
  });

  it("normalizes root app base URL to no prefix", () => {
    expect(resolveApiBasePath(undefined, "/")).toBe("");
  });
});
