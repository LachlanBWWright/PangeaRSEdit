import { useMemo, useState } from "react";
import { Result } from "neverthrow";
import { zipSync } from "fflate";
import { Button } from "@/components/ui/button";
import { SCRIPT_GUIDES } from "./scriptGuides";
import { ScriptGuideReader } from "./ScriptGuideReader";
import { buildScriptDocumentationFiles } from "./scriptDocumentation";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { scriptGuideSections } from "./scriptGuideBlocks";

export function ScriptLearningGuides({ workspace }: { workspace?: ScriptWorkspaceState }) {
  const [selected, setSelected] = useState("script-examples.md");
  const [section, setSection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const guide = SCRIPT_GUIDES.find((entry) => entry.file === selected) ?? SCRIPT_GUIDES[0];
  const sections = useMemo(() => scriptGuideSections(guide?.content ?? ""), [guide?.content]);
  const chapter = sections.find((entry) => entry.anchor === section) ?? sections[0];
  const navigate = (file: string, anchor = "") => { setSelected(file); setSection(anchor); };
  return <div className="grid min-w-0 gap-3">
    <label className="grid gap-1 text-xs">Read a guide<select className="h-9 min-w-0 rounded border border-slate-600 bg-slate-900 px-2" aria-label="Scripting guide" value={selected} onChange={(event) => navigate(event.target.value)}>{SCRIPT_GUIDES.map((entry) => <option key={entry.file} value={entry.file}>{entry.title}</option>)}</select></label>
    <label className="grid gap-1 text-xs">Section<select className="h-9 min-w-0 rounded border border-slate-600 bg-slate-900 px-2" aria-label="Guide section" value={chapter?.anchor ?? ""} onChange={(event) => setSection(event.target.value)}>{sections.map((entry) => <option key={entry.anchor} value={entry.anchor}>{entry.title}</option>)}</select></label>
    <p className="workbench-muted">{guide?.description}</p>
    <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => {
      const files = Object.fromEntries(buildScriptDocumentationFiles(workspace).map((file) => [file.path, file.bytes]));
      const result = Result.fromThrowable(() => zipSync(files, { level: 6 }), () => "Could not build the API manual download.")();
      if (result.isErr()) setError(result.error); else { setError(null); downloadBytes(result.value, "pangea-lua-manual.zip"); }
    }}>Download API manual</Button>
    <p className="text-xs text-slate-400">These guides and a complete API/type reference are also included in IDE library and script-package exports under Data/Scripts/docs.</p>
    {error && <p role="alert" className="workbench-notice" data-tone="warning">{error}</p>}
    {chapter && <ScriptGuideReader key={`${selected}-${chapter.anchor}`} content={chapter.content} onNavigate={navigate} />}
  </div>;
}
