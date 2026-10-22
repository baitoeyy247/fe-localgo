# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skeleton-layout.spec.ts >> QA28 M-1 skeleton layout shift >> appointment-detail skeleton aligns with loaded content
- Location: e2e/skeleton-layout.spec.ts:75:9

# Error details

```
Error: appointment-detail height skeleton=236 loaded=76 Δ=160

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 8
Received:    160
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - main [ref=f1e4]:
    - generic [ref=f1e8]:
      - generic [ref=f1e9]:
        - button "กลับ" [ref=f1e10] [cursor=pointer]: ←
        - heading "QA R30 skeleton seed" [level=1] [ref=f1e11]
        - generic [ref=f1e12]: LocalGo
      - main [ref=f1e13]:
        - generic [ref=f1e15]:
          - paragraph [ref=f1e17]:
            - text: "ผู้ให้บริการ:"
            - link "QA ผู้ให้ 01" [ref=f1e18] [cursor=pointer]:
              - /url: /requester/provider/3be41251-0c2e-4f14-9fe2-3f3fc79b39aa
          - generic [ref=f1e20]: รอผู้ให้บริการยืนยันนัด
        - generic [ref=f1e21]:
          - paragraph [ref=f1e22]: "วันและเวลานัดหมาย: 25 ต.ค. 2569 17:00"
          - paragraph [ref=f1e23]: "สถานที่: มหาสารคาม เมือง"
          - paragraph [ref=f1e24]: "ราคา: 450 บาท"
        - link "เลื่อนนัดหมาย" [ref=f1e25] [cursor=pointer]:
          - /url: /requester/appointment?requestId=6f389b21-320a-465d-99a5-b1a45ac845b9&reschedule=1
        - button "ยกเลิกนัดหมาย" [ref=f1e26] [cursor=pointer]
        - link "กลับหน้าหลัก" [ref=f1e27] [cursor=pointer]:
          - /url: /requester
      - generic "เวอร์ชัน build" [ref=f1e28]: build f186298
  - generic "ละทิ้งการเปลี่ยนแปลง?"
```

# Test source

```ts
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
  98  |       await expect(page.locator(skeletonSelector).first()).toBeVisible({ timeout: 15_000 });
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
> 117 |       ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX + (preset.variant === 'form' ? 12 : 0));
      |         ^ Error: appointment-detail height skeleton=236 loaded=76 Δ=160
  118 |     });
  119 |   }
  120 | });
  121 | 
```