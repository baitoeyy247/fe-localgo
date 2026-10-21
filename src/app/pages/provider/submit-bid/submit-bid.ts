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

export const BID_DESCRIPTION_MAX = 2000;

@Component({
  selector: 'app-submit-bid-page',
  imports: [PageShell, RouterLink, SkeletonCard, ErrorState],
  templateUrl: './submit-bid.html',
})
export class SubmitBidPage implements OnInit, OnDestroy {
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
  protected readonly truncated = signal(false);
  protected readonly maxLength = BID_DESCRIPTION_MAX;
  protected readonly hint = new SlowLoadHint();

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
  }

  protected onDescriptionPaste(event: ClipboardEvent): void {
    const el = event.target as HTMLTextAreaElement;
    const pasted = event.clipboardData?.getData('text') ?? '';
    const selected = Math.abs((el.selectionEnd ?? 0) - (el.selectionStart ?? 0));
    if (el.value.length - selected + pasted.length > BID_DESCRIPTION_MAX) {
      this.truncated.set(true);
    }
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
    this.loading.set(true);
    this.loadError.set(null);
    this.hint.begin();
    try {
      const [detail, myProvider, bidAccess] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.getMyProvider()),
        firstValueFrom(this.api.getBidFormAccess(requestId)),
      ]);
      if (!bidAccess.allowed) {
        this.categoryBlocked.set(bidAccess.reason?.trim() || 'งานนี้ไม่ตรงกับบริการของคุณ');
        this.loading.set(false);
        this.hint.end();
        return;
      }
      this.providerId.set(myProvider.id);
      this.request.set(detail);
      const existing = detail.bids?.find(
        (bid) => bid.providerId === myProvider.id && bid.status === 'Submitted',
      );
      if (existing) {
        this.existingBidId.set(existing.id);
        this.priceText.set(existing.priceText);
        this.description.set((existing.description ?? '').slice(0, BID_DESCRIPTION_MAX));
      }
    } catch (e) {
      this.loadError.set(apiErrorMessage(e, 'โหลดงานไม่สำเร็จ'));
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
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
    try {
      const payload = {
        priceText: this.priceText().trim(),
        description: this.description().trim() || undefined,
      };
      const bidId = this.existingBidId();
      if (bidId) {
        await firstValueFrom(this.api.updateBid(bidId, payload));
      } else {
        await firstValueFrom(this.api.submitBid(requestId, payload));
      }
      await this.router.navigate(['/provider/requests', requestId]);
    } catch (e) {
      const recovered = await this.recoverAfterSubmitError(requestId, providerId, e);
      if (recovered) {
        await this.router.navigate(['/provider/requests', requestId], {
          state: { notice: 'ระบบบันทึกข้อเสนอแล้ว แม้ตอบกลับผิดพลาด กรุณาตรวจสอบสถานะล่าสุด' },
        });
      } else {
        this.error.set(apiErrorMessage(e, 'ส่งข้อเสนอไม่สำเร็จ'));
        scrollToFirstError();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private async recoverAfterSubmitError(
    requestId: string,
    providerId: string,
    error: unknown,
  ): Promise<boolean> {
    if (!(error instanceof HttpErrorResponse) || !this.isRecoverableSubmitError(error.status)) {
      return false;
    }
    try {
      const detail = await firstValueFrom(this.api.getRequest(requestId));
      this.request.set(detail);
      const myBid = detail.bids?.find((bid) => bid.providerId === providerId);
      if (!myBid || !this.isActiveBidStatus(myBid.status)) {
        return false;
      }
      this.existingBidId.set(myBid.id);
      this.priceText.set(myBid.priceText);
      this.description.set(myBid.description ?? '');
      return true;
    } catch {
      return false;
    }
  }

  private isRecoverableSubmitError(status: number): boolean {
    return status === 0 || status === 409 || status >= 500;
  }

  private isActiveBidStatus(status: string): boolean {
    return status === 'Submitted' || status === 'Pending' || status === 'Selected';
  }
}
