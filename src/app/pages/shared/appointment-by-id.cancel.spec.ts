import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { LocalGoApiService } from '../../core/localgo-api.service';
import { ToastService } from '../../core/toast.service';
import { AppointmentByIdPage } from './appointment-by-id';

// A5-24 / L-T1-4b: /requester/appointments/:id must keep the cancel sheet open (busy) until the PATCH settles.
function setup(api: Partial<LocalGoApiService>) {
  TestBed.configureTestingModule({
    providers: [
      { provide: LocalGoApiService, useValue: api },
      { provide: ToastService, useValue: { show: () => undefined } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { role: 'requester' }, paramMap: { get: () => 'a1' } } } },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = TestBed.runInInjectionContext(() => new AppointmentByIdPage()) as any;
  page.appointment.set({ id: 'a1', status: 'Confirmed', scheduledAt: '2026-10-24T02:30:00Z' });
  page.cancelOpen.set(true);
  return page;
}

describe('AppointmentByIdPage cancel sheet', () => {
  it('stays open and busy while PATCH is pending, closes on success', async () => {
    const res = new Subject<unknown>();
    const page = setup({ updateAppointmentStatus: () => res.asObservable() } as never);
    const p = page.cancelAppointment();
    expect(page.cancelOpen()).toBe(true);
    expect(page.acting()).toBe(true);
    res.next({ id: 'a1', status: 'Cancelled' });
    res.complete();
    await p;
    expect(page.cancelOpen()).toBe(false);
    expect(page.acting()).toBe(false);
  });

  it('closes and shows inline error on failure', async () => {
    const page = setup({ updateAppointmentStatus: () => throwError(() => ({ status: 503 })) } as never);
    await page.cancelAppointment();
    expect(page.cancelOpen()).toBe(false);
    expect(page.actionError()).toBeTruthy();
  });
});
