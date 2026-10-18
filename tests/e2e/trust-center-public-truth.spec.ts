import { test, expect } from '@playwright/test';

test('trust center fails closed on unverified registration and leadership claims', async ({ page }) => {
  await page.goto('/trust');
  await expect(page.getByText('No independently verified registration record published')).toBeVisible();
  await expect(page.getByText('1234 Kingdom Way')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Leadership' }).click();
  await expect(page.getByText('Leadership verification pending')).toBeVisible();
  await expect(page.getByText('Dr. Stanley Mayega')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Accreditation' }).click();
  await expect(page.getByText('External accreditation not verified')).toBeVisible();
});

test('policy disclosures never advertise unavailable full policies as buttons', async ({ page }) => {
  await page.goto('/trust');
  await page.getByRole('tab', { name: 'Policies' }).click();
  await expect(page.getByText('Detailed policy pending publication').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Read Full Policy' })).toHaveCount(0);
  const links = page.getByRole('link', { name: 'View published information' });
  await expect(links).toHaveCount(2);
  await links.first().click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test('public catalogue navigation works instead of presenting an inert CTA', async ({ page }) => {
  await page.goto('/trust');
  await page.getByRole('link', { name: 'View Course Catalogue' }).click();
  await expect(page).toHaveURL(/\/catalog$/);
});
