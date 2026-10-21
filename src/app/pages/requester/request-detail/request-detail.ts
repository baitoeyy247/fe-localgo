import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AppointmentDetail, BidItem, ServiceRequestDetail } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SessionStateService } from '../../../core/session-state.service';
import {
  appointmentStatusLabel,
  bidStatusLabel,
  requestStatusBadgeClass,
  requestStatusLabel,
  reviewTypeLabel,
} from '../../../shared/status-labels';
import { formatBaht, jobPlaceLabel } from '../../../shared/form-rules';
import { formatScheduledAt } from '../../../shared/datetime.util';
import { isGuid } from '../../../shared/ids';
import { ConfirmModal } from '../../../shared/confirm-modal';

type TimelineStep = { label: string; state: 'done' | 'current' | 'todo' };

@Component({
  selector: 'app-requester-request-detail-page',
  imports: [PageShell, RouterLink, RequesterBottomNav, LoadingSkeleton, ConfirmModal],
  templateUrl: './request-detail.html',
})
export class RequesterRequestDetailPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly bids = signal<BidItem[]>([]);
  protected readonly appointment = signal<AppointmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly confirmCancel = signal(false);
  protected readonly expandedBids = signal<ReadonlySet<string>>(new Set());
  protected readonly myReviewRating = signal<number | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusBadgeClass = requestStatusBadgeClass;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly bidStatusLabel = bidStatusLabel;
  protected readonly reviewTypeLabel = reviewTypeLabel;
  protected readonly formatBaht = formatBaht;
  protected readonly placeLabel = jobPlaceLabel;
  protected readonly formatScheduledAt = formatScheduledAt;

  private readonly api = inject(LocalGoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStateService);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async retry(): Promise<void> {
    await this.load();
  }

  protected timeline(): TimelineStep[] {
    const status = this.request()?.status ?? '';
    const appointmentStatus = this.appointment()?.status ?? this.requestStatusAppointment();
    const rank = this.statusRank(status, appointmentStatus);
    const confirmed = appointmentStatus === 'Confirmed' || rank >= 4;
    const steps = [
      { label: 'ประกาศงาน', at: 0 },
      { label: 'รับข้อเสนอ', at: 1 },
      { label: confirmed ? 'นัดหมายแล้ว (ยืนยันแล้ว)' : 'รอผู้ให้บริการยืนยันนัด', at: 3 },
      { label: 'กำลังดำเนินงาน', at: 4 },
      { label: 'เสร็จสิ้น', at: 5 },
    ];
    return steps.map((step, index) => {
      const currentIndex = steps.findIndex((item) => item.at === rank) >= 0
        ? steps.findIndex((item) => item.at === rank)
        : steps.findIndex((item) => item.at > rank) - 1;
      const active = currentIndex < 0 ? 0 : currentIndex;
      return {
        label: step.label,
        state: index < active ? 'done' : index === active ? 'current' : 'todo',
      };
    });
  }

  protected canCancel(): boolean {
    const status = this.request()?.status;
    return status === 'Draft' || status === 'Open' || status === 'HasOffers' || status === 'ProviderSelected' || status === 'Scheduled';
  }

  protected askCancel(): void {
    if (!this.cancelling()) {
      this.confirmCancel.set(true);
    }
  }

  protected dismissCancel(): void {
    if (!this.cancelling()) {
      this.confirmCancel.set(false);
    }
  }

  protected async confirmCancelJob(): Promise<void> {
    const request = this.request();
    if (!request || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.cancelRequest(request.id));
      this.confirmCancel.set(false);
      this.request.set({ ...request, status: 'Cancelled' });
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกงานไม่สำเร็จ'));
    } finally {
      this.cancelling.set(false);
    }
  }

  protected ratingLine(bid: BidItem): string {
    const count = bid.verifiedReviewCount ?? 0;
    if (count <= 0) {
      return 'ยังไม่มีรีวิว';
    }
    const average = Number(bid.averageVerifiedRating ?? 0);
    const text = Number.isInteger(average) ? String(average) : average.toFixed(1);
    return `★${text} (${count})`;
  }

  protected toggleMessage(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(this.expandedBids());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedBids.set(next);
  }

  protected messageLong(text?: string | null): boolean {
    return (text?.trim().length ?? 0) > 180;
  }

  protected reviewBadge(): string | null {
    const rating = this.myReviewRating();
    if (rating == null && this.request()?.status !== 'Completed') {
      return null;
    }
    if (rating == null) {
      return null;
    }
    return `รีวิวแล้ว ★${rating}`;
  }

  protected openReview(): void {
    const request = this.request();
    if (!request) {
      return;
    }
    this.session.requesterRequestId = request.id;
    if (request.selectedProviderId) {
      this.session.currentProviderId = request.selectedProviderId;
    }
    void this.router.navigate(['/requester/review'], { queryParams: { requestId: request.id } });
  }

  private requestStatusAppointment(): string | null {
    return null;
  }

  private statusRank(status: string, appointmentStatus: string | null): number {
    if (status === 'Cancelled' || status === 'Expired') {
      return 0;
    }
    if (status === 'Completed' || appointmentStatus === 'Completed') {
      return 5;
    }
    if (status === 'InProgress' || appointmentStatus === 'InProgress') {
      return 4;
    }
    if (appointmentStatus === 'Confirmed') {
      return 3;
    }
    if (status === 'Scheduled' || status === 'ProviderSelected' || status === 'Selected') {
      return 2;
    }
    if (status === 'HasOffers') {
      return 1;
    }
    return 0;
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.request.set(null);
    this.bids.set([]);
    this.appointment.set(null);
    this.myReviewRating.set(null);
    if (!isGuid(id)) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      const detail = await firstValueFrom(this.api.getRequest(id));
      this.request.set(detail);
      this.session.requesterRequestId = detail.id;
      if (detail.selectedProviderId) {
        this.session.currentProviderId = detail.selectedProviderId;
      }
      const [bidResult, appointmentResult] = await Promise.allSettled([
        firstValueFrom(this.api.listBids(id)),
        firstValueFrom(this.api.getAppointment(id)),
      ]);
      if (bidResult.status === 'fulfilled') {
        this.bids.set(bidResult.value);
      }
      if (appointmentResult.status === 'fulfilled') {
        this.appointment.set(appointmentResult.value);
      }
      if (detail.status === 'Completed' && detail.selectedProviderId) {
        const mine = await firstValueFrom(this.api.findMyReview(detail.selectedProviderId, detail.id));
        this.myReviewRating.set(mine?.rating ?? null);
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && (e.status === 404 || e.status === 400)) {
        this.notFound.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
