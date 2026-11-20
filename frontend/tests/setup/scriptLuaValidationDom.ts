import "./scriptLuaValidation";
import { afterAll, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const base = document.createElement("base");
base.href = pathToFileURL(createRequire(import.meta.url).resolve("wasmoon")).href;
beforeAll(() => document.head.prepend(base));
afterAll(() => base.remove());
