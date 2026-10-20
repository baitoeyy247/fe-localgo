import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { BidItem, ServiceRequestDetail, ServiceRequestSummary } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { requestStatusLabel } from '../../../shared/status-labels';
import { formatBaht } from '../../../shared/form-rules';
import { ConfirmModal } from '../../../shared/confirm-modal';
import { resolveRequesterRequestId } from '../../../shared/requester-request-flow';
import { redirectProviderFromRequesterRoute } from '../../../shared/requester-deep-link-guard';

@Component({
  selector: 'app-private-bids-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar, LoadingSkeleton, RouterLink, ConfirmModal],
  templateUrl: './private-bids.html',
})
export class PrivateBidsPage implements OnInit, OnDestroy {
  protected readonly bids = signal<BidItem[]>([]);
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly selectedBidId = signal<string | null>(null);
  protected readonly openedBidId = signal<string | null>(null);
  protected readonly confirmClear = signal(false);
  protected readonly loading = signal(true);
  protected readonly clearing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly justPosted = signal(false);
  protected readonly jobChoices = signal<ServiceRequestSummary[]>([]);
  protected readonly choosing = signal(false);
  protected readonly formatBaht = formatBaht;
  private querySub?: Subscription;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((qp) => {
      void this.applyQuery(qp);
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  private async applyQuery(qp: ParamMap): Promise<void> {
    this.justPosted.set(qp.get('posted') === '1');
    const queryRequestId = qp.get('requestId');
    if (!queryRequestId) {
      this.request.set(null);
      await this.loadJobList();
      return;
    }
    const redirected = await redirectProviderFromRequesterRoute(
      this.api,
      this.auth,
      this.router,
      queryRequestId,
    );
    if (redirected) {
      return;
    }
    const requestId = await resolveRequesterRequestId(this.api, this.session, {
      queryRequestId,
      strategy: 'bids',
    });
    if (!requestId) {
      await this.loadJobList();
      return;
    }
    await this.load(requestId);
  }

  protected async openJob(job: ServiceRequestSummary): Promise<void> {
    this.choosing.set(true);
    await this.router.navigate(['/requester/bids'], { queryParams: { requestId: job.id } });
    this.choosing.set(false);
  }

  protected canSchedule(): boolean {
    const status = this.request()?.status;
    return status === 'Open' || status === 'HasOffers';
  }

  protected isCancelled(): boolean {
    return this.request()?.status === 'Cancelled';
  }

  protected formatWhen(iso?: string | null): string {
    if (!iso) {
      return '';
    }
    try {
      return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  protected selectBid(bid: BidItem): void {
    this.selectedBidId.set(bid.id);
    this.session.currentProviderId = bid.providerId;
  }

  protected async confirmSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    const bidId = this.selectedBidId();
    if (!requestId || !bidId || !this.canSchedule() || this.choosing()) {
      return;
    }
    this.choosing.set(true);
    try {
      await firstValueFrom(this.api.selectBid(requestId, bidId));
      await this.router.navigateByUrl('/requester/appointment');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'เลือกข้อเสนอไม่สำเร็จ'));
    } finally {
      this.choosing.set(false);
    }
  }

  protected canClearBidSelection(): boolean {
    const detail = this.request();
    if (!detail || detail.source === 'DirectBooking') {
      return false;
    }
    if (!detail.selectedBidId) {
      return false;
    }
    return detail.status === 'ProviderSelected' || detail.status === 'Scheduled';
  }

  protected async clearBidSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId || !this.canClearBidSelection() || this.clearing()) {
      return;
    }
    this.confirmClear.set(true);
  }

  protected dismissClear(): void {
    if (!this.clearing()) {
      this.confirmClear.set(false);
    }
  }

  protected async confirmClearSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId || !this.canClearBidSelection() || this.clearing()) {
      return;
    }
    this.clearing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearBidSelection(requestId));
      this.confirmClear.set(false);
      await this.load(requestId);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกการเลือกไม่สำเร็จ'));
    } finally {
      this.clearing.set(false);
    }
  }

  protected openBid(bid: BidItem): void {
    this.openedBidId.set(bid.id);
    if (this.canSchedule()) {
      this.selectBid(bid);
    }
  }

  protected focusedBid(): BidItem | null {
    const id = this.openedBidId() ?? this.selectedBidId();
    return this.bids().find((bid) => bid.id === id) ?? null;
  }

  protected isExpired(): boolean {
    return this.request()?.status === 'Expired';
  }

  protected isReadOnly(): boolean {
    const status = this.request()?.status;
    return status === 'Cancelled' || status === 'Expired';
  }

  protected async retry(): Promise<void> {
    await this.applyQuery(this.route.snapshot.queryParamMap);
  }

  private async loadJobList(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const mine = await firstValueFrom(this.api.listMyRequests());
      this.jobChoices.set(mine.filter((job) => (job.bidCount ?? 0) > 0));
    } catch (e) {
      this.jobChoices.set([]);
      this.error.set(apiErrorMessage(e, 'โหลดข้อเสนอไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  private async load(requestId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [detail, bidList] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.listBids(requestId)),
      ]);
      this.request.set(detail);
      this.session.requesterRequestId = detail.id;
      this.bids.set(bidList);
      const selectedFromRequest = detail.selectedBidId
        ? bidList.find((b) => b.id === detail.selectedBidId)
        : undefined;
      const pick = selectedFromRequest ?? bidList[0];
      if (pick) {
        this.selectedBidId.set(pick.id);
        this.session.currentProviderId = pick.providerId;
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อเสนอไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }
}
