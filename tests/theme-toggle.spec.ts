import { test, expect } from '@playwright/test';

test('Theme toggle switches between light and dark mode', async ({ page }) => {
  await page.goto('/');

  // Check initial theme is dark
  await expect(page.locator('html')).toHaveAttribute('class', 'h-full dark');

  // Click the theme toggle dropdown
  await page.locator('button:has([class*="lucide-sun"])').click();

  // Click the light theme option
  await page.locator('text=Light').click();

  // Check theme is now light
  await expect(page.locator('html')).toHaveAttribute('class', 'h-full light');

  // Click the theme toggle dropdown again
  await page.locator('button:has([class*="lucide-sun"])').click();

  // Click the dark theme option
  await page.locator('text=Dark').click();

  // Check theme is back to dark
  await expect(page.locator('html')).toHaveAttribute('class', 'h-full dark');
});
