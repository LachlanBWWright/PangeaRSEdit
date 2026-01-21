import os
import time
from playwright.sync_api import Page, expect, sync_playwright

def test_tile_painting_ui(page: Page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))

    # 1. Navigate to the editor
    print("Navigating to editor...")
    page.goto("http://localhost:5173/PangeaRSEdit/", timeout=60000)

    # 2. Find Nanosaur card
    print("Finding Nanosaur card...")
    expect(page.get_by_text("Pangea Level Editor")).to_be_visible(timeout=30000)

    # "Nanosaur" heading. There is "Nanosaur 2", so exact=True matches "Nanosaur"
    nanosaur_heading = page.get_by_role("heading", name="Nanosaur", exact=True)
    expect(nanosaur_heading).to_be_visible()

    # Locate the card
    nanosaur_card = page.locator(".bg-gray-800").filter(has=nanosaur_heading).first

    level_file = os.path.abspath("games/nanosaur/Data/Terrain/Level1.trt")
    texture_file = os.path.abspath("games/nanosaur/Data/Terrain/Level1.ter")

    print(f"Using level file: {level_file}")
    print(f"Using texture file: {texture_file}")

    # Upload to first input (Level Data)
    print("Uploading Level Data...")
    file_inputs = nanosaur_card.locator("input[type='file']")
    expect(file_inputs.nth(0)).to_be_visible()

    file_inputs.nth(0).set_input_files(level_file)

    time.sleep(2)
    page.screenshot(path="/home/jules/verification/debug_after_upload_nano_1.png")

    # Upload to second input (Texture Data)
    print("Uploading Texture Data...")
    file_inputs.nth(1).set_input_files(texture_file)

    time.sleep(5) # Wait for parsing and loading (might take longer)
    page.screenshot(path="/home/jules/verification/debug_after_upload_nano_2.png")

    # 3. Wait for the editor view to load
    print("Waiting for editor view...")

    # We expect the "Tiles" button to be visible in the toolbar
    tiles_button = page.get_by_role("button", name="Tiles")
    expect(tiles_button).to_be_visible(timeout=30000)

    # 4. Click on "Tiles" view
    print("Clicking Tiles button...")
    tiles_button.click()

    # 5. Click on "Paint Tiles"
    print("Clicking Paint Tiles button...")
    paint_tiles_button = page.get_by_role("button", name="Paint Tiles")
    expect(paint_tiles_button).to_be_visible()
    paint_tiles_button.click()

    # 6. Verify Tile Palette is visible
    print("Verifying Tile Palette...")
    expect(page.get_by_text("Tile Palette")).to_be_visible()

    # 7. Take screenshot
    print("Taking screenshot...")
    time.sleep(2)
    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/tile_painting_ui.png")
    print("Screenshot taken at /home/jules/verification/tile_painting_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_tile_painting_ui(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
