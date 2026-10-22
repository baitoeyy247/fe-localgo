import { expect, test, type Page } from '@playwright/test';
import {
  cleanupSitPlaytestMarketplace,
  ensureSitPlaytestMarketplace,
  type SitPlaytestIds,
} from './helpers/sit-playtest-seed';
import {
  SKELETON_CLS_TOLERANCE_PX,
  SKELETON_E2E_ALIGN_ROUTE_CASES,
  SKELETON_E2E_API_DELAY_MS,
  SKELETON_E2E_VIEWPORT_WIDTHS,
  SKELETON_PAGE_PRESETS,
  type SkeletonE2ERouteCase,
} from '../src/app/shared/ui/skeleton-layout.constants';

type Box = { top: number; height: number };

async function contentBox(page: Page, selector: string, index = 0): Promise<Box> {
  return page.evaluate(
    ({ sel, idx }) => {
      const content = document.querySelector('.page-content') as HTMLElement | null;
      const parts = sel.split(',').map((s) => s.trim());
      const matches: HTMLElement[] = [];
      for (const part of parts) {
        document.querySelectorAll(part).forEach((node) => {
          if (node instanceof HTMLElement) {
            matches.push(node);
          }
        });
      }
      const el = matches[idx] ?? null;
      if (!content || !el) {
        return { top: -1, height: -1 };
      }
      const c = content.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { top: r.top - c.top, height: r.height };
    },
    { sel: selector, idx: index },
  );
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

function skeletonCardSelector(routeCase: SkeletonE2ERouteCase): string {
  return (
    routeCase.skeletonSelector ??
    '.page-content .skeleton-stack .skeleton-card, .page-content .skeleton-stack .skeleton-form-field'
  );
}

function assertBoxDelta(
  label: string,
  skeletonBox: Box,
  loadedBox: Box,
  extraHeightTolerance = 0,
): void {
  expect(skeletonBox.top).toBeGreaterThanOrEqual(0);
  expect(loadedBox.top).toBeGreaterThanOrEqual(0);
  const topDelta = Math.abs(skeletonBox.top - loadedBox.top);
  const heightDelta = Math.abs(skeletonBox.height - loadedBox.height);
  expect(topDelta, `${label} top skeleton=${skeletonBox.top} loaded=${loadedBox.top} Δ=${topDelta}`).toBeLessThanOrEqual(
    SKELETON_CLS_TOLERANCE_PX,
  );
  expect(
    heightDelta,
    `${label} height skeleton=${skeletonBox.height} loaded=${loadedBox.height} Δ=${heightDelta}`,
  ).toBeLessThanOrEqual(SKELETON_CLS_TOLERANCE_PX + extraHeightTolerance);
}

test.describe('QA31 M-1 skeleton layout shift', () => {
  test.afterAll(async ({ request }) => {
    await cleanupSitPlaytestMarketplace(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_E2E_API_DELAY_MS));
      await route.continue();
    });
  });

  for (const width of SKELETON_E2E_VIEWPORT_WIDTHS) {
    for (const routeCase of SKELETON_E2E_ALIGN_ROUTE_CASES) {
      test(`${routeCase.name} @${width}px skeleton aligns with loaded content`, async ({ page, request }) => {
        const persona = PERSONA_LABEL[routeCase.personaKey];
        test.skip(!persona, `Unknown persona ${routeCase.personaKey}`);

        await page.setViewportSize({ width, height: 800 });
        await loginPersona(page, persona.name, persona.role);
        const ids = await discoverIds(page, request);

        let path =
          typeof routeCase.path === 'function' ? routeCase.path(ids) : routeCase.path;

        if (routeCase.name === 'requester-bids' && ids.requestId) {
          path = `/requester/bids?requestId=${ids.requestId}`;
        }

        if (path.includes('e2e-placeholder')) {
          test.skip(true, 'Set E2E_APPOINTMENT_ID / E2E_PROVIDER_REQUEST_ID or seed SIT data');
        }

        const skelSel = skeletonCardSelector(routeCase);
        const loadedSelector =
          routeCase.loadedSelector ?? '.page-content .card:not(.skeleton-card)';

        const skeleton = page.locator(skelSel).first();
        const loaded = page.locator(loadedSelector).first();
        const waitSkeleton = skeleton.waitFor({ state: 'visible', timeout: 30_000 });

        if (routeCase.name === 'provider-requests') {
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await expect(loaded).toBeVisible({ timeout: 60_000 });
          await Promise.all([waitSkeleton, page.getByRole('button', { name: 'รีเฟรช' }).click()]);
        } else {
          await Promise.all([waitSkeleton, page.goto(path, { waitUntil: 'domcontentloaded' })]);
        }

        const preset = SKELETON_PAGE_PRESETS[routeCase.preset];
        const skeletonBox = await contentBox(page, skelSel, 0);
        let skeletonBox2: Box | null = null;
        if (routeCase.assertSecondCard) {
          skeletonBox2 = await contentBox(page, skelSel, 1);
        }

        await expect(loaded).toBeVisible({ timeout: 60_000 });
        const loadedBox = await contentBox(page, loadedSelector, 0);
        assertBoxDelta(routeCase.name, skeletonBox, loadedBox, preset.variant === 'form' ? 12 : 0);

        if (routeCase.assertSecondCard && skeletonBox2) {
          const loadedBox2 = await contentBox(page, loadedSelector, 1);
          assertBoxDelta(`${routeCase.name} card2`, skeletonBox2, loadedBox2);
        }
      });
    }
  }
});
