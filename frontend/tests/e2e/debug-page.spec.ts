import { test } from "@playwright/test";

test("Debug page content", async ({ page }) => {
  await page.goto("/PangeaRSEdit/");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/debug-home-page.png", fullPage: true });
  
  const html = await page.content();
  console.log("Page HTML length:", html.length);
  
  const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
  console.log("Found", headings.length, "headings");
  for (const heading of headings) {
    const text = await heading.textContent();
    console.log("Heading:", text);
  }
});
