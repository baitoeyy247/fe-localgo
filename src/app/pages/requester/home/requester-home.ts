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
  protected readonly switching = signal(false);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusBadgeClass = requestStatusBadgeClass;

  constructor(
    private readonly api: LocalGoApiService,
    private readonly session: SessionStateService,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const state = history.state as { notice?: string } | null;
    if (state?.notice) {
      this.notice.set(state.notice);
    }
    try {
      const items = await firstValueFrom(this.api.listMyRequests());
      this.requests.set(items);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'โหลดรายการงานไม่สำเร็จ');
    } finally {
      this.loading.set(false);
    }
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
    const destination =
      request.status === 'Cancelled'
        ? this.router.navigate(['/requester/requests', request.id])
        : request.status === 'Completed'
          ? this.router.navigate(['/requester/review'], { queryParams: { requestId: request.id } })
          : request.status === 'ProviderSelected' ||
              request.status === 'Selected' ||
              request.status === 'Scheduled' ||
              request.status === 'InProgress'
            ? this.router.navigateByUrl('/requester/appointment')
            : this.router.navigate(['/requester/bids'], { queryParams: { requestId: request.id } });
    void destination.finally(() => this.openingId.set(null));
  }

  protected continueLabel(status: string): string {
    if (status === 'Cancelled') {
      return 'ดูรายละเอียด';
    }
    if (status === 'Completed') {
      return 'ให้คะแนนและรีวิว';
    }
    if (status === 'InProgress') {
      return 'ดูสถานะงาน';
    }
    return 'ดำเนินงานต่อ';
  }

  protected formatWhen(iso: string): string {
    try {
      return new Date(iso).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  protected switchToProvider(): void {
    if (this.switching()) {
      return;
    }
    this.switching.set(true);
    void this.auth.setActiveRole('Provider').then(() => this.router.navigateByUrl('/provider'));
  }
}
