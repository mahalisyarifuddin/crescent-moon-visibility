const { test, expect } = require('@playwright/test');
const path = require('path');

test('Calendar grid supports PageUp/PageDown navigation', async ({ page }) => {
  const filePath = path.resolve(__dirname, '../HijriCalc.html');
  await page.goto(`file://${filePath}`);

  // Wait for calendar to render
  await expect(page.locator('.calendar-grid')).toBeVisible();

  // Reset to Today
  await page.click('#todayBtn');

  // Get initial month
  const monthHeader = page.locator('#monthDisplay');
  const initialMonthText = await monthHeader.textContent();
  console.log('Initial Month:', initialMonthText);

  // Focus a cell
  const todayCell = page.locator('.day-cell.today');
  await todayCell.click();
  await expect(todayCell).toBeFocused();

  // Press PageDown (Next Month)
  await page.keyboard.press('PageDown');

  // Verify Month Header changed
  const newMonthText = await monthHeader.textContent();
  console.log('New Month:', newMonthText);

  expect(newMonthText).not.toBe(initialMonthText);

  // Verify focus is restored to a cell
  // The focused element should be a day-cell
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/day-cell/);

  // Verify date of focused cell is roughly 1 month later?
  // We can check aria-label or just trust the navigation happened if month header changed.
  // Let's press PageUp to go back
  await page.keyboard.press('PageUp');
  const backMonthText = await monthHeader.textContent();
  expect(backMonthText).toBe(initialMonthText);
});
