import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ScriptImportReviewDialog } from "./ScriptImportReviewDialog";

it("keeps a pending restoration review open and disables selection, apply and cancel", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onClose = vi.fn();
  const onApply = vi.fn();
  await act(async () => root.render(<ScriptImportReviewDialog title="Import shared library" error={null} busy
    changes={[{ key: "source:new.lua", kind: "source", label: "new.lua", before: null, after: "return {}" }]}
    onClose={onClose} onApply={onApply} />));
  const checkbox = document.querySelector('input[type="checkbox"]');
  expect(checkbox?.hasAttribute("disabled")).toBe(true);
  const cancel = [...document.querySelectorAll("button")].find((button) => button.textContent === "Cancel");
  const apply = [...document.querySelectorAll("button")].find((button) => button.textContent === "Restoring editable assets…");
  expect(cancel?.disabled).toBe(true);
  expect(apply?.disabled).toBe(true);
  await act(async () => {
    cancel?.click(); apply?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  expect(onClose).not.toHaveBeenCalled();
  expect(onApply).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  container.remove();
});
