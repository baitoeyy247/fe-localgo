import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, BidItem, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import {
  bidStatusLabel,
  displayRequestStatusBadgeClass,
  displayRequestStatusLabel,
} from '../../../shared/status-labels';
import { SlowLoadHint, isNotFoundError } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { NotFoundState } from '../../../shared/ui/not-found-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';

@Component({
  selector: 'app-requester-request-detail-page',
  imports: [
    PageShell,
    RouterLink,
    NgClass,
    RequesterBottomNav,
    ErrorState,
    NotFoundState,
    SkeletonCard,
    ConfirmSheet,
  ],
  templateUrl: './requester-request-detail.html',
})
export class RequesterRequestDetailPage implements OnInit, OnDestroy {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly bids = signal<BidItem[]>([]);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly hint = new SlowLoadHint();
  protected readonly bidStatusLabel = bidStatusLabel;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected statusLabel(): string {
    const r = this.request();
    return r ? displayRequestStatusLabel(r.status, this.appointment()?.status) : '';
  }

  protected statusClass(): string {
    const r = this.request();
    return r ? displayRequestStatusBadgeClass(r.status, this.appointment()?.status) : '';
  }

  protected async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.hint.begin();
    try {
      const detail = await firstValueFrom(this.api.getRequest(id));
      this.request.set(detail);
      this.session.currentRequestId = detail.id;
      this.bids.set(detail.bids ?? (await firstValueFrom(this.api.listBids(id))));
      if (detail.selectedProviderId || detail.status === 'Scheduled') {
        try {
          this.appointment.set(await firstValueFrom(this.api.getAppointment(id)));
        } catch {
          this.appointment.set(null);
        }
      }
    } catch (e) {
      if (isNotFoundError(e)) {
        this.request.set(null);
        this.notFound.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดรายละเอียดงานไม่สำเร็จ'));
      }
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  protected canCancel(): boolean {
    const st = this.request()?.status;
    return st === 'Draft' || st === 'Open' || st === 'HasOffers';
  }

  protected nextActionLabel(): string | null {
    const st = this.request()?.status;
    if (st === 'Open' || st === 'HasOffers') {
      return 'ดูข้อเสนอ';
    }
    if (st === 'ProviderSelected' || st === 'Selected' || st === 'Scheduled' || st === 'InProgress') {
      return 'ไปหน้านัดหมาย';
    }
    return null;
  }

  protected async goNext(): Promise<void> {
    const r = this.request();
    if (!r) {
      return;
    }
    this.session.requesterRequestId = r.id;
    const st = r.status;
    if (st === 'Open' || st === 'HasOffers') {
      await this.router.navigate(['/requester/bids'], { queryParams: { requestId: r.id } });
      return;
    }
    await this.router.navigate(['/requester/appointment'], { queryParams: { requestId: r.id } });
  }

  protected async confirmCancel(): Promise<void> {
    const r = this.request();
    if (!r || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.cancelRequest(r.id));
      this.cancelOpen.set(false);
      await this.load();
    } catch (e) {
      this.cancelOpen.set(false);
      this.actionError.set(apiErrorMessage(e, 'ยกเลิกงานไม่สำเร็จ'));
    } finally {
      this.busy.set(false);
    }
  }
}
