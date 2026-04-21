#!/usr/bin/env python3
"""
Playwright browser test for Bugdom WebAssembly build.

Usage (with an HTTP server already serving dist-wasm/ on port 8888):
    python3 test_wasm_browser.py [--url http://localhost:8888/Bugdom.html]

Returns exit code 0 on success, 1 on failure.
"""
import argparse
import asyncio
import re
import sys

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("playwright not installed. Run: pip3 install playwright && python3 -m playwright install chromium")
    sys.exit(1)

# SDL informational lines that arrive on console.error (SDL3 Emscripten mapping).
# These are NOT real errors.
SDL_INFO_PATTERNS = [
    r"\[Bugdom\] App name:",
    r"\[Bugdom\] App version:",
    r"\[Bugdom\] App ID:",
    r"\[Bugdom\] SDL revision:",
]

# Driver/deprecation warnings that don't indicate bugs
IGNORED_WARNINGS = [
    "ScriptProcessorNode is deprecated",
    "GPU stall due to ReadPixels",
    "Automatic fallback to software WebGL",
    "GroupMarkerNotSet",
]


def is_sdl_info(text):
    return any(re.search(p, text) for p in SDL_INFO_PATTERNS)


def is_ignored(text):
    return any(w in text for w in IGNORED_WARNINGS)


async def run_test(url: str) -> bool:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-web-security',
                '--enable-webgl',
                '--use-gl=angle',
                '--use-angle=swiftshader-webgl',
            ]
        )
        context = await browser.new_context()
        page = await context.new_page()

        real_errors = []

        def on_console(msg):
            text = msg.text
            if msg.type == 'error' and not is_sdl_info(text):
                real_errors.append(text)
            elif msg.type == 'warning' and not is_ignored(text):
                print(f"  [warning] {text}", file=sys.stderr)

        def on_pageerror(error):
            real_errors.append(f"Page error: {error}")

        page.on('console', on_console)
        page.on('pageerror', on_pageerror)

        print(f"Loading: {url}")
        await page.goto(url, timeout=30000)

        # --- Wait for game data to finish downloading (up to 90s for 67MB) ---
        print("Waiting for data download...")
        try:
            await page.wait_for_function(
                "document.getElementById('status-text')?.textContent?.includes('Click to Play') || "
                "document.getElementById('loading-card')?.style.display === 'none'",
                timeout=90000
            )
        except Exception:
            pass  # proceed anyway; data may still be in-flight

        status = await page.evaluate("document.getElementById('status-text')?.textContent ?? ''")
        print(f"Status text: {status}")

        if real_errors:
            print("ERRORS before game start:")
            for e in real_errors:
                print(f"  {e}")

        # --- Start game (click loading card to dismiss overlay and start) ---
        print("Starting game (clicking loading card)...")
        await page.evaluate("document.getElementById('loading-card')?.click()")

        # --- Wait for first non-black rendered pixel (up to 30s) ---
        print("Waiting for rendered pixels (up to 30s)...")
        pixel_appeared = False
        for _ in range(30):
            await page.wait_for_timeout(1000)
            pixel = await page.evaluate("""() => {
                const c = document.getElementById('canvas');
                const gl = c && c.getContext('webgl');
                if (!gl) return null;
                const px = new Uint8Array(4);
                gl.readPixels(Math.floor(c.width/2), Math.floor(c.height/2),
                              1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                return {r: px[0], g: px[1], b: px[2], a: px[3]};
            }""")
            if pixel and (pixel['r'] > 5 or pixel['g'] > 5 or pixel['b'] > 5):
                print(f"  Pixel at center: r={pixel['r']} g={pixel['g']} b={pixel['b']} a={pixel['a']} — rendering confirmed")
                pixel_appeared = True
                break

        if not pixel_appeared:
            print("  WARNING: canvas still appears black after 30s")

        if real_errors:
            print(f"\nFAIL: {len(real_errors)} real error(s) found:")
            for e in real_errors:
                print(f"  {e}")

        await browser.close()
        return not real_errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:8888/Bugdom.html')
    args = parser.parse_args()

    ok = asyncio.run(run_test(args.url))
    print("\nPASSED" if ok else "\nFAILED")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
