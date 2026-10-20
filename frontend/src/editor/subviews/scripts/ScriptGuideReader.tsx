import type { ReactNode } from "react";
import { scriptGuideBlocks, type ScriptGuideBlock } from "./scriptGuideBlocks";
import { scriptGuideTarget } from "./scriptGuides";

function GuideText({ text, onNavigate }: { text: string; onNavigate: (file: string, anchor?: string) => void }): ReactNode {
  return text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index} className="rounded bg-slate-950 px-1 text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!link?.[1] || !link[2]) return part;
    const target = link[2];
    const guide = scriptGuideTarget(target);
    if (guide) return <button key={index} type="button" className="text-blue-300 underline" onClick={() => onNavigate(guide.file, guide.anchor)}>{link[1]}</button>;
    if (/^https?:\/\//.test(target)) return <a key={index} href={target} target="_blank" rel="noreferrer" className="text-blue-300 underline">{link[1]}</a>;
    return <span key={index} title={`Repository reference: ${target}`}>{link[1]}</span>;
  });
}

function GuideBlock({ block, onNavigate }: { block: ScriptGuideBlock; onNavigate: (file: string, anchor?: string) => void }) {
  const text = (value: string) => <GuideText text={value} onNavigate={onNavigate} />;
  switch (block.kind) {
    case "heading": return <h4 className={block.level <= 2 ? "mt-5 text-base font-semibold" : "mt-3 text-sm font-semibold"}>{text(block.text)}</h4>;
    case "paragraph": return <p className="text-sm text-slate-300">{text(block.text)}</p>;
    case "code": return <pre className="overflow-x-auto rounded border border-slate-700 bg-slate-950 p-3 text-xs"><code>{block.text}</code></pre>;
    case "list": {
      const items = block.items.map((item, index) => <li key={index}>{text(item)}</li>);
      return block.ordered ? <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">{items}</ol> : <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">{items}</ul>;
    }
    case "table": return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{block.rows[0]?.map((cell, index) => <th key={index} className="border-b border-slate-600 p-2">{text(cell)}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="border-b border-slate-800 p-2 align-top">{text(cell)}</td>)}</tr>)}</tbody></table></div>;
  }
}

export function ScriptGuideReader({ content, onNavigate }: { content: string; onNavigate: (file: string, anchor?: string) => void }) {
  return <article className="script-guide grid min-w-0 content-start gap-3" aria-label="Scripting guide">{scriptGuideBlocks(content).map((block, index) => <GuideBlock key={index} block={block} onNavigate={onNavigate} />)}</article>;
}
