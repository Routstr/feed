import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Star microsoft/playwright on' }).click();
  const page1 = await page1Promise;
  await page.getByRole('link', { name: 'Get started' }).click();
});