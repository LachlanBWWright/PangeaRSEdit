import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadFileFromGoogleDrive,
  uploadFileToGoogleDrive,
} from "@/utils/googleDrive";

describe("googleDrive helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns uploaded file id on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["test"], "sample.ter.rsrc");
    const result = await uploadFileToGoogleDrive(file, "token");
    expect("fileId" in result ? result.fileId : "").toBe("abc123");
  });

  it("returns download filename from metadata when available", async () => {
    const blob = new Blob(["level"]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "imported.ter.rsrc" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadFileFromGoogleDrive("abc123", "token");
    expect("filename" in result ? result.filename : "").toBe("imported.ter.rsrc");
  });
});
