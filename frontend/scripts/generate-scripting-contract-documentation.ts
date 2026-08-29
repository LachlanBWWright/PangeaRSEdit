import { SCRIPTING_CONTRACT } from "../src/editor/subviews/scripts/scriptContract";
import { renderScriptingContractDocumentationIndex } from "./scriptingContractDocumentation";

process.stdout.write(`${renderScriptingContractDocumentationIndex(SCRIPTING_CONTRACT)}\n`);
