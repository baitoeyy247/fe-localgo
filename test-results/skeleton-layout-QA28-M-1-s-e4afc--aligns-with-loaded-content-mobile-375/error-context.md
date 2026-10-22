# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skeleton-layout.spec.ts >> QA28 M-1 skeleton layout shift >> provider-request-detail skeleton aligns with loaded content
- Location: e2e/skeleton-layout.spec.ts:75:9

# Error details

```
Error: provider-request-detail height skeleton=236 loaded=109.578125 Δ=126.421875

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 8
Received:    126.421875
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - main [ref=f1e4]:
    - generic "รายละเอียดงาน" [ref=f1e7]:
      - generic [ref=f1e8]:
        - generic [ref=f1e9]:
          - button "กลับ" [ref=f1e10] [cursor=pointer]: ←
          - heading "รายละเอียดงาน" [level=1] [ref=f1e11]
          - generic [ref=f1e12]: LocalGo
        - main [ref=f1e13]:
          - generic [ref=f1e14]:
            - generic [ref=f1e15]:
              - generic [ref=f1e16]: QA R30 skeleton seed
              - generic [ref=f1e17]: รอผู้ให้บริการยืนยันนัด
            - paragraph [ref=f1e18]: ทำความสะอาด
          - generic [ref=f1e19]:
            - generic [ref=f1e20]:
              - generic [ref=f1e21]:
                - term [ref=f1e22]: สถานที่
                - definition [ref=f1e23]: มหาสารคาม เมือง
              - generic [ref=f1e24]:
                - term [ref=f1e25]: สถานะงาน
                - definition [ref=f1e26]: รอผู้ให้บริการยืนยันนัด
              - generic [ref=f1e27]:
                - term [ref=f1e28]: ระยะทาง
                - definition [ref=f1e29]: ใกล้มาก
            - paragraph [ref=f1e30]: รัศมีค้นหาจากจุดประกาศ 10 กม.
          - article [ref=f1e31]:
            - text: รายละเอียดนัดหมาย
            - paragraph [ref=f1e32]: รอคุณยืนยันนัด
            - paragraph [ref=f1e33]: "วันและเวลา: 25 ต.ค. 2569 17:00"
            - paragraph [ref=f1e34]: "สถานที่: มหาสารคาม เมือง"
            - button "ยืนยันนัดหมาย" [ref=f1e35] [cursor=pointer]
            - button "ปฏิเสธนัดหมาย" [ref=f1e36] [cursor=pointer]
          - article [ref=f1e37]:
            - generic [ref=f1e38]: ข้อเสนอของคุณ
            - paragraph [ref=f1e39]: 450 บาท
            - paragraph [ref=f1e40]: QA R30
            - paragraph [ref=f1e41]: "สถานะ: รอยืนยันนัดหมาย"
          - navigation "เมนูผู้ให้บริการ" [ref=f1e42]:
            - link "หน้าหลัก" [ref=f1e43] [cursor=pointer]:
              - /url: /provider
              - generic [aria-hidden] [ref=f1e44]: 🏠
              - text: หน้าหลัก
            - link "บริการ" [ref=f1e45] [cursor=pointer]:
              - /url: /provider/manage
              - generic [aria-hidden] [ref=f1e46]: 🛠
              - text: บริการ
            - link "งาน" [ref=f1e47] [cursor=pointer]:
              - /url: /provider/requests
              - generic [aria-hidden] [ref=f1e48]: 📋
              - text: งาน
            - link "โปรไฟล์" [ref=f1e49] [cursor=pointer]:
              - /url: /provider/profile
              - generic [aria-hidden] [ref=f1e50]: 👤
              - text: โปรไฟล์
        - generic "เวอร์ชัน build" [ref=f1e51]: build f186298
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
      |         ^ Error: provider-request-detail height skeleton=236 loaded=109.578125 Δ=126.421875
  118 |     });
  119 |   }
  120 | });
  121 | 
```