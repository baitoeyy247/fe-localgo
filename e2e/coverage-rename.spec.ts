import { expect, test } from '@playwright/test';
import { loginPersona } from './helpers/persona-login';

test.describe('M-4 coverage rename keeps new name', () => {
  test('renamed branch stays in list after leaving and returning', async ({ page }) => {
    const renamed = `QA R32 rename ${Date.now()}`;

    await loginPersona(page, 'QA ผู้ให้ 01', 'Provider');
    await page.goto('/provider/coverage');
    await expect(page.locator('.coverage-card').first()).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: 'แก้ไข' }).first().click();
    await page.locator('.card .input').first().fill(renamed);
    await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click();

    const card = page.locator('.coverage-card').filter({ hasText: renamed });
    await expect(card).toBeVisible({ timeout: 15_000 });

    await page.goto('/provider');
    await page.goto('/provider/coverage');
    await expect(page.locator('.coverage-card').filter({ hasText: renamed })).toBeVisible({
      timeout: 45_000,
    });
  });
});
