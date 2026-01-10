
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the index.html file directly
        cwd = os.getcwd()
        page.goto(f'file://{cwd}/index.html')

        # 1. Verify Map Mode (Default)
        print("Checking Map Mode...")
        page.wait_for_selector('#map')
        page.screenshot(path='verification/1_map_mode.png')

        # 2. Switch to Detailed Calculations
        print("Switching to Detailed Calculations...")
        page.click('#tabCalc')
        page.wait_for_selector('#calcView:not(.hidden)')
        page.wait_for_selector('#mapView.hidden')

        # 3. Fill Form and Calculate
        print("Filling Form...")
        # Lat/Lon for Jakarta
        page.fill('#calcLat', '-6.2000')
        page.fill('#calcLon', '106.8166')
        page.fill('#calcDate', '2023-10-01')

        print("Clicking Calculate...")
        page.click('#calculateBtn')

        # 4. Check Results
        print("Checking Results...")
        page.wait_for_selector('.result-card')

        # Take screenshot of results
        page.screenshot(path='verification/2_calc_results.png')

        # Verify some text content
        content = page.content()
        if "Visibility Status" in content:
            print("SUCCESS: Results displayed.")
        else:
            print("FAILURE: Results not displayed.")

        browser.close()

if __name__ == '__main__':
    run()
