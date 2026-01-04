from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the editor
        print("Navigating...")
        page.goto("http://localhost:3000/PangeaRSEdit/")

        # Wait for carousel to load
        print("Waiting for carousel...")
        # Try to wait for the intro container if specific text is missing
        # Or look for any game card
        try:
            page.wait_for_selector("text=Select a Game", timeout=10000)
        except:
            print("Could not find 'Select a Game' text, looking for something else...")
            page.screenshot(path="verification/debug_nav.png")


        # Find Mighty Mike
        print("Looking for Mighty Mike...")
        mightymike_btn = page.get_by_text("Mighty Mike").first

        # If not visible, we might need to scroll the carousel
        if not mightymike_btn.is_visible():
            print("Mighty Mike not visible, trying to find it...")
            # Try to find next button
            next_btns = page.get_by_role("button")
            # This is a bit of a guess without seeing the DOM, but typically carousels have next buttons
            # Let's try to screenshot to see what's there
            page.screenshot(path="verification/carousel_state.png")

            # Simple hack: try to force click it even if hidden, or find it in the DOM
            # Or just wait a bit?

            # Better: Loop through buttons and see if one is a 'next' arrow
            # But let's try to just click the Mighty Mike text if it exists in DOM
            if mightymike_btn.count() > 0:
                print("Found Mighty Mike in DOM, scrolling into view...")
                mightymike_btn.scroll_into_view_if_needed()
                mightymike_btn.click()
            else:
                print("Mighty Mike not found in DOM!")
                # List all text to debug
                # print(page.content())
        else:
            mightymike_btn.click()

        # Wait for Mighty Mike levels to appear
        print("Waiting for levels list...")
        page.wait_for_selector("text=Mighty Mike Levels")

        # Click on a level to load (e.g. Candy Cane Lane 1)
        print("Loading Candy Cane Lane 1...")
        page.get_by_role("button", name="Candy Cane Lane 1").click()

        # Wait for the editor view to load (canvas or toolbar)
        print("Waiting for editor...")
        # Check for toolbar buttons specific to Mighty Mike (Items, Supertiles, Tiles)
        page.wait_for_selector("button:has-text('Supertiles')", timeout=20000)

        # Wait a bit for the level to fully parse and render
        page.wait_for_timeout(2000)

        # Check if the download button is present
        download_btn = page.get_by_test_id("download-button")
        expect(download_btn).to_be_visible()

        # Take a screenshot
        page.screenshot(path="verification/mightymike_editor.png")
        print("Screenshot saved to verification/mightymike_editor.png")

        browser.close()

if __name__ == "__main__":
    run()
