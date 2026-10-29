import { useEffect, useState } from "react";
import { editorPreferencesSchema, type EditorPreferences } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { desktopBridge, desktopRequest } from "./client";

export function ExternalEditorSettings() {
  const [preferences, setPreferences] = useState<EditorPreferences>({ editor: "system" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!desktopBridge()) return;
    void desktopRequest({ operation: "editor.preferences" }, editorPreferencesSchema).then((result) => {
      if (result.isOk()) setPreferences(result.value); else toast.error(result.error.message);
    });
  }, []);
  async function configure(value: string) {
    const parsed = editorPreferencesSchema.shape.editor.safeParse(value);
    if (!parsed.success || busy) return;
    setBusy(true);
    const result = await desktopRequest({ operation: "editor.configure", editor: parsed.data }, editorPreferencesSchema);
    if (result.isOk()) setPreferences(result.value);
    else if (result.error.code !== "cancelled") toast.error(result.error.message);
    setBusy(false);
  }
  return <label className="grid gap-2 text-sm">Preferred external editor<select className="rounded border bg-slate-900 p-2" disabled={busy} value={preferences.editor} onChange={(event) => void configure(event.target.value)}>
    <option value="system">System file association</option><option value="vscode">Visual Studio Code</option><option value="vscodium">VSCodium</option><option value="custom">Choose application…</option>
  </select><span className="break-all text-xs text-muted-foreground">{preferences.executable ?? "VS Code and VSCodium support opening traceback locations at the reported line. Other applications receive the file path."}</span></label>;
}
