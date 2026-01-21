import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print("Navigating to editor...")
            await page.goto("http://localhost:5173/", timeout=30000)

            print("Waiting for game carousel...")
            await page.wait_for_selector("text=Otto Matic", timeout=10000)

            print("Clicking Level 1 button...")
            # Click the first button with text "Level 1" which should be Otto Matic's
            await page.click('button:has-text("Level 1")')

            print("Waiting for editor to load (CanvasOverlay)...")
            # Wait for the filter toggle button
            toggle_selector = 'button[title="Item Filters"]'
            await page.wait_for_selector(toggle_selector, timeout=30000)

            # Wait a bit for rendering to settle
            await asyncio.sleep(2)

            print("Clicking filter toggle...")
            await page.click(toggle_selector)

            print("Waiting for Item Filters panel...")
            await page.wait_for_selector("text=Item Filters", timeout=5000)

            print("Taking screenshot...")
            await page.screenshot(path="item_filters.png")
            print("Screenshot saved to item_filters.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="error_screenshot.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
