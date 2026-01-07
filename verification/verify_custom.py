import os
from playwright.sync_api import sync_playwright

def verify(page):
    cwd = os.getcwd()
    file_path = f"file://{cwd}/index.html"
    print(f"Navigating to {file_path}")
    page.goto(file_path)

    # 1. Verify Title (Ensure Apportionment is gone)
    title = page.locator("#mapTitle").inner_text()
    print(f"Title: {title}")
    assert "Hilal Visibility Map" in title or "Peta Visibilitas Hilal" in title

    # 2. Check Custom Criteria
    print("Selecting Custom Criteria...")
    page.select_option("#mapCriteria", "custom")

    # 3. Check Inputs Visible
    print("Checking Custom Inputs...")
    page.wait_for_selector("#customCriteriaInputs:not(.hidden)")

    # 4. Fill Inputs
    page.fill("#minAlt", "5")
    page.fill("#minElong", "10")

    # 5. Render
    print("Rendering...")
    page.click("#renderMap")
    page.wait_for_timeout(2000)

    page.screenshot(path="verification/custom_map.png")
    print("Done.")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
