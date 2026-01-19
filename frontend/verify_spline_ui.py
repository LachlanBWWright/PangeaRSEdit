from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        print("Navigating to app...")
        try:
            page.goto("http://localhost:5173/PangeaRSEdit/", timeout=60000)

            # Wait for carousel or take screenshot after delay
            print("Waiting for content...")
            time.sleep(5)

            page.screenshot(path="/home/jules/verification/initial_load.png")
            print("Took initial screenshot.")

            # Check if we have Otto Matic text
            if page.get_by_text("Otto Matic").is_visible():
                print("Otto Matic visible.")
            else:
                print("Otto Matic NOT visible.")

            # Try to find Billy Frontier
            found = False
            for i in range(10):
                if page.get_by_text("Billy Frontier").is_visible():
                    found = True
                    print("Found Billy Frontier!")
                    page.screenshot(path="/home/jules/verification/billy_frontier_card.png")
                    break

                # Next button
                # Try finding button with class or child SVG
                next_btns = page.locator("button")
                # Iterate buttons and check visibility
                clicked = False
                count = next_btns.count()
                # Assuming the next button is towards the right or has specific icon.
                # In shadcn carousel, previous is first, next is second usually?
                # Or based on icon.
                # Let's just try to screenshot main page for now.

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error_state.png")

        browser.close()

if __name__ == "__main__":
    run()
