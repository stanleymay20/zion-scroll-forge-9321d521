import { expect, Page, test } from '@playwright/test';

async function assertPublicRouteHealthy(page: Page, path: string) {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

  expect(response, `Expected a navigation response for ${path}`).not.toBeNull();
  expect(response!.status(), `Expected ${path} to return < 400`).toBeLessThan(400);
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('body')).not.toHaveText('');

  // Give React one event-loop turn to surface synchronous/lazy-route failures.
  await page.waitForTimeout(250);
  expect(runtimeErrors, `Uncaught browser errors on ${path}`).toEqual([]);
}

for (const path of ['/', '/auth', '/catalog', '/governance', '/accreditation-status']) {
  test(`public route ${path} renders without an uncaught runtime error`, async ({ page }) => {
    await assertPublicRouteHealthy(page, path);
  });
}

test('landing page exposes the ScrollUniversity document title', async ({ page }) => {
  await assertPublicRouteHealthy(page, '/');
  await expect(page).toHaveTitle(/ScrollUniversity/i);
});

test('legacy course catalog alias redirects to the canonical catalog', async ({ page }) => {
  await page.goto('/courses', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/catalog\/?$/);
  await expect(page.locator('#root')).toBeVisible();
});

test('legacy index aliases redirect to the canonical root', async ({ page }) => {
  for (const path of ['/index', '/index.html']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
  }
});
