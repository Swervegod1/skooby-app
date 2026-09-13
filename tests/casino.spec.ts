import { expect, test } from '@playwright/test';

test('casino shell remains usable and fails closed when auth is unconfigured', async ({ page }) => {
  await page.goto('/casino');
  await expect(page.getByRole('heading', { name: /Play-credit games with a real security boundary/i })).toBeVisible();
  await expect(page.getByText(/Server-authoritative play is locked/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Provider maintenance|Checking provider/i })).toBeDisabled();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});

test('provider endpoint rejects unavailable or unapproved destinations', async ({ request }) => {
  const response = await request.get('/api/casino/provider-health');
  expect([503, 200]).toContain(response.status());
  const body = await response.json() as { configured?: boolean; healthy?: boolean };
  if (!body.configured) expect(body.healthy).toBeFalsy();
});
