import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestSummary } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { requestStatusLabel, requestStatusBadgeClass } from '../../../shared/status-labels';
import { formatScheduledAt } from '../../../shared/datetime.util';
import { AuthService } from '../../../core/auth.service';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-requester-home-page',
  imports: [PageShell, RouterLink, RequesterBottomNav, NgClass, LoadingSkeleton],
  templateUrl: './requester-home.html',
  styles: [
    `
      :host .cancel-modal {
        position: fixed;
        inset: 0;
        z-index: 40;
        display: grid;
        align-items: end;
        justify-items: center;
        padding: 1rem;
        background: rgba(16, 24, 31, 0.45);
      }
      :host .cancel-modal__sheet {
        width: min(100%, 28rem);
        display: grid;
        gap: 0.75rem;
        padding: 1.1rem;
        border-radius: 1rem;
        background: #fff;
      }
      :host .cancel-modal__sheet h2,
      :host .cancel-modal__sheet p {
        margin: 0;
      }
      :host .cancel-modal__actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
      :host .cancel-modal__actions button {
        min-height: 2.75rem;
        border-radius: 0.9rem;
        font-weight: 800;
      }
      :host .cancel-modal__confirm {
        border: 0;
        background: #9a3412;
        color: #fff;
      }
      :host .cancel-modal__confirm:disabled {
        opacity: 0.7;
      }
    `,
  ],
})
export class RequesterHomePage implements OnInit {
  protected readonly requests = signal<ServiceRequestSummary[]>([]);
  protected readonly notice = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cancelTarget = signal<ServiceRequestSummary | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly openingId = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusBadgeClass = requestStatusBadgeClass;
  protected readonly formatWhen = formatScheduledAt;
  private readonly reviewedNow = signal<{ id: string; rating: number } | null>(null);

  constructor(
    private readonly api: LocalGoApiService,
    private readonly session: SessionStateService,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    const state = history.state as { notice?: string; reviewedRequestId?: string; reviewedRating?: number } | null;
    if (state?.notice) {
      this.notice.set(state.notice);
    }
    if (state?.reviewedRequestId && typeof state.reviewedRating === 'number') {
      this.reviewedNow.set({ id: state.reviewedRequestId, rating: state.reviewedRating });
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await firstValueFrom(this.api.listMyRequests());
      const reviewed = this.reviewedNow();
      this.requests.set(
        reviewed
          ? items.map((item) =>
              item.id === reviewed.id
                ? { ...item, hasReviewed: true, myReviewRating: reviewed.rating, status: 'Completed' }
                : item,
            )
          : items,
      );
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected reviewBadge(request: ServiceRequestSummary): string | null {
    const reviewed = this.reviewedNow();
    if (reviewed?.id === request.id) {
      return `รีวิวแล้ว ★${reviewed.rating}`;
    }
    if (request.hasReviewed) {
      return request.myReviewRating ? `รีวิวแล้ว ★${request.myReviewRating}` : 'รีวิวแล้ว';
    }
    return null;
  }

  protected canCancel(status: string): boolean {
    return status === 'Draft' || status === 'Open' || status === 'HasOffers';
  }

  protected askCancel(request: ServiceRequestSummary, event: Event): void {
    event.stopPropagation();
    this.cancelError.set(null);
    this.cancelTarget.set(request);
  }

  protected dismissCancel(): void {
    if (this.cancelling()) {
      return;
    }
    this.cancelTarget.set(null);
    this.cancelError.set(null);
  }

  protected async confirmCancel(): Promise<void> {
    const request = this.cancelTarget();
    if (!request || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    const previous = this.requests();
    this.requests.set(
      previous.map((item) => (item.id === request.id ? { ...item, status: 'Cancelled' } : item)),
    );
    this.cancelTarget.set(null);
    try {
      await firstValueFrom(this.api.cancelRequest(request.id));
      this.requests.set(await firstValueFrom(this.api.listMyRequests()));
    } catch (e) {
      this.requests.set(previous);
      this.cancelTarget.set(request);
      this.cancelError.set(apiErrorMessage(e, 'ยกเลิกงานไม่สำเร็จ'));
    } finally {
      this.cancelling.set(false);
    }
  }

  protected armOpen(request: ServiceRequestSummary, event: Event): void {
    if (this.openingId()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.openingId.set(request.id);
  }

  protected openRequest(request: ServiceRequestSummary): void {
    if (this.openingId() && this.openingId() !== request.id) {
      return;
    }
    this.openingId.set(request.id);
    this.session.currentRequestId = request.id;
    void this.auth.setActiveRole('Requester');
    void this.router.navigate(['/requester/requests', request.id]).finally(() => this.openingId.set(null));
  }

}
