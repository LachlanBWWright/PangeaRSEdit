// vitest.setup.ts
import "vitest-canvas-mock";
import { mkdirSync } from "fs";
import path from "path";

mkdirSync(path.resolve(import.meta.dirname, "coverage/.tmp"), {
  recursive: true,
});
