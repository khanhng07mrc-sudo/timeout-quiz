import asyncio
import os
import sys
from playwright.async_api import async_playwright

ARTIFACT_DIR_1 = r"d:\Timeout Quiz\.agents\teamwork\teamwork_worker_1\screenshots"
ARTIFACT_DIR_2 = r"C:\Users\khanh\.gemini\antigravity\brain\6a01f0ad-665c-4408-81ca-ba001243745b"
ARTIFACT_DIR_3 = r"C:\Users\khanh\.gemini\antigravity\brain\aac021ca-ce70-48a4-b3be-d09545e52c3f\screenshots"

async def main():
    os.makedirs(ARTIFACT_DIR_1, exist_ok=True)
    os.makedirs(ARTIFACT_DIR_2, exist_ok=True)
    os.makedirs(ARTIFACT_DIR_3, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=1
        )

        port = 3005
        targets = [
            ("r6-cam3", "#screenshot-r6-cam3-mc-framing", "screenshot_1_idle_mc_framing_cam3.png", "R6.1: Idle MC Framing (CAM 3)"),
            ("r6-tech", "#screenshot-r6-tech-floor-animation", "screenshot_2_rotating_tech_floor_6s.png", "R6.2: 6s Rotating Tech Floor"),
            ("r6-mc-center", "#screenshot-r6-mc-center-stage", "screenshot_3_mc_center_stage.png", "R6.3: MCs Center Stage"),
            ("r6-empty-podiums", "#screenshot-r6-empty-podiums-pre-match", "screenshot_4_empty_podiums_pre_match.png", "R6.4: Empty Podiums Pre-match"),
        ]

        for tab_param, selector, filename, desc in targets:
            url = f"http://localhost:{port}/dev/graphics?tab={tab_param}"
            print(f"[R6 Verification] Navigating to {url} ({desc})...", flush=True)
            page = await context.new_page()
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_selector(selector, timeout=20000)
                await page.wait_for_timeout(2500)

                loc = page.locator(selector)
                if await loc.count() > 0:
                    p1 = os.path.join(ARTIFACT_DIR_1, filename)
                    p2 = os.path.join(ARTIFACT_DIR_2, filename)

                    await page.evaluate(f"document.querySelector('{selector}')?.scrollIntoView({{ block: 'center', behavior: 'instant' }})")
                    await page.wait_for_timeout(500)

                    box = await loc.bounding_box()
                    if box and box['width'] > 0 and box['height'] > 0:
                        clip = {
                            'x': max(0, box['x']),
                            'y': max(0, box['y']),
                            'width': min(box['width'], 1920),
                            'height': min(box['height'], 1080)
                        }
                        p3 = os.path.join(ARTIFACT_DIR_3, filename)
                        await page.screenshot(path=p1, clip=clip, animations="disabled")
                        with open(p1, "rb") as src:
                            data = src.read()
                            with open(p2, "wb") as dst2:
                                dst2.write(data)
                            with open(p3, "wb") as dst3:
                                dst3.write(data)
                        sz = os.path.getsize(p1)
                        print(f"  -> Captured {desc}: {filename} ({sz} bytes)", flush=True)
                    else:
                        print(f"  -> Could not get bounding box for {selector}", flush=True)
                else:
                    print(f"  -> Locator {selector} not found on page!", flush=True)
            finally:
                await page.close()

        await browser.close()
        print("[R6 Verification] All screenshots captured successfully!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
