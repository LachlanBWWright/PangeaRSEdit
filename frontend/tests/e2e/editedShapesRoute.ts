import { expect, type Page } from "@playwright/test";
import { parseShapesFile } from "../../src/parsers/mightyMikeShapesParser";
import { writeShapesFile } from "../../src/parsers/mightyMikeShapesWriter";

export async function installEditedShapesRoute(page: Page) {
  const requests = { encoded: 0 };
  await page.route("**/data/mightymike/shapes/main.shapes", async (route) => {
    const response = await route.fetch();
    const source = await response.body();
    const parsed = parseShapesFile(Uint8Array.from(source).buffer);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) { await route.abort(); return; }
    const frame = parsed.value.shapes[0]?.frames[0];
    expect(frame).toBeDefined();
    if (!frame) { await route.abort(); return; }
    frame.pixels[0] = ((frame.pixels[0] ?? 0) + 1) % 255;
    frame.header.offsetX += 1;
    const encoded = writeShapesFile(parsed.value);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) { await route.abort(); return; }
    requests.encoded++;
    await route.fulfill({ response, body: Buffer.from(encoded.value) });
  });
  return requests;
}
