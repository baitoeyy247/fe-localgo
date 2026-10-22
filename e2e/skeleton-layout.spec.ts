import { expect, test, type Page } from '@playwright/test';
import { ensureSitPlaytestMarketplace, type SitPlaytestIds } from './helpers/sit-playtest-seed';
import {
  SKELETON_CLS_TOLERANCE_PX,
  SKELETON_E2E_API_DELAY_MS,
  SKELETON_E2E_ROUTE_CASES,
  SKELETON_PAGE_PRESETS,
} from '../src/app/shared/ui/skeleton-layout.constants';

type Box = { top: number; height: number };

async function contentBox(page: Page, selector: string): Promise<Box> {
  return page.evaluate((sel) => {
    const content = document.querySelector('.page-content') as HTMLElement | null;
    const parts = sel.split(',').map((s) => s.trim());
    let el: HTMLElement | null = null;
    for (const part of parts) {
      el = document.querySelector(part) as HTMLElement | null;
      if (el) {
        break;
      }
    }
    if (!content || !el) {
      return { top: -1, height: -1 };
    }
    const c = content.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { top: r.top - c.top, height: r.height };
  }, selector);
}

async function loginPersona(page: Page, displayName: string, role: 'Requester' | 'Provider'): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: displayName }).click();
  await expect(page.getByText('สวัสดี')).toBeVisible({ timeout: 30_000 });
  const roleLabel = role === 'Requester' ? 'ผู้รับบริการ' : 'ผู้ให้บริการ';
  await page.locator('button.card.row').filter({ hasText: roleLabel }).first().click();
  await page.waitForURL(role === 'Requester' ? '**/requester**' : '**/provider**', {
    timeout: 30_000,
  });
}

let cachedSitIds: SitPlaytestIds | null = null;

async function discoverIds(
  page: Page,
  request: import('@playwright/test').APIRequestContext,
): Promise<SitPlaytestIds> {
  if (process.env.E2E_APPOINTMENT_ID && process.env.E2E_PROVIDER_REQUEST_ID) {
    return {
      appointmentId: process.env.E2E_APPOINTMENT_ID,
      providerRequestId: process.env.E2E_PROVIDER_REQUEST_ID,
    };
  }
  if (!cachedSitIds) {
    cachedSitIds = await ensureSitPlaytestMarketplace(request);
  }
  return cachedSitIds;
}

const PERSONA_LABEL: Record<string, { name: string; role: 'Requester' | 'Provider' }> = {
  'req-01': { name: 'QA ผู้รับ 01', role: 'Requester' },
  'prov-01': { name: 'QA ผู้ให้ 01', role: 'Provider' },
};

test.describe('QA28 M-1 skeleton layout shift', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_E2E_API_DELAY_MS));
      await route.continue();
    });
  });

  for (const routeCase of SKELETON_E2E_ROUTE_CASES) {
    test(`${routeCase.name} skeleton aligns with loaded content`, async ({ page, request }) => {
      const persona = PERSONA_LABEL[routeCase.personaKey];
      test.skip(!persona, `Unknown persona ${routeCase.personaKey}`);

      await loginPersona(page, persona.name, persona.role);
      const ids = await discoverIds(page, request);

      let path =
        typeof routeCase.path === 'function'
          ? routeCase.path(ids)
          : routeCase.path;

      if (routeCase.name === 'requester-bids' && ids.requestId) {
        path = `/requester/bids?requestId=${ids.requestId}`;
      }

      if (path.includes('e2e-placeholder')) {
        test.skip(true, 'Set E2E_APPOINTMENT_ID / E2E_PROVIDER_REQUEST_ID or seed SIT data');
      }

      const skeletonSelector =
        routeCase.skeletonSelector ??
        '.page-content .skeleton-stack .skeleton-card:first-of-type, .page-content .skeleton-stack .skeleton-form-field:first-of-type';
      const loadedSelector =
        routeCase.loadedSelector ?? '.page-content .card:not(.skeleton-card)';

      const skeleton = page.locator(skeletonSelector).first();
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (!(await skeleton.isVisible().catch(() => false))) {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      await expect(skeleton).toBeVisible({ timeout: 25_000 });
      const skeletonBox = await contentBox(page, skeletonSelector);

      await expect(page.locator(loadedSelector).first()).toBeVisible({ timeout: 60_000 });
      const loadedBox = await contentBox(page, loadedSelector);

      const preset = SKELETON_PAGE_PRESETS[routeCase.preset];
      expect(skeletonBox.top).toBeGreaterThanOrEqual(0);
      expect(loadedBox.top).toBeGreaterThanOrEqual(0);

      const topDelta = Math.abs(skeletonBox.top - loadedBox.top);
      const heightDelta = Math.abs(skeletonBox.height - loadedBox.height);
      expect(
        topDelta,
        `${routeCase.name} top skeleton=${skeletonBox.top} loaded=${loadedBox.top} Δ=${topDelta}`,
      ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX);
      expect(
        heightDelta,
        `${routeCase.name} height skeleton=${skeletonBox.height} loaded=${loadedBox.height} Δ=${heightDelta}`,
      ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX + (preset.variant === 'form' ? 12 : 0));
    });
  }
});
