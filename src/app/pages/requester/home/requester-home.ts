import { FitSourceDirective, FitTargetDirective } from '../../../shared/ui/skeleton-fit.directive';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ToastService } from '../../../core/toast.service';
import { ServiceRequestSummary } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import {
  displayRequestStatusBadgeClass,
  displayRequestStatusLabel,
} from '../../../shared/status-labels';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SlowLoadHint } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';

import { ActionError } from '../../../shared/ui/action-error';
@Component({
  selector: 'app-requester-home-page',
  imports: [FitSourceDirective, FitTargetDirective, ActionError, PageShell, RouterLink, RequesterBottomNav, NgClass, ErrorState, ConfirmSheet],
  templateUrl: './requester-home.html',
})
export class RequesterHomePage implements OnInit, OnDestroy {
  protected readonly requests = signal<ServiceRequestSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cancelTarget = signal<ServiceRequestSummary | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly hint = new SlowLoadHint();
  protected readonly statusLabel = displayRequestStatusLabel;
  protected readonly statusBadgeClass = displayRequestStatusBadgeClass;

  private readonly api = inject(LocalGoApiService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStateService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    // R40 T4-26b: always fetch fresh statuses so a provider rejection never shows as "รอผู้ให้บริการยืนยัน".
    await this.load(true);
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async load(force = false): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.hint.begin();
    try {
      const items = await firstValueFrom(this.cache.listMyRequests(force));
      this.requests.set(items);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดรายการงานไม่สำเร็จ'));
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  protected isTerminalCard(request: ServiceRequestSummary): boolean {
    return (
      request.status === 'Cancelled' ||
      request.appointmentStatus === 'Cancelled' ||
      request.appointmentStatus === 'Rejected'
    );
  }

  protected canCancel(status: string): boolean {
    return status === 'Draft' || status === 'Open' || status === 'HasOffers';
  }

  protected askCancel(request: ServiceRequestSummary, event: Event): void {
    event.stopPropagation();
    this.actionError.set(null);
    this.cancelTarget.set(request);
  }

  protected closeCancel(): void {
    if (!this.busy()) {
      this.cancelTarget.set(null);
    }
  }

  protected async confirmCancel(): Promise<void> {
    const target = this.cancelTarget();
    if (!target || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    // Optimistic + close dialog immediately.
    this.requests.set(
      this.requests().map((r) =>
        r.id === target.id ? { ...r, status: 'Cancelled', appointmentStatus: 'Cancelled' } : r,
      ),
    );
    this.cancelTarget.set(null);
    try {
      await firstValueFrom(this.api.cancelRequest(target.id));
      // T4-25/A5-13: success toast (live region) only after the server confirmed.
      this.toast.show('ยกเลิกงานแล้ว');
      this.cache.invalidateMyRequests();
      const items = await firstValueFrom(this.cache.listMyRequests(true));
      this.requests.set(items);
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'ยกเลิกงานไม่สำเร็จ'));
      this.cache.invalidateMyRequests();
      await this.load(true);
      // keep the cancel failure visible even if the silent reload had its own issue
      this.error.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  protected isReviewed(request: ServiceRequestSummary): boolean {
    return request.status === 'Completed' && !!request.hasReviewed;
  }

  protected async openDetail(request: ServiceRequestSummary): Promise<void> {
    this.session.currentRequestId = request.id;
    await this.router.navigate(['/requester/requests', request.id]);
  }

  protected async openRequest(request: ServiceRequestSummary): Promise<void> {
    this.session.currentRequestId = request.id;
    // Ensure requester journey stays in requester role before routing.
    await this.auth.setActiveRole('Requester');
    if (request.status === 'Completed') {
      if (request.hasReviewed) {
        await this.router.navigate(['/requester/requests', request.id]);
        return;
      }
      await this.router.navigate(['/requester/review'], {
        queryParams: { requestId: request.id },
      });
      return;
    }
    if (request.appointmentStatus === 'Rejected' || request.status === 'Cancelled') {
      await this.router.navigate(['/requester/appointment'], {
        queryParams: { requestId: request.id },
      });
      return;
    }
    if (
      request.status === 'ProviderSelected' ||
      request.status === 'Selected' ||
      request.status === 'Scheduled' ||
      request.status === 'InProgress'
    ) {
      await this.router.navigate(['/requester/appointment'], {
        queryParams: { requestId: request.id },
      });
      return;
    }
    await this.router.navigateByUrl('/requester/bids');
  }

  protected continueLabel(request: ServiceRequestSummary): string {
    if (request.status === 'Cancelled' || request.appointmentStatus === 'Cancelled') {
      return 'ยกเลิกแล้ว';
    }
    if (request.appointmentStatus === 'Rejected') {
      return 'นัดใหม่หรือเลือกข้อเสนออื่น';
    }
    if (request.status === 'Completed') {
      return request.hasReviewed ? 'ดูรายละเอียด' : 'ให้คะแนนและรีวิว';
    }
    if (request.status === 'InProgress') {
      return 'ดูสถานะงาน';
    }
    return 'ดำเนินงานต่อ';
  }

  protected async switchToProvider(): Promise<void> {
    await this.auth.setActiveRole('Provider');
    await this.router.navigateByUrl('/provider');
  }
}
