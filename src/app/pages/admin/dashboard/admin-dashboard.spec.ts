import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth.service';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ToastService } from '../../../core/toast.service';
import { AdminDashboardPage } from './admin-dashboard';
import { ADMIN_TOOL_DISABLED_MESSAGE } from './admin-reset.util';

const DASH = { users: 7, providers: 2, publishedRequests: 3, completedRequests: 1, expiredRequests: 0, pendingNotifications: 4 };
const USERS = { items: [{ id: 'u1', displayName: 'Real User', lineUserId: 'U123' }], total: 1 };

type Api = Record<string, (...args: unknown[]) => Observable<unknown>>;

function okApi(overrides: Partial<Api> = {}): Api {
  return {
    getAdminDashboard: () => of(DASH),
    listAdminUsers: () => of(USERS),
    listAdminNotifications: () => of([]),
    listAdminServiceRequests: () => of([]),
    listAdminAppointments: () => of([]),
    resetTestData: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    repairTestData: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    ...overrides,
  };
}

async function render(api: Api, opts: { showTestTools?: boolean } = {}) {
  const toast = { show: vi.fn() };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AdminDashboardPage],
    providers: [
      provideRouter([]),
      { provide: LocalGoApiService, useValue: api },
      { provide: ToastService, useValue: toast },
      { provide: MarketplaceCacheService, useValue: { invalidateAll: () => undefined } },
      { provide: AuthService, useValue: { user: signal(null) } },
    ],
  });
  const fixture = TestBed.createComponent(AdminDashboardPage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = fixture.componentInstance as any;
  if (opts.showTestTools !== undefined) {
    page.showTestTools.set(opts.showTestTools);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, page, el, toast };
}

describe('AdminDashboardPage', () => {
  it('A-2: no reset/repair buttons, help text or test badges when allowDevLogin=false', async () => {
    const api = okApi({
      listAdminUsers: () => of({ items: [{ id: 'p1', displayName: 'Persona', lineUserId: 'dev-persona-req-01' }], total: 1 }),
    });
    const { el } = await render(api, { showTestTools: false });
    expect(el.querySelector('[data-testid="admin-reset"]')).toBeNull();
    expect(el.querySelector('[data-testid="admin-repair"]')).toBeNull();
    expect(el.textContent).not.toContain('รีเซ็ตข้อมูลทดสอบ');
    expect(el.textContent).not.toContain('ซ่อมข้อมูลทดสอบ');
    expect(el.querySelector('.admin-test-badge')).toBeNull();
    expect(el.textContent).toContain('Persona');
  });

  it('A-1: renders no KPIs (no fake 10/5) when dashboard is null', async () => {
    const api = okApi({ getAdminDashboard: () => throwError(() => new HttpErrorResponse({ status: 504 })) });
    const { el, page } = await render(api, { showTestTools: true });
    expect(page.dashboard()).toBeNull();
    expect(el.querySelector('.kpi')).toBeNull();
    expect(el.querySelector('[data-section="dashboard"]')).not.toBeNull();
    // tools disabled until real dashboard data exists
    expect((el.querySelector('[data-testid="admin-reset"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('A-3: a notifications failure still renders the dashboard KPIs and users', async () => {
    const api = okApi({ listAdminNotifications: () => throwError(() => new HttpErrorResponse({ status: 504 })) });
    const { el, page } = await render(api);
    expect(page.error()).toBeNull();
    expect(el.querySelector('.kpi')?.textContent).toContain('7');
    expect(el.textContent).toContain('Real User');
    expect(el.querySelector('[data-section="notifications"]')).not.toBeNull();
    expect(el.querySelector('[data-section="users"]')).toBeNull();
  });

  it('A-3: requests notifications with pageSize 20', async () => {
    const spy = vi.fn(() => of([]));
    await render(okApi({ listAdminNotifications: spy }));
    expect(spy).toHaveBeenCalledWith(1, 20);
  });

  it('A-1: reset failure (404) → notice null, error set, dashboard unchanged, no toast', async () => {
    const { page, toast } = await render(okApi(), { showTestTools: true });
    const before = page.dashboard();
    await page.resetTestData();
    expect(page.notice()).toBeNull();
    expect(page.actionError()).toBe(ADMIN_TOOL_DISABLED_MESSAGE);
    expect(page.dashboard()).toEqual(before);
    expect(page.resetting()).toBe(false);
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('A-1: reset success → notice + toast after the request, dashboard from BE', async () => {
    const after = { ...DASH, publishedRequests: 0 };
    let dashCalls = 0;
    const api = okApi({
      getAdminDashboard: () => of(dashCalls++ === 0 ? DASH : after),
      resetTestData: () => of({ deletedRequests: 3, keptUsers: 7, dashboard: after }),
    });
    const { page, toast } = await render(api, { showTestTools: true });
    await page.resetTestData();
    expect(page.actionError()).toBeNull();
    expect(page.notice()).toContain('รีเซ็ตสำเร็จ');
    expect(page.notice()).toContain('ลบงาน 3');
    expect(page.dashboard()).toEqual(after);
    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it('A-1: retry with no data shows the loading skeleton, not an empty page', async () => {
    const api = okApi({
      getAdminDashboard: () => throwError(() => new HttpErrorResponse({ status: 504 })),
      listAdminUsers: () => throwError(() => new HttpErrorResponse({ status: 504 })),
      listAdminNotifications: () => throwError(() => new HttpErrorResponse({ status: 504 })),
      listAdminServiceRequests: () => throwError(() => new HttpErrorResponse({ status: 504 })),
      listAdminAppointments: () => throwError(() => new HttpErrorResponse({ status: 504 })),
    });
    const { page } = await render(api);
    expect(page.error()).toBeTruthy();
    const p = page.load(false);
    expect(page.loading()).toBe(true);
    await p;
  });
});
