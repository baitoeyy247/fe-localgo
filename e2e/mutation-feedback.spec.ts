import { expect, test } from '@playwright/test';
import { ensureSitPlaytestMarketplace } from './helpers/sit-playtest-seed';
import { loginPersona } from './helpers/persona-login';

const API_HOST = 'be-localgo-ul36.onrender.com';

test.describe('M-3 mutation feedback (forced 500)', () => {
  test('appointment confirm: error toast and rollback on 500', async ({ page, request }) => {
    const ids = await ensureSitPlaytestMarketplace(request);
    const requestId = ids.providerRequestId ?? ids.requestId;
    test.skip(!requestId, 'no provider request id from seed');

    let patchCount = 0;
    await page.route(`**/${API_HOST}/api/appointments/**`, async (route) => {
      if (route.request().method() === 'PATCH') {
        patchCount += 1;
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    await loginPersona(page, 'QA ผู้ให้ 01', 'Provider');
    await page.goto(`/provider/requests/${requestId}`);

    const confirmBtn = page.getByRole('button', { name: 'ยืนยันนัดหมาย' });
    await expect(confirmBtn).toBeVisible({ timeout: 45_000 });
    await confirmBtn.click();
    await page.getByRole('dialog').getByRole('button', { name: 'ยืนยัน' }).click();

    await expect(page.locator('.toast-banner')).toContainText('ระบบขัดข้อง', { timeout: 15_000 });
    await expect(page.locator('.toast-banner')).not.toContainText('ยืนยันนัดหมายแล้ว');
    await expect(confirmBtn).toBeVisible();
    expect(patchCount).toBe(1);
  });

  test('bid update: error toast on 500 (no success toast)', async ({ page, request }) => {
    const ids = await ensureSitPlaytestMarketplace(request);
    const requestId = ids.providerRequestId ?? ids.requestId;
    test.skip(!requestId, 'no provider request id from seed');

    await loginPersona(page, 'QA ผู้ให้ 01', 'Provider');
    await page.goto(`/provider/bid?requestId=${requestId}`);
    await expect(page.getByLabel(/ราคา/i)).toBeVisible({ timeout: 45_000 });

    let patchCount = 0;
    await page.route(`**/${API_HOST}/api/bids/**`, async (route) => {
      if (route.request().method() === 'PATCH') {
        patchCount += 1;
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    const price = page.locator('.input-price');
    const current = await price.inputValue();
    const next = current.includes('451') ? '452' : '451';
    await price.fill(next);
    await page.getByRole('button', { name: /อัปเดตข้อเสนอ|ส่งข้อเสนอ/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /อัปเดต|ส่ง/ }).click();

    await expect(page.locator('.toast-banner')).toContainText('ระบบขัดข้อง', { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/provider/bid\\?requestId=${requestId}`));
    expect(patchCount).toBeGreaterThanOrEqual(1);
  });
});
