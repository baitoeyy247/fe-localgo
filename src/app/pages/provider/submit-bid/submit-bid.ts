import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { FieldError } from '../../../shared/field-error';
import { BID_MESSAGE_MAX, bidPriceError } from '../../../shared/form-rules';

@Component({
  selector: 'app-submit-bid-page',
  imports: [PageShell, RouterLink, LoadingSkeleton, FieldError],
  templateUrl: './submit-bid.html',
})
export class SubmitBidPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly priceText = signal('');
  protected readonly description = signal('');
  protected readonly existingBidId = signal<string | null>(null);
  protected readonly providerId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly denied = signal<string | null>(null);
  protected readonly deniedCode = signal<string | null>(null);
  protected readonly priceError = signal<string | null>(null);
  protected readonly descriptionError = signal<string | null>(null);
  protected readonly messageMax = BID_MESSAGE_MAX;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private activeRequestId: string | null = null;

  protected backLink(): string {
    const id = this.request()?.id;
    return id ? `/provider/requests/${id}` : '/provider/requests';
  }

  async ngOnInit(): Promise<void> {
    const fromQuery = this.route.snapshot.queryParamMap.get('requestId')?.trim() ?? '';
    const requestId = fromQuery || this.session.providerRequestId;
    if (!requestId) {
      this.loading.set(false);
      this.denied.set('เลือกงานจากรายการก่อน');
      return;
    }
    this.activeRequestId = requestId;
    try {
      const [formResult, providerResult] = await Promise.allSettled([
        firstValueFrom(this.api.getBidForm(requestId)),
        firstValueFrom(this.api.getMyProvider()),
      ]);
      if (formResult.status === 'rejected') {
        const reason = formResult.reason;
        this.denied.set(
          reason instanceof HttpErrorResponse && reason.status === 404
            ? 'ไม่พบงานนี้'
            : apiErrorMessage(reason, 'โหลดงานไม่สำเร็จ'),
        );
        return;
      }
      const form = formResult.value;
      if (!form.allowed || !form.request) {
        this.denied.set(form.reason || 'ไม่สามารถเสนอราคางานนี้ได้');
        this.deniedCode.set(form.reasonCode ?? null);
        return;
      }
      this.session.providerRequestId = requestId;
      const detail = form.request;
      this.request.set(detail);
      const providerId =
        providerResult.status === 'fulfilled' ? providerResult.value.id : null;
      this.providerId.set(providerId);
      const existing = detail.bids?.find(
        (bid) =>
          (!providerId || bid.providerId === providerId) &&
          (bid.status === 'Submitted' || bid.status === 'Pending'),
      );
      if (existing) {
        this.existingBidId.set(existing.id);
        this.priceText.set(existing.priceText);
        this.description.set(existing.description ?? '');
        if (!providerId) {
          this.providerId.set(existing.providerId);
        }
      }
    } catch (e) {
      this.denied.set(apiErrorMessage(e, 'โหลดงานไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected fixLink(): string {
    switch (this.deniedCode()) {
      case 'CATEGORY_MISMATCH':
        return '/provider/service';
      case 'SERVICE_PAUSED':
        return '/provider/manage';
      case 'AREA_DISABLED':
      case 'OUT_OF_RANGE':
        return '/provider/coverage';
      default:
        return '/provider/requests';
    }
  }

  protected fixLabel(): string {
    switch (this.deniedCode()) {
      case 'CATEGORY_MISMATCH':
        return 'เพิ่มบริการที่ตรงหมวด';
      case 'SERVICE_PAUSED':
        return 'เปิดบริการอีกครั้ง';
      case 'AREA_DISABLED':
        return 'เปิดพื้นที่ให้บริการ';
      case 'OUT_OF_RANGE':
        return 'แก้ไขพื้นที่';
      default:
        return 'ไปรายการงาน';
    }
  }

  protected updatePrice(value: string): void {
    this.priceText.set(value);
    this.priceError.set(bidPriceError(value));
  }

  protected updateDescription(value: string): void {
    const next = value.slice(0, BID_MESSAGE_MAX);
    this.description.set(next);
    this.descriptionError.set(
      value.length > BID_MESSAGE_MAX ? `รายละเอียดข้อเสนอต้องไม่เกิน ${BID_MESSAGE_MAX} ตัวอักษร` : null,
    );
  }

  protected async submit(): Promise<void> {
    const requestId = this.activeRequestId;
    const providerId = this.providerId();
    const priceError = bidPriceError(this.priceText());
    const descriptionError =
      this.description().trim().length > BID_MESSAGE_MAX
        ? `รายละเอียดข้อเสนอต้องไม่เกิน ${BID_MESSAGE_MAX} ตัวอักษร`
        : null;
    this.priceError.set(priceError);
    this.descriptionError.set(descriptionError);
    if (!requestId || !providerId || priceError || descriptionError || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = {
        priceText: this.priceText().trim(),
        amount: Number(this.priceText().trim().replace(/บาท/g, '').replace(/\s/g, '')),
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
    return status === 0;
  }

  private isActiveBidStatus(status: string): boolean {
    return status === 'Submitted' || status === 'Pending' || status === 'Selected';
  }
}
