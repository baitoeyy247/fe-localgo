import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { BidItem, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { requestStatusLabel } from '../../../shared/status-labels';
import { resolveRequesterRequestId } from '../../../shared/requester-request-flow';
import { redirectProviderFromRequesterRoute } from '../../../shared/requester-deep-link-guard';

@Component({
  selector: 'app-private-bids-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar],
  templateUrl: './private-bids.html',
})
export class PrivateBidsPage implements OnInit {
  protected readonly bids = signal<BidItem[]>([]);
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly selectedBidId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly clearing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly justPosted = signal(false);

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const qp = this.route.snapshot.queryParamMap;
    this.justPosted.set(qp.get('posted') === '1');
    const queryRequestId = qp.get('requestId');
    if (queryRequestId) {
      const redirected = await redirectProviderFromRequesterRoute(
        this.api,
        this.auth,
        this.router,
        queryRequestId,
      );
      if (redirected) {
        return;
      }
    }

    const requestId = await resolveRequesterRequestId(this.api, this.session, {
      queryRequestId,
      strategy: 'bids',
    });
    if (!requestId) {
      this.loading.set(false);
      return;
    }
    await this.load(requestId);
  }

  protected selectBid(bid: BidItem): void {
    this.selectedBidId.set(bid.id);
    this.session.currentProviderId = bid.providerId;
  }

  protected async confirmSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    const bidId = this.selectedBidId();
    if (!requestId || !bidId) {
      return;
    }
    await firstValueFrom(this.api.selectBid(requestId, bidId));
    await this.router.navigateByUrl('/requester/appointment');
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
    if (!confirm('ยกเลิกการเลือกข้อเสนอและกลับไปเลือกใหม่?')) {
      return;
    }
    this.clearing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearBidSelection(requestId));
      await this.load(requestId);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกการเลือกไม่สำเร็จ'));
    } finally {
      this.clearing.set(false);
    }
  }

  protected isExpired(): boolean {
    return this.request()?.status === 'Expired';
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
