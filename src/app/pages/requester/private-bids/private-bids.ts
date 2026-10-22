import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { BidItem, ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { requestStatusLabel } from '../../../shared/status-labels';
import { resolveRequesterRequestId } from '../../../shared/requester-request-flow';
import { redirectProviderFromRequesterRoute } from '../../../shared/requester-deep-link-guard';
import { SlowLoadHint } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { formatPrice } from '../../../shared/format-price';
import { shouldShowLineNotificationHint } from '../../../shared/line-notification-hint';
import { GLOSSARY } from '../../../shared/glossary';
import { RequestFlowCacheService } from '../../../core/request-flow-cache.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';

@Component({
  selector: 'app-private-bids-page',
  imports: [
    PageShell,
    RequesterBottomNav,
    RequesterFlowBar,
    RouterLink,
    ErrorState,
    SkeletonCard,
    ConfirmSheet,
  ],
  templateUrl: './private-bids.html',
})
export class PrivateBidsPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly bids = signal<BidItem[]>([]);
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly selectedBidId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly clearing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly justPosted = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly selecting = signal(false);
  protected readonly confirmClearOpen = signal(false);
  protected readonly confirmSelectOpen = signal(false);
  protected readonly hint = new SlowLoadHint();
  protected readonly formatPrice = formatPrice;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly flowCache = inject(RequestFlowCacheService);
  private readonly marketplaceCache = inject(MarketplaceCacheService);

  protected showLineHint(): boolean {
    return shouldShowLineNotificationHint(this.auth);
  }
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
        this.marketplaceCache,
      );
      if (redirected) {
        return;
      }
    }

    const requestId = await resolveRequesterRequestId(this.api, this.session, {
      queryRequestId,
      strategy: 'bids',
      cache: this.marketplaceCache,
    });
    if (!requestId) {
      this.loading.set(false);
      return;
    }
    const cached = this.flowCache.peekPrivateBids(requestId);
    if (cached) {
      this.applyLoadedState(cached.detail, cached.bids);
      this.loading.set(false);
      void this.load(requestId, { background: true });
      return;
    }
    await this.load(requestId);
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async retry(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (requestId) {
      await this.load(requestId);
    } else {
      await this.ngOnInit();
    }
  }

  protected selectBid(bid: BidItem): void {
    this.selectedBidId.set(bid.id);
    this.session.currentProviderId = bid.providerId;
  }

  protected providerRatingLine(bid: BidItem): string {
    const count = bid.verifiedReviewCount ?? 0;
    if (count <= 0) {
      return 'ยังไม่มีรีวิว';
    }
    const avg = bid.averageVerifiedRating ?? 0;
    return `★ ${avg.toFixed(1)} (${count} รีวิว)`;
  }

  protected async openProvider(bid: BidItem, event: Event): Promise<void> {
    event.stopPropagation();
    await this.router.navigate(['/requester/provider', bid.providerId]);
  }

  protected selectedBid(): BidItem | null {
    const id = this.selectedBidId();
    return id ? (this.bids().find((b) => b.id === id) ?? null) : null;
  }

  protected openSelectConfirm(): void {
    if (!this.selectedBidId()) {
      return;
    }
    this.confirmSelectOpen.set(true);
  }

  protected selectConfirmMessage(): string {
    const bid = this.selectedBid();
    if (!bid) {
      return 'ยืนยันการเลือกข้อเสนอ';
    }
    return (
      `ผู้ให้บริการ: ${bid.providerName}\n` +
      `ราคา: ${formatPrice(bid.priceText)}\n` +
      `ขั้นถัดไป: กำหนดวัน เวลา และสถานที่นัดหมาย`
    );
  }

  protected async confirmSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    const bidId = this.selectedBidId();
    if (!requestId || !bidId || this.selecting()) {
      return;
    }
    this.confirmSelectOpen.set(false);
    this.selecting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.selectBid(requestId, bidId));
      await this.router.navigateByUrl('/requester/appointment');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'เลือกข้อเสนอไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.selecting.set(false);
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

  protected askClearBidSelection(): void {
    this.confirmClearOpen.set(true);
  }

  protected async clearBidSelection(): Promise<void> {
    const requestId = this.request()?.id ?? this.session.requesterRequestId ?? null;
    if (!requestId || !this.canClearBidSelection() || this.clearing()) {
      return;
    }
    this.clearing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearBidSelection(requestId));
      await this.load(requestId);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ยกเลิกการเลือกไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.confirmClearOpen.set(false);
      this.clearing.set(false);
    }
  }

  protected isExpired(): boolean {
    return this.request()?.status === 'Expired';
  }

  protected canSelectOffers(): boolean {
    const status = this.request()?.status;
    if (!status || this.isExpired()) {
      return false;
    }
    return status === 'Open' || status === 'HasOffers';
  }

  protected selectedOffer(): BidItem | null {
    const detail = this.request();
    if (!detail?.selectedBidId) {
      return null;
    }
    return this.bids().find((b) => b.id === detail.selectedBidId) ?? null;
  }

  private async load(requestId: string, options?: { background?: boolean }): Promise<void> {
    if (!options?.background) {
      this.loading.set(true);
    }
    this.error.set(null);
    this.loadError.set(null);
    this.hint.begin();
    try {
      const [detail, bidList] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.listBids(requestId)),
      ]);
      this.applyLoadedState(detail, bidList);
      this.flowCache.putPrivateBids(detail, bidList);
    } catch (e) {
      if (!options?.background || !this.request()) {
        this.loadError.set(apiErrorMessage(e, 'โหลดข้อเสนอไม่สำเร็จ'));
      }
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  private applyLoadedState(detail: ServiceRequestDetail, bidList: BidItem[]): void {
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
  }
}
