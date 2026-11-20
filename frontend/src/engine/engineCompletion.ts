import * as monaco from "monaco-editor";
import { ENGINE_FUNCTIONS } from "./engineLanguage";

export function registerEngineCompletion() {
  return monaco.languages.registerCompletionItemProvider("lua", {
    triggerCharacters: ["."], provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const prefix = line.match(/([A-Za-z_]\w*)\.\w*$/)?.[1];
      if (!prefix) return { suggestions: [] };
      const aliases = ["engine", ...Array.from(model.getValue().matchAll(/\blocal\s+(\w+)\s*=\s*require\s*\(?\s*['"]engine['"]/g), (match) => match[1])];
      if (!aliases.includes(prefix)) return { suggestions: [] };
      const word = model.getWordUntilPosition(position);
      return { suggestions: ENGINE_FUNCTIONS.map((api) => ({ label: api.name, kind: monaco.languages.CompletionItemKind.Function,
        insertText: api.name, detail: `${api.name}(${api.signature})`, documentation: api.description,
        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn) })) };
    },
  });
}
