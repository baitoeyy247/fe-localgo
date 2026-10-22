import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SlowLoadHint } from '../../../shared/load-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ErrorState } from '../../../shared/ui/error-state';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { ToastService } from '../../../core/toast.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { GLOSSARY } from '../../../shared/glossary';
import { RequestFlowCacheService } from '../../../core/request-flow-cache.service';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import {
  bidSubmittedToast,
  formatBidDescriptionConfirmLine,
  formatBidPriceConfirmLine,
  destructiveSheetDismissWithdrawBid,
  withdrawBidConfirmMessage,
  withdrawBidToast,
} from '../../../shared/confirm-copy';

export const BID_DESCRIPTION_MAX = 2000;

@Component({
  selector: 'app-submit-bid-page',
  imports: [PageShell, RouterLink, SkeletonCard, ErrorState, ConfirmSaveDialog, ConfirmSheet],
  templateUrl: './submit-bid.html',
})
export class SubmitBidPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly withdrawDismissLabel = destructiveSheetDismissWithdrawBid;
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly priceText = signal('');
  protected readonly description = signal('');
  protected readonly existingBidId = signal<string | null>(null);
  protected readonly providerId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly categoryBlocked = signal<string | null>(null);
  protected readonly blockReasonCode = signal<string | null>(null);
  protected readonly truncated = signal(false);
  protected readonly maxLength = BID_DESCRIPTION_MAX;
  protected readonly hint = new SlowLoadHint();
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);
  protected readonly withdrawOpen = signal(false);
  protected readonly withdrawing = signal(false);

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly flowCache = inject(RequestFlowCacheService);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

  protected categoryBlockedTitle(): string {
    const code = this.blockReasonCode();
    const body = this.categoryBlocked() ?? '';
    if (code === 'REQUEST_CLOSED' || /ไม่เปิดรับ|ปิดรับ|เลือกผู้ให้แล้ว/iu.test(body)) {
      return 'งานนี้ปิดรับข้อเสนอแล้ว';
    }
    if (code === 'CATEGORY_MISMATCH' || body.includes('หมวด')) {
      return 'งานนี้ไม่ตรงกับบริการของคุณ';
    }
    if (code === 'OUT_OF_RANGE' || body.includes('นอกพื้นที่')) {
      return 'งานนี้อยู่นอกพื้นที่ให้บริการ';
    }
    return 'ไม่สามารถเสนอราคางานนี้ได้';
  }

  protected backLink(): string {
    const id = this.request()?.id;
    return id ? `/provider/requests/${id}` : '/provider/requests';
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected onDescriptionInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    let value = el.value;
    if (value.length > BID_DESCRIPTION_MAX) {
      value = value.slice(0, BID_DESCRIPTION_MAX);
      el.value = value;
      this.truncated.set(true);
    }
    this.description.set(value);
    this.touchForm();
  }

  protected onDescriptionPaste(event: ClipboardEvent): void {
    const el = event.target as HTMLTextAreaElement;
    const pasted = event.clipboardData?.getData('text') ?? '';
    const selected = Math.abs((el.selectionEnd ?? 0) - (el.selectionStart ?? 0));
    if (el.value.length - selected + pasted.length > BID_DESCRIPTION_MAX) {
      this.truncated.set(true);
    }
  }

  protected updatePrice(value: string): void {
    this.priceText.set(value);
    this.touchForm();
  }

  private formSnapshot(): { priceText: string; description: string } {
    return {
      priceText: this.priceText().trim(),
      description: this.description().trim(),
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = { ...state };
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  async ngOnInit(): Promise<void> {
    const queryRequestId = this.route.snapshot.queryParamMap.get('requestId');
    const requestId = queryRequestId || this.session.providerRequestId;
    if (requestId) {
      this.session.providerRequestId = requestId;
    }
    if (!requestId) {
      this.loading.set(false);
      this.error.set('เลือกงานจากรายการก่อน');
      return;
    }

    const navState = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as {
      requestDetail?: ServiceRequestDetail;
    };
    const seed =
      navState?.requestDetail?.id === requestId
        ? navState.requestDetail
        : this.flowCache.peekRequest(requestId);
    if (seed) {
      this.request.set(seed);
      this.applyExistingBidFromDetail(seed);
      this.loading.set(false);
      void this.loadBidForm(requestId, { background: true });
      return;
    }

    await this.loadBidForm(requestId);
  }

  private async loadBidForm(requestId: string, options?: { background?: boolean }): Promise<void> {
    if (!options?.background) {
      this.loading.set(true);
    }
    this.loadError.set(null);
    this.hint.begin();
    try {
      const [detail, myProvider, bidAccess] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.cache.getMyProvider()),
        firstValueFrom(this.api.getBidFormAccess(requestId)),
      ]);
      this.flowCache.putRequest(detail);
      if (!bidAccess.allowed) {
        const reason = bidAccess.reason?.trim();
        const cat = detail.categoryName?.trim() || 'อื่น';
        const blocked =
          bidAccess.reasonCode === 'CATEGORY_MISMATCH' || reason?.includes('ไม่ตรง')
            ? `งานนี้อยู่ในหมวด ${cat} ซึ่งไม่ตรงกับบริการที่คุณเปิดไว้`
            : reason || 'ไม่สามารถเสนอราคางานนี้ได้ — กลับไปเลือกงานจากกล่องงานหรือตรวจสอบบริการของคุณ';
        this.blockReasonCode.set(bidAccess.reasonCode ?? null);
        this.categoryBlocked.set(blocked);
        if (!options?.background) {
          this.loading.set(false);
        }
        this.hint.end();
        return;
      }
      this.providerId.set(myProvider.id);
      this.request.set(detail);
      this.applyExistingBidFromDetail(detail, myProvider.id);
      this.captureBaseline();
    } catch (e) {
      if (!options?.background || !this.request()) {
        const msg = apiErrorMessage(e, 'โหลดงานไม่สำเร็จ');
        this.loadError.set(
          msg === 'ไม่พบข้อมูล'
            ? 'โหลดฟอร์มเสนอราคาไม่สำเร็จ — กลับไปเลือกงานจากรายการหรือลองใหม่'
            : msg,
        );
      }
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  private applyExistingBidFromDetail(detail: ServiceRequestDetail, providerId?: string | null): void {
    const pid = providerId ?? this.providerId();
    if (!pid) {
      return;
    }
    const existing = detail.bids?.find(
      (bid) => bid.providerId === pid && bid.status === 'Submitted',
    );
    if (existing) {
      this.existingBidId.set(existing.id);
      this.priceText.set(existing.priceText);
      this.description.set((existing.description ?? '').slice(0, BID_DESCRIPTION_MAX));
    }
  }

  protected askSave(): void {
    if (!this.priceText().trim()) {
      this.error.set('กรุณาระบุราคาที่เสนอ');
      scrollToFirstError();
      return;
    }
    if (!isValidBidPrice(this.priceText())) {
      this.error.set('ราคาต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1000000 (ตัวเลขเท่านั้น)');
      scrollToFirstError();
      return;
    }
    if (!this.hasChanges() && !this.existingBidId()) {
      this.error.set('ไม่มีการเปลี่ยนแปลง');
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (!prev || prev.priceText !== cur.priceText) {
      lines.push(formatBidPriceConfirmLine(prev?.priceText ?? '', cur.priceText));
    }
    if (prev) {
      const descLine = formatBidDescriptionConfirmLine(prev.description, cur.description);
      if (descLine) {
        lines.push(descLine);
      }
    }
    this.saveConfirmMessage.set(this.formGuard.buildSaveMessage(lines));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    this.saveConfirmOpen.set(false);
    void this.submit();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
  }

  protected saveDialogTitle(): string {
    return this.existingBidId() ? GLOSSARY.confirmUpdateBidTitle : GLOSSARY.confirmSubmitBidTitle;
  }

  protected saveDialogConfirmLabel(): string {
    return this.existingBidId() ? GLOSSARY.confirmUpdateBidConfirm : GLOSSARY.confirmSubmitBidConfirm;
  }

  protected async submit(): Promise<void> {
    const requestId = this.session.providerRequestId;
    const providerId = this.providerId();
    if (!requestId || !providerId || this.submitting()) {
      return;
    }
    if (!this.priceText().trim()) {
      this.error.set('กรุณาระบุราคาที่เสนอ');
      scrollToFirstError();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const price = this.priceText().trim();
    const payload = {
      priceText: price,
      description: this.description().trim() || undefined,
    };
    const bidId = this.existingBidId();
    const isUpdate = !!bidId;
    try {
      if (bidId) {
        await firstValueFrom(this.api.updateBid(bidId, payload));
      } else {
        await firstValueFrom(this.api.submitBid(requestId, payload));
      }
      this.cache.invalidateMatching();
      const detail = await firstValueFrom(this.api.getRequest(requestId));
      this.flowCache.putRequest(detail);
      this.formGuard.markSaved(this.formSnapshot());
      const submittedNotice = bidSubmittedToast(price, isUpdate);
      await this.router.navigate(['/provider/requests', requestId], {
        state: { notice: submittedNotice, requestDetail: detail },
      });
    } catch (e) {
      // H-1: 5xx is never treated as success. Only a network timeout (status 0) triggers a
      // refetch, and success is claimed only when the server state matches what we sent.
      const recovered = await this.recoverAfterSubmitError(requestId, providerId, e, payload.priceText);
      if (recovered) {
        this.cache.invalidateMatching();
        this.formGuard.markSaved(this.formSnapshot());
        await this.router.navigate(['/provider/requests', requestId], {
          state: { notice: bidSubmittedToast(price, isUpdate), requestDetail: recovered },
        });
      } else {
        const status = e instanceof HttpErrorResponse ? e.status : -1;
        const msg =
          status === 0 || status >= 500
            ? isUpdate
              ? 'ระบบขัดข้องชั่วคราว ข้อเสนอยังไม่ถูกแก้ไข'
              : 'ระบบขัดข้องชั่วคราว ข้อเสนอยังไม่ถูกส่ง'
            : apiErrorMessage(e, 'ส่งข้อเสนอไม่สำเร็จ');
        this.error.set(msg);
        this.toast.show(msg);
        scrollToFirstError();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected withdrawConfirmMessage(): string {
    const r = this.request();
    const price = this.priceText().trim() || '—';
    const title = r?.title?.trim() || 'งาน';
    return withdrawBidConfirmMessage(title, price);
  }

  protected async withdrawBid(): Promise<void> {
    const bidId = this.existingBidId();
    if (!bidId || this.withdrawing()) {
      return;
    }
    this.withdrawing.set(true);
    const requestId = this.session.providerRequestId;
    const title = this.request()?.title?.trim() || 'งาน';
    const price = this.priceText().trim() || '—';
    try {
      await firstValueFrom(this.api.withdrawBid(bidId));
      this.withdrawOpen.set(false);
      this.cache.invalidateMatching();
      this.formGuard.markSaved(this.formSnapshot());
      this.toast.show(withdrawBidToast(title, price));
      if (requestId) {
        await this.router.navigate(['/provider/requests', requestId]);
      } else {
        await this.router.navigateByUrl('/provider/requests');
      }
    } catch (e) {
      const msg = apiErrorMessage(e, 'ถอนข้อเสนอไม่สำเร็จ');
      this.error.set(msg);
      this.toast.show(msg);
      scrollToFirstError();
    } finally {
      this.withdrawing.set(false);
    }
  }

  private async recoverAfterSubmitError(
    requestId: string,
    providerId: string,
    error: unknown,
    sentPrice: string,
  ): Promise<ServiceRequestDetail | null> {
    if (!(error instanceof HttpErrorResponse) || error.status !== 0) {
      return null;
    }
    try {
      const detail = await firstValueFrom(this.api.getRequest(requestId));
      const myBid = detail.bids?.find((bid) => bid.providerId === providerId);
      if (!myBid || !this.isActiveBidStatus(myBid.status) || myBid.priceText.trim() !== sentPrice) {
        return null;
      }
      this.request.set(detail);
      this.flowCache.putRequest(detail);
      this.existingBidId.set(myBid.id);
      return detail;
    } catch {
      return null;
    }
  }

  private isActiveBidStatus(status: string): boolean {
    return status === 'Submitted' || status === 'Pending' || status === 'Selected';
  }
}

export function isValidBidPrice(value: string): boolean {
  const v = value.trim();
  if (!/^\d+$/.test(v)) {
    return false;
  }
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 1_000_000;
}
