import { expect, type Page } from '@playwright/test';

export async function loginPersona(
  page: Page,
  displayName: string,
  role: 'Requester' | 'Provider',
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: displayName }).click();
  await expect(page.getByText('สวัสดี')).toBeVisible({ timeout: 30_000 });
  const roleLabel = role === 'Requester' ? 'ผู้รับบริการ' : 'ผู้ให้บริการ';
  await page.locator('button.card.row').filter({ hasText: roleLabel }).first().click();
  await page.waitForURL(role === 'Requester' ? '**/requester**' : '**/provider**', {
    timeout: 30_000,
  });
}
