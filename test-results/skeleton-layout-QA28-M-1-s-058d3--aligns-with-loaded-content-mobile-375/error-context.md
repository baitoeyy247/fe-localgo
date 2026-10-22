# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skeleton-layout.spec.ts >> QA28 M-1 skeleton layout shift >> requester-post skeleton aligns with loaded content
- Location: e2e/skeleton-layout.spec.ts:75:9

# Error details

```
Error: requester-post top skeleton=133.59375 loaded=349.59375 Δ=216

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 8
Received:    216
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - main [ref=f1e4]:
    - generic "ประกาศงาน" [ref=f1e7]:
      - generic [ref=f1e8]:
        - generic [ref=f1e9]:
          - button "กลับ" [ref=f1e10] [cursor=pointer]: ←
          - heading "ประกาศงาน" [level=1] [ref=f1e11]
          - generic [ref=f1e12]: LocalGo
        - main [ref=f1e13]:
          - generic [ref=f1e14]:
            - navigation "ขั้นตอนงานของฉัน" [ref=f1e15]:
              - link "1 ประกาศ":
                - /url: /requester/post
                - generic: "1"
                - text: ประกาศ
              - link "2 ข้อเสนอ":
                - /url: /requester/bids
                - generic: "2"
                - text: ข้อเสนอ
              - link "3 นัดหมาย":
                - /url: /requester/appointment
                - generic: "3"
                - text: นัดหมาย
              - link "4 รีวิว":
                - /url: /requester/review
                - generic: "4"
                - text: รีวิว
            - paragraph [ref=f1e16]: ขั้นที่ปิดอยู่จะเปิดเมื่อถึงลำดับนั้น
          - generic [ref=f1e17]: โพสต์แล้วรอรับราคากำหนดตำแหน่งรับงานให้ชัด แล้วเปิดรับข้อเสนอจากผู้ให้บริการรอบพื้นที่นั้น
          - status [ref=f1e19]:
            - generic [ref=f1e20]: ยังไม่มีตำแหน่งงานอนุญาต GPS หรือเลือกบนแผนที่ก่อนโพสต์ — ไม่ใช้กรุงเทพเป็นค่าเริ่มต้นโดยอัตโนมัติ
          - generic [ref=f1e21]:
            - generic [ref=f1e22]:
              - generic [ref=f1e23]: หมวดหมู่ *
              - combobox "หมวดหมู่" [ref=f1e24]:
                - option "อาหารและเครื่องดื่ม" [selected]
                - option "รับ-ส่งของ"
                - option "ซักรีด"
                - option "ติวเตอร์และสอนพิเศษ"
                - option "งานพิมพ์และเอกสาร"
                - option "งานออกแบบและสร้างสรรค์"
                - option "ซ่อมอุปกรณ์อิเล็กทรอนิกส์"
                - option "ขนย้าย"
                - option "ทำความสะอาด"
                - option "สุขภาพและความงาม"
                - option "หอพักและที่พักอาศัย"
                - option "บริการอื่น ๆ"
            - generic [ref=f1e25]:
              - generic [ref=f1e26]: หัวข้องาน *
              - textbox "หัวข้องาน" [ref=f1e27]:
                - /placeholder: เช่น ต้องการซักผ้าด่วน 5 กก.
            - generic [ref=f1e28]:
              - generic [ref=f1e29]: รายละเอียด
              - textbox "รายละเอียด" [ref=f1e30]:
                - /placeholder: ระบุสถานที่ รอบเวลา และเงื่อนไขที่ต้องการ
            - generic [ref=f1e32]:
              - generic [ref=f1e33]: วันที่และเวลาที่ต้องการ *
              - generic [ref=f1e34]:
                - textbox "วันที่ วว/ดด/ปปปป" [ref=f1e35]:
                  - /placeholder: วว/ดด/ปปปป (พ.ศ.)
                - textbox "เวลา 24 ชั่วโมง" [ref=f1e36]:
                  - /placeholder: HH:MM
              - generic [ref=f1e37]: วันที่ วว/ดด/ปปปป ใช้ปี พ.ศ. (เช่น 24/10/2569) หรือ ค.ศ. (2026) · เวลา 24 ชม.
            - generic [ref=f1e38]:
              - generic [ref=f1e39]: 📍
              - generic [ref=f1e40]:
                - text: ยังไม่ได้เลือกตำแหน่ง
                - generic [ref=f1e41]: อนุญาต GPS หรือเลือกบนแผนที่ — ยังไม่ใช้ตำแหน่งเริ่มต้นค้นหา
              - button "เลือกตำแหน่ง" [ref=f1e42] [cursor=pointer]
            - generic [ref=f1e43]:
              - generic [ref=f1e44]: งบประมาณ
              - radiogroup "รูปแบบงบประมาณ" [ref=f1e45]:
                - generic [ref=f1e46] [cursor=pointer]:
                  - radio "ให้ผู้ให้บริการเสนอราคา" [checked]
                  - generic [ref=f1e47]: ให้ผู้ให้บริการเสนอราคา
                - generic [ref=f1e48] [cursor=pointer]:
                  - radio "ระบุงบประมาณ"
                  - generic [ref=f1e49]: ระบุงบประมาณ
            - generic [ref=f1e50]:
              - text: สิ่งที่จะเกิดขึ้นหลังโพสต์
              - paragraph [ref=f1e51]: ผู้ให้บริการในพื้นที่จะเห็นงานในกล่องงาน
              - paragraph [ref=f1e52]: คุณจะเห็นข้อเสนอทั้งหมดในหน้าเดียว และเลือกข้อเสนอได้เฉพาะคนที่ประกาศงานนี้
            - button "ประกาศงาน" [disabled] [ref=f1e53]
          - generic:
            - generic "ละทิ้งการเปลี่ยนแปลง?"
          - navigation "เมนูผู้รับบริการ" [ref=f1e54]:
            - link "หน้าหลัก" [ref=f1e55] [cursor=pointer]:
              - /url: /requester
              - generic [aria-hidden] [ref=f1e56]: 🏠
              - text: หน้าหลัก
            - link "ค้นหา" [ref=f1e57] [cursor=pointer]:
              - /url: /requester/search
              - generic [aria-hidden] [ref=f1e58]: 🔍
              - text: ค้นหา
            - link "ประกาศ" [ref=f1e59] [cursor=pointer]:
              - /url: /requester/post
              - generic [aria-hidden] [ref=f1e60]: ➕
              - text: ประกาศ
            - link "ข้อเสนอ" [ref=f1e61] [cursor=pointer]:
              - /url: /requester/bids
              - generic [aria-hidden] [ref=f1e62]: 💬
              - text: ข้อเสนอ
            - link "บัญชี" [ref=f1e63] [cursor=pointer]:
              - /url: /requester/profile
              - generic [aria-hidden] [ref=f1e64]: 👤
              - text: บัญชี
          - dialog "เลือกตำแหน่งสำหรับประกาศงาน" [ref=f1e65]:
            - generic [ref=f1e66]:
              - generic [ref=f1e67]:
                - generic [ref=f1e68]:
                  - generic [ref=f1e69]: เลือกตำแหน่ง
                  - heading "เลือกตำแหน่งสำหรับประกาศงาน" [level=2] [ref=f1e70]
                  - paragraph [ref=f1e71]: เปิดแผนที่เต็มจอเพื่อปักตำแหน่งรับงานให้ตรงที่สุด แล้วกดยืนยันเพื่อใช้พิกัดนี้กับประกาศงาน
                - button "ปิด" [ref=f1e72] [cursor=pointer]: ×
              - generic [ref=f1e73]:
                - region "ค้นหาและตั้งรัศมี" [ref=f1e74]:
                  - generic [ref=f1e75]:
                    - generic [ref=f1e76]: ค้นหาสถานที่
                    - textbox "ค้นหาสถานที่" [ref=f1e77]:
                      - /placeholder: เช่น หอพัก, ตลาด, ชื่อถนน
                      - text: ยังไม่ได้เลือกตำแหน่ง
                  - generic [ref=f1e78]:
                    - button "ค้นหา" [ref=f1e79] [cursor=pointer]
                    - button "ตำแหน่งปัจจุบัน" [ref=f1e80] [cursor=pointer]
                  - generic [ref=f1e81]:
                    - generic [ref=f1e82]: รัศมี 5 กม.
                    - slider "รัศมีกิโลเมตร" [ref=f1e83]: "5"
                  - generic "ตัวเลือกรัศมีด่วน" [ref=f1e84]:
                    - button "1 กม." [ref=f1e85] [cursor=pointer]
                    - button "3 กม." [ref=f1e86] [cursor=pointer]
                    - button "5 กม." [ref=f1e87] [cursor=pointer]
                    - button "8 กม." [ref=f1e88] [cursor=pointer]
                    - button "10 กม." [ref=f1e89] [cursor=pointer]
                    - button "15 กม." [ref=f1e90] [cursor=pointer]
                - region "แผนที่เลือกตำแหน่ง" [ref=f1e91]:
                  - generic "แผนที่เลือกตำแหน่ง" [ref=f1e94]:
                    - generic:
                      - generic:
                        - img:
                          - generic [ref=f1e95] [cursor=pointer]
                      - button [ref=f1e96] [cursor=pointer]
                    - generic [ref=f1e98]:
                      - button "ขยายแผนที่" [ref=f1e99] [cursor=pointer]: +
                      - button "ย่อแผนที่" [ref=f1e100] [cursor=pointer]: −
                - region "ตำแหน่งที่กำลังเลือก" [ref=f1e101]:
                  - generic [ref=f1e102]:
                    - generic [ref=f1e103]: ตำแหน่งที่กำลังเลือก
                    - strong [ref=f1e104]: ยังไม่ได้เลือกตำแหน่ง
                    - paragraph [ref=f1e105]: รัศมี 5 กม.
                  - generic [ref=f1e106]:
                    - article [ref=f1e107]:
                      - generic [ref=f1e108]: ละติจูด
                      - strong [ref=f1e109]: "13.75630"
                    - article [ref=f1e110]:
                      - generic [ref=f1e111]: ลองจิจูด
                      - strong [ref=f1e112]: "100.50180"
              - region "ยืนยันตำแหน่ง" [ref=f1e113]:
                - button "ยืนยันและใช้ตำแหน่งนี้" [ref=f1e114] [cursor=pointer]
                - button "ยกเลิก" [ref=f1e115] [cursor=pointer]
        - generic "เวอร์ชัน build" [ref=f1e116]: build f186298
  - generic "ละทิ้งการเปลี่ยนแปลง?"
```

# Test source

```ts
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
> 113 |       ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX);
      |         ^ Error: requester-post top skeleton=133.59375 loaded=349.59375 Δ=216
  114 |       expect(
  115 |         heightDelta,
  116 |         `${routeCase.name} height skeleton=${skeletonBox.height} loaded=${loadedBox.height} Δ=${heightDelta}`,
  117 |       ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX + (preset.variant === 'form' ? 12 : 0));
  118 |     });
  119 |   }
  120 | });
  121 | 
```