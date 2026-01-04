from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        # Navigate to the editor
        print("Navigating...")
        page.goto("http://localhost:3000/PangeaRSEdit/")

        # Wait for carousel to load
        print("Waiting for carousel...")
        try:
            page.wait_for_selector("text=Select a Game", timeout=10000)
        except:
            print("Could not find 'Select a Game' text, proceeding anyway...")

        # Find Mighty Mike
        print("Looking for Mighty Mike...")
        mightymike_btn = page.get_by_text("Mighty Mike").first

        if mightymike_btn.count() > 0:
            print("Found Mighty Mike in DOM, clicking...")
            mightymike_btn.scroll_into_view_if_needed()
            mightymike_btn.click()
        else:
            print("Mighty Mike button not found!")
            browser.close()
            return

        # Wait for Mighty Mike levels to appear
        print("Waiting for levels list...")
        page.wait_for_selector("text=Mighty Mike Levels")

        # Click on a level to load (e.g. Candy Cane Lane 1)
        print("Loading Candy Cane Lane 1...")
        page.get_by_role("button", name="Candy Cane Lane 1").click()

        # Wait for the editor view to load (canvas or toolbar)
        print("Waiting for editor...")
        page.wait_for_selector("button:has-text('Supertiles')", timeout=20000)

        # Wait a bit for the level to fully parse and render
        page.wait_for_timeout(2000)

        # Check if the download button is present
        download_btn = page.get_by_test_id("download-button")
        expect(download_btn).to_be_visible()

        print("Initiating download...")
        # Prepare for download
        # We increase timeout just in case
        try:
            with page.expect_download(timeout=10000) as download_info:
                download_btn.click()

            download = download_info.value
            path = download.path()
            suggested_filename = download.suggested_filename

            print(f"Download started: {suggested_filename}")

            # Save to verification folder
            save_path = f"verification/{suggested_filename}"
            download.save_as(save_path)

            # Verify file size
            size = os.path.getsize(save_path)
            print(f"Download complete. Saved to {save_path}, Size: {size} bytes")

            if size > 0:
                print("✅ VERIFICATION SUCCESS: File downloaded with content.")
            else:
                print("❌ VERIFICATION FAILURE: Downloaded file is empty.")

        except Exception as e:
            print(f"❌ VERIFICATION FAILURE: Download event not triggered or timed out. Error: {e}")

        browser.close()

if __name__ == "__main__":
    run()
