# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skeleton-layout.spec.ts >> QA28 M-1 skeleton layout shift >> provider-requests skeleton aligns with loaded content
- Location: e2e/skeleton-layout.spec.ts:75:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.page-content .skeleton-stack .skeleton-card:first-of-type, .page-content .skeleton-stack .skeleton-form-field:first-of-type').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.page-content .skeleton-stack .skeleton-card:first-of-type, .page-content .skeleton-stack .skeleton-form-field:first-of-type').first() with timeout 15000ms
  - waiting for locator('.page-content .skeleton-stack .skeleton-card:first-of-type, .page-content .skeleton-stack .skeleton-form-field:first-of-type').first()

```

```yaml
- main:
  - button "กลับ": ←
  - heading "งานที่ตรงกับบริการ" [level=1]
  - text: LocalGo
  - main:
    - text: รายการงาน
    - button "รีเฟรช"
    - status: มีงานรอยืนยันนัดหมาย 1 รายการ กดยืนยันนัดหมายในแท็บรอยืนยันนัดหมาย
    - paragraph: เลื่อนดูแท็บทั้งหมด
    - tablist "กรองงาน":
      - button "รอยืนยัน (1)"
      - button "รอผลข้อเสนอ (0)"
      - button "กำลังทำ (0)"
      - button "เสร็จสิ้น (0)"
      - button "ยกเลิก (0)"
      - button "ปฏิเสธ (0)"
    - text: รอยืนยัน
    - article:
      - text: QA R30 skeleton seed รอผู้ให้บริการยืนยันนัด
      - paragraph: ทำความสะอาด · ใกล้มาก
      - paragraph: โพสต์ 22 ต.ค. 2569 18:23 · รอผู้ให้บริการยืนยันนัด
      - button "ดูรายละเอียด"
    - navigation "เมนูผู้ให้บริการ":
      - link "หน้าหลัก":
        - /url: /provider
      - link "บริการ":
        - /url: /provider/manage
      - link "งาน":
        - /url: /provider/requests
      - link "โปรไฟล์":
        - /url: /provider/profile
  - text: build f186298
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { ensureSitPlaytestMarketplace, type SitPlaytestIds } from './helpers/sit-playtest-seed';
  3   | import {
  4   |   SKELETON_CLS_TOLERANCE_PX,
  5   |   SKELETON_E2E_API_DELAY_MS,
  6   |   SKELETON_E2E_ROUTE_CASES,
  7   |   SKELETON_PAGE_PRESETS,
  8   | } from '../src/app/shared/ui/skeleton-layout.constants';
  9   | 
  10  | type Box = { top: number; height: number };
  11  | 
  12  | async function contentBox(page: Page, selector: string): Promise<Box> {
  13  |   return page.evaluate((sel) => {
  14  |     const content = document.querySelector('.page-content') as HTMLElement | null;
  15  |     const parts = sel.split(',').map((s) => s.trim());
  16  |     let el: HTMLElement | null = null;
  17  |     for (const part of parts) {
  18  |       el = document.querySelector(part) as HTMLElement | null;
  19  |       if (el) {
  20  |         break;
  21  |       }
  22  |     }
  23  |     if (!content || !el) {
  24  |       return { top: -1, height: -1 };
  25  |     }
  26  |     const c = content.getBoundingClientRect();
  27  |     const r = el.getBoundingClientRect();
  28  |     return { top: r.top - c.top, height: r.height };
  29  |   }, selector);
  30  | }
  31  | 
  32  | async function loginPersona(page: Page, displayName: string, role: 'Requester' | 'Provider'): Promise<void> {
  33  |   await page.goto('/');
  34  |   await page.getByRole('button', { name: displayName }).click();
  35  |   await expect(page.getByText('สวัสดี')).toBeVisible({ timeout: 30_000 });
  36  |   const roleLabel = role === 'Requester' ? 'ผู้รับบริการ' : 'ผู้ให้บริการ';
  37  |   await page.locator('button.card.row').filter({ hasText: roleLabel }).first().click();
  38  |   await page.waitForURL(role === 'Requester' ? '**/requester**' : '**/provider**', {
  39  |     timeout: 30_000,
  40  |   });
  41  | }
  42  | 
  43  | let cachedSitIds: SitPlaytestIds | null = null;
  44  | 
  45  | async function discoverIds(
  46  |   page: Page,
  47  |   request: import('@playwright/test').APIRequestContext,
  48  | ): Promise<SitPlaytestIds> {
  49  |   if (process.env.E2E_APPOINTMENT_ID && process.env.E2E_PROVIDER_REQUEST_ID) {
  50  |     return {
  51  |       appointmentId: process.env.E2E_APPOINTMENT_ID,
  52  |       providerRequestId: process.env.E2E_PROVIDER_REQUEST_ID,
  53  |     };
  54  |   }
  55  |   if (!cachedSitIds) {
  56  |     cachedSitIds = await ensureSitPlaytestMarketplace(request);
  57  |   }
  58  |   return cachedSitIds;
  59  | }
  60  | 
  61  | const PERSONA_LABEL: Record<string, { name: string; role: 'Requester' | 'Provider' }> = {
  62  |   'req-01': { name: 'QA ผู้รับ 01', role: 'Requester' },
  63  |   'prov-01': { name: 'QA ผู้ให้ 01', role: 'Provider' },
  64  | };
  65  | 
  66  | test.describe('QA28 M-1 skeleton layout shift', () => {
  67  |   test.beforeEach(async ({ page }) => {
  68  |     await page.route('**/api/**', async (route) => {
  69  |       await new Promise((r) => setTimeout(r, SKELETON_E2E_API_DELAY_MS));
  70  |       await route.continue();
  71  |     });
  72  |   });
  73  | 
  74  |   for (const routeCase of SKELETON_E2E_ROUTE_CASES) {
  75  |     test(`${routeCase.name} skeleton aligns with loaded content`, async ({ page, request }) => {
  76  |       const persona = PERSONA_LABEL[routeCase.personaKey];
  77  |       test.skip(!persona, `Unknown persona ${routeCase.personaKey}`);
  78  | 
  79  |       await loginPersona(page, persona.name, persona.role);
  80  |       const ids = await discoverIds(page, request);
  81  | 
  82  |       const path =
  83  |         typeof routeCase.path === 'function'
  84  |           ? routeCase.path(ids)
  85  |           : routeCase.path;
  86  | 
  87  |       if (path.includes('e2e-placeholder')) {
  88  |         test.skip(true, 'Set E2E_APPOINTMENT_ID / E2E_PROVIDER_REQUEST_ID or seed SIT data');
  89  |       }
  90  | 
  91  |       const skeletonSelector =
  92  |         routeCase.skeletonSelector ??
  93  |         '.page-content .skeleton-stack .skeleton-card:first-of-type, .page-content .skeleton-stack .skeleton-form-field:first-of-type';
  94  |       const loadedSelector =
  95  |         routeCase.loadedSelector ?? '.page-content .card:not(.skeleton-card)';
  96  | 
  97  |       await page.goto(path);
> 98  |       await expect(page.locator(skeletonSelector).first()).toBeVisible({ timeout: 15_000 });
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  99  |       const skeletonBox = await contentBox(page, skeletonSelector);
  100 | 
  101 |       await expect(page.locator(loadedSelector).first()).toBeVisible({ timeout: 60_000 });
  102 |       const loadedBox = await contentBox(page, loadedSelector);
  103 | 
  104 |       const preset = SKELETON_PAGE_PRESETS[routeCase.preset];
  105 |       expect(skeletonBox.top).toBeGreaterThanOrEqual(0);
  106 |       expect(loadedBox.top).toBeGreaterThanOrEqual(0);
  107 | 
  108 |       const topDelta = Math.abs(skeletonBox.top - loadedBox.top);
  109 |       const heightDelta = Math.abs(skeletonBox.height - loadedBox.height);
  110 |       expect(
  111 |         topDelta,
  112 |         `${routeCase.name} top skeleton=${skeletonBox.top} loaded=${loadedBox.top} Δ=${topDelta}`,
  113 |       ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX);
  114 |       expect(
  115 |         heightDelta,
  116 |         `${routeCase.name} height skeleton=${skeletonBox.height} loaded=${loadedBox.height} Δ=${heightDelta}`,
  117 |       ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX + (preset.variant === 'form' ? 12 : 0));
  118 |     });
  119 |   }
  120 | });
  121 | 
```