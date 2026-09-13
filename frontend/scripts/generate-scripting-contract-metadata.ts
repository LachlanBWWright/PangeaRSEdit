import { SCRIPTING_CONTRACT } from "../src/editor/subviews/scripts/scriptContract";
import { renderScriptingContractCMetadata } from "./scriptingContractCMetadata";

process.stdout.write(renderScriptingContractCMetadata(SCRIPTING_CONTRACT));
